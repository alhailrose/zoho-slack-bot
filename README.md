# Zoho Slack Bot - Deployment Guide

## Arsitektur

```
Zoho Desk
  |
  v
Webhook (HTTP POST)
  |
  v
EC2 Public (Nginx 80)
  |
  v
NodeJS App (port 3000)
  |
  v
Slack API
  |
  v
Auto-create channel + notifikasi
```

## Prerequisites

- EC2 instance dengan Ubuntu
- Security Group membuka port 80 (HTTP) dan 443 (HTTPS jika pakai SSL)
- Slack Bot Token

## SSH Key Setup

SSH key sudah dibuatkan di folder project:

- **Private key**: `ec2-key` (jangan dishare!)
- **Public key**: `ec2-key.pub`

**Public key:**

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIM34a2295alkVKQAspKXTP7dGGzjMvZUx6886nqp6dgY zoho-slack-bot-ec2
```

### Cara pasang ke EC2:

**Opsi 1 - Via AWS Console (Launch Instance):**
1. AWS Console → EC2 → Instances → Launch Instance
2. Di bagian "Key pair", pilih "Create new key pair" atau upload public key
3. Paste isi `ec2-key.pub`

**Opsi 2 - Tambah ke instance yang sudah jalan:**
```bash
# Dari local, copy public key ke EC2
ssh-copy-id -i ec2-key.pub ubuntu@your-ec2-ip

# Atau manual
cat ec2-key.pub | ssh -i existing-key.pem ubuntu@your-ec2-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

**Opsi 3 - AWS Systems Manager (SSM):**
Jika sudah ada akses SSM, edit `~/.ssh/authorized_keys` di instance dan append public key.

### SSH ke EC2

```bash
# Pastikan permission private key benar (600)
chmod 600 ec2-key

# Connect
ssh -i ec2-key ubuntu@your-ec2-ip
```

## Step-by-Step Deployment

### 1. SSH ke EC2

```bash
ssh -i ec2-key ubuntu@your-ec2-ip
```

### 2. Install Node.js LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Clone/Copy Project

```bash
cd ~
# Copy project files ke EC2 (dari local)
scp -i ec2-key -r zoho-slack-bot ubuntu@your-ec2-ip:/home/ubuntu/
```

Atau buat folder dan copy file manual:

```bash
mkdir zoho-slack-bot
cd zoho-slack-bot
# copy semua file (app.js, package.json, .env)
```

### 4. Install Dependencies

```bash
cd ~/zoho-slack-bot
npm install
```

### 5. Konfigurasi Environment

```bash
cp .env.example .env
nano .env
```

Isi:

```env
SLACK_BOT_TOKEN=xoxb-your-actual-token
```

Save (Ctrl+O, Enter, Ctrl+X)

### 6. Install & Konfigurasi Nginx

```bash
sudo apt update
sudo apt install nginx
sudo cp nginx-zoho-slack.conf /etc/nginx/sites-available/zoho-slack
sudo ln -s /etc/nginx/sites-available/zoho-slack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Setup Systemd Service

```bash
sudo cp zoho-slack.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable zoho-slack
sudo systemctl start zoho-slack
```

### 8. Cek Status

```bash
# Cek app status
sudo systemctl status zoho-slack

# Cek logs
sudo journalctl -u zoho-slack -f

# Cek nginx
sudo systemctl status nginx

# Test health check
curl http://localhost/health
```

### 9. Konfigurasi Zoho Webhook

1. Buka Zoho Desk
2. Setup → Developer Space → Webhooks
3. Buat webhook baru:
   - **Name**: `webhook_slack`
   - **URL to Notify**: `http://your-ec2-public-ip/zoho/webhook`
   - **Source ID**: Generate UUID di https://www.uuidgenerator.net
   - **Event**: Tickets → Add (dan optionally Edit)

### 10. Create Workflow Rule

1. Setup → Automation → Workflows → Create Rule
2. **Module**: Tickets
3. **Execute On**: Create
4. **Criteria**: No Criteria
5. **Action**: Pilih webhook `webhook_slack`
6. **Request Body JSON**:

```json
{
  "ticketId": "${Tickets.Ticket Id}",
  "customerEmail": "${Tickets.Contact Email}",
  "subject": "${Tickets.Subject}",
  "status": "${Tickets.Status}"
}
```

7. Save

### 11. Testing

Buat ticket di Zoho dengan email: `dmarc_reports@reports.emailsrvr.com`

Harusnya Slack auto-create channel: `#emailsrvr-com`
dan kirim notifikasi ke: `#support-ics`

## Troubleshooting

**App tidak jalan:**
```bash
sudo journalctl -u zoho-slack -n 50 --no-pager
```

**Nginx error:**
```bash
sudo tail -f /var/log/nginx/error.log
```

**Test manual webhook:**
```bash
curl -X POST http://your-ec2-ip/zoho/webhook \
  -H "Content-Type: application/json" \
  -d '{"ticketId":"123","customerEmail":"test@example.com","subject":"Test","status":"Open"}'
```

**Slack token tidak valid:**
- Pastikan bot memiliki scope: `chat:write`, `channels:manage`, `groups:write`, `im:write`, `mpim:write`
- Pastikan bot sudah di-invite ke workspace

## File Project

```
zoho-slack-bot/
  app.js                  # Main application
  package.json            # Dependencies
  .env                    # Environment variables (jangan di-commit!)
  .env.example            # Contoh konfigurasi
  zoho-slack.service      # Systemd service config
  nginx-zoho-slack.conf  # Nginx reverse proxy config
  README.md               # Dokumentasi ini
```

## Catatan Penting

- **Jangan commit file `.env`** ke git - isi token Slack!
- Pastikan EC2 Security Group membuka port 80
- Jika ingin HTTPS, setup Let's Encrypt dengan Certbot
- Channel Slack yang dibuat harus unik - jika sudah ada, Slack akan error
