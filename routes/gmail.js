import express from 'express';



const router = express.Router();
import { listUnreadEmails, getGmailClient, extractBody } from '../services/gmail';
import { authenticateUser } from '../middlewares/authMiddleware.js';

router.get('/unread', authenticateUser, async (req, res) => {
    const tokens = req.user.google;
    //console.log(req.user,"hii");


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

router.get('/summary', authenticateUser, async (req, res) => {
    const tokens = req.user.google;

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

router.get('/email/:id', authenticateUser, async (req, res) => {
    const tokens = req.user.google;
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

        const content = extractBody(email.data.payload);
        res.json({ htmlOrText: content, full: email.data });




    } catch (error) {
        console.error('Error reading email:', error);
        res.status(500).json({ error: 'Failed to read email' });
    }
});

router.post('/email/:id/reply', authenticateUser, async (req, res) => {
    const tokens = req.user.google;
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

router.post('/draft', authenticateUser, async (req, res) => {
    const tokens = req.user.google;
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

router.post('/send', authenticateUser, async (req, res) => {
    const tokens = req.user.google;
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

router.get('/drafts', authenticateUser, async (req, res) => {
    const tokens = req.user.google;

    if (!tokens) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const gmail = getGmailClient(tokens);

        // List all drafts
        const draftsRes = await gmail.users.drafts.list({ userId: 'me' });
        const drafts = draftsRes.data.drafts || [];

        // Optionally fetch the full message for each draft
        const detailedDrafts = await Promise.all(
            drafts.map(async (draft) => {
                const draftDetails = await gmail.users.drafts.get({
                    userId: 'me',
                    id: draft.id,
                    format: 'full',
                });
                return draftDetails.data;
            })
        );

        res.json({ drafts: detailedDrafts });
    } catch (error) {
        console.error('Error fetching drafts:', error);
        res.status(500).json({ error: 'Failed to fetch drafts' });
    }
});

// Mark a single message as read
router.post('/mark-read/:id', authenticateUser, async (req, res) => {
    const tokens = req.user.google;
    const { id } = req.params;

    if (!tokens) {
        return res.status(401).json({ error: 'User not authenticated' });
    }
    if (!id) {
        return res.status(400).json({ error: 'Message id is required' });
    }

    try {
        const gmail = getGmailClient(tokens);
        await gmail.users.messages.modify({
            userId: 'me',
            id,
            requestBody: {
                removeLabelIds: ['UNREAD'],
            },
        });

        res.json({ message: 'Message marked as read', id });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to mark message as read' });
    }
});

// Mark multiple messages as read
router.post('/mark-read', authenticateUser, async (req, res) => {
    const tokens = req.user.google;
    const { ids } = req.body;

    if (!tokens) {
        return res.status(401).json({ error: 'User not authenticated' });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Provide an array of message IDs in `ids`' });
    }

    try {
        const gmail = getGmailClient(tokens);

        // Preferred: batchModify to remove UNREAD label in one call
        await gmail.users.messages.batchModify({
            userId: 'me',
            requestBody: {
                ids,
                removeLabelIds: ['UNREAD'],
            },
        });

        res.json({ message: 'Messages marked as read', ids });
    } catch (error) {
        console.warn('batchModify failed, falling back to individual modifies:', error);

        // Fallback: mark each individually if batchModify doesn't take effect
        try {
            const gmail = getGmailClient(tokens);
            await Promise.all(
                ids.map((msgId) =>
                    gmail.users.messages.modify({
                        userId: 'me',
                        id: msgId,
                        requestBody: { removeLabelIds: ['UNREAD'] },
                    })
                )
            );
            res.json({ message: 'Messages marked as read (fallback)', ids });
        } catch (innerErr) {
            console.error('Error in fallback marking messages as read:', innerErr);
            res.status(500).json({ error: 'Failed to mark messages as read' });
        }
    }
});




module.exports = router;