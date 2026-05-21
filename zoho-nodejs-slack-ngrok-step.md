# Zoho → NodeJS → Slack Integration using Ngrok

## Architecture

```text
Zoho Desk
↓
Webhook
↓
Ngrok HTTPS URL
↓
NodeJS Backend API
↓
Slack API
↓
Slack Channel Auto Create
```

---

# 1. Install NodeJS

Download:

https://nodejs.org/en/download

Install version:

```bash
LTS
```

---

# 2. Create Project Folder

```bash
mkdir zoho-slack-bot
cd zoho-slack-bot
```

---

# 3. Initialize NodeJS Project

```bash
npm init -y
```

---

# 4. Install Dependencies

```bash
npm install express @slack/web-api dotenv
```

---

# 5. Create app.js

```bash
touch app.js
```

---

# 6. Paste Backend Code

```javascript
require("dotenv").config();

const express = require("express");
const { WebClient } = require("@slack/web-api");

const app = express();

app.use(express.json());

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

function generateChannelName(email) {

    const domain = email.split("@")[1];

    const parts = domain.split(".");

    return (
        parts[parts.length - 2] +
        "-" +
        parts[parts.length - 1]
    ).toLowerCase();
}

app.post("/zoho/webhook", async (req, res) => {

    try {

        console.log(req.body);

        const data = req.body;

        const email = data.customerEmail;

        const channelName =
            generateChannelName(email);

        // CREATE CHANNEL
        const createChannel =
            await slack.conversations.create({
                name: channelName
            });

        // POST TO NEW CHANNEL
        await slack.chat.postMessage({
            channel: createChannel.channel.id,
            text:
                `New Ticket

Ticket ID: ${data.ticketId}

Customer:
${email}`
        });

        // POST TO SUPPORT CHANNEL
        await slack.chat.postMessage({
            channel: "support-ics",
            text:
                `Ticket #${data.ticketId}

Customer:
${email}

Channel Created:
#${channelName}`
        });

        res.status(200).send("success");

    } catch (err) {

        console.log(err);

        res.status(500).send(err.message);
    }
});

app.listen(3000, () => {

    console.log("Server running on port 3000");

});
```

---

# 7. Create .env File

```bash
touch .env
```

Isi:

```env
SLACK_BOT_TOKEN=xoxb-your-slack-token
```

---

# 8. Install Ngrok

Download:

https://ngrok.com/download

---

# 9. Login Ngrok

```bash
ngrok config add-authtoken YOUR_TOKEN
```

---

# 10. Run Backend

```bash
node app.js
```

Output:

```bash
Server running on port 3000
```

---

# 11. Run Ngrok

Open new terminal:

```bash
ngrok http 3000
```

Example output:

```text
https://abcd-1234.ngrok-free.app
```

---

# 12. Configure Zoho Webhook

Go to:

```text
Zoho Desk
→ Setup
→ Developer Space
→ Webhooks
```

---

# 13. Create Webhook

## Name

```text
webhook_slack
```

## URL to Notify

```text
https://abcd-1234.ngrok-free.app/zoho/webhook
```

## Source ID

Generate UUID:

https://www.uuidgenerator.net

Example:

```text
550e8400-e29b-41d4-a716-446655440000
```

## Choose Event

| Module | Event |
|---|---|
| Tickets | Add |
| Tickets | Edit |

---

# 14. Create Workflow Rule

Go to:

```text
Setup
→ Automation
→ Workflows
→ Create Rule
```

---

# 15. Configure Workflow

## Module

```text
Tickets
```

## Execute On

```text
Create
```

Optional:

```text
Edit
```

## Criteria

```text
No Criteria
```

---

# 16. Add Webhook Action

Select:

```text
webhook_slack
```

---

# 17. Request Body JSON

```json
{
  "ticketId": "${Tickets.Ticket Id}",
  "customerEmail": "${Tickets.Contact Email}",
  "subject": "${Tickets.Subject}",
  "status": "${Tickets.Status}"
}
```

---

# 18. Save Workflow

Click:

```text
Save
```

---

# 19. Testing

Create ticket:

```text
dmarc_reports@reports.emailsrvr.com
```

---

# 20. Result

Slack automatically creates:

```text
#emailsrvr-com
```

and sends notification to:

```text
#support-ics
```
