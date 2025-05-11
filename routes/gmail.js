const express = require('express');
const router = express.Router();
const { listUnreadEmails } = require('../services/gmail');

router.get('/unread', async (req, res) => {
    const tokens = req.session.tokens;

    if (!tokens) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const messages = await listUnreadEmails(tokens);
        res.json({ messages });
    } catch (error) {
        console.error('Error fetching unread messages:', error);
        res.status(500).json({ error: 'Failed to fetch unread messages' });
    }
});

router.get('/summary', async (req, res) => {
    const tokens = req.session.tokens;

    if (!tokens) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const gmail = getGmailClient(tokens);

        // Get unread primary emails
        const unreadRes = await gmail.users.messages.list({
            userId: 'me',
            q: 'in:inbox category:primary is:unread',
        });
        const unreadCount = unreadRes.data.resultSizeEstimate || 0;

        // Get drafts
        const draftsRes = await gmail.users.drafts.list({ userId: 'me' });
        const draftCount = draftsRes.data.drafts ? draftsRes.data.drafts.length : 0;

        res.json({
            unreadPrimary: unreadCount,
            drafts: draftCount,
        });
    } catch (error) {
        console.error('Error fetching email summary:', error);
        res.status(500).json({ error: 'Failed to fetch email summary' });
    }
});

router.get('/email/:id', async (req, res) => {
    const tokens = req.session.tokens;
    const { id } = req.params;

    if (!tokens) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const gmail = getGmailClient(tokens);
        const email = await gmail.users.messages.get({
            userId: 'me',
            id,
            format: 'full',
        });

        res.json(email.data);
    } catch (error) {
        console.error('Error reading email:', error);
        res.status(500).json({ error: 'Failed to read email' });
    }
});

router.post('/email/:id/reply', async (req, res) => {
    const tokens = req.session.tokens;
    const { id } = req.params;
    const { message } = req.body;

    if (!tokens) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const gmail = getGmailClient(tokens);

        // Get the original message to retrieve headers
        const original = await gmail.users.messages.get({
            userId: 'me',
            id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Message-ID'],
        });

        const headers = original.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const messageId = headers.find(h => h.name === 'Message-ID')?.value || '';
        const threadId = original.data.threadId;

        const rawMessage = [
            `To: ${from}`,
            `Subject: Re: ${subject}`,
            `In-Reply-To: ${messageId}`,
            `References: ${messageId}`,
            '',
            message,
        ].join('\n');

        const encodedMessage = Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
                threadId,
            },
        });

        res.json({ message: 'Reply sent successfully' });
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ error: 'Failed to send reply' });
    }
});

router.post('/draft', async (req, res) => {
    const tokens = req.session.tokens;
    const { to, subject, message } = req.body;

    if (!tokens) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const gmail = getGmailClient(tokens);

        const rawMessage = [
            `To: ${to}`,
            `Subject: ${subject}`,
            '',
            message,
        ].join('\n');

        const encodedMessage = Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const draft = await gmail.users.drafts.create({
            userId: 'me',
            requestBody: {
                message: {
                    raw: encodedMessage,
                },
            },
        });

        res.json({ draftId: draft.data.id });
    } catch (error) {
        console.error('Error creating draft:', error);
        res.status(500).json({ error: 'Failed to create draft' });
    }
});

router.post('/send', async (req, res) => {
    const tokens = req.session.tokens;
    const { to, subject, message } = req.body;

    if (!tokens) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const gmail = getGmailClient(tokens);

        const rawMessage = [
            `To: ${to}`,
            `Subject: ${subject}`,
            '',
            message,
        ].join('\n');

        const encodedMessage = Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });

        res.json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});



module.exports = router;
