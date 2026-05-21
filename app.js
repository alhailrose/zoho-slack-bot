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
        console.log("Received webhook:", JSON.stringify(req.body, null, 2));

        const data = req.body;
        const email = data.customerEmail;
        const channelName = generateChannelName(email);

        // CREATE CHANNEL
        const createChannel = await slack.conversations.create({
            name: channelName
        });

        console.log(`Created channel #${channelName} with ID: ${createChannel.channel.id}`);

        // POST TO NEW CHANNEL
        await slack.chat.postMessage({
            channel: createChannel.channel.id,
            text:
                `New Ticket\n\nTicket ID: ${data.ticketId}\n\nCustomer:\n${email}`
        });

        // POST TO SUPPORT CHANNEL
        await slack.chat.postMessage({
            channel: "support-ics",
            text:
                `Ticket #${data.ticketId}\n\nCustomer:\n${email}\n\nChannel Created:\n#${channelName}`
        });

        res.status(200).send("success");

    } catch (err) {
        console.error("Error processing webhook:", err);
        res.status(500).send(err.message);
    }
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
