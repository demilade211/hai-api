import { google }from 'googleapis';

function getGmailClient(tokens) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(tokens);
    return google.gmail({ version: 'v1', auth: oauth2Client });
}

async function listUnreadEmails(tokens) {
    const gmail = getGmailClient(tokens);
    const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'in:inbox category:primary is:unread',
        maxResults: 10, // Adjust as needed
    });

    const messages = res.data.messages || [];
    const detailedMessages = [];

    for (const message of messages) {
        const msg = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date'],
        });

        const headers = msg.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        const snippet = msg.data.snippet || '';

        detailedMessages.push({
            id: message.id,
            threadId: message.threadId,
            subject,
            from,
            date, 
            preview: snippet,
        });
    }

    return detailedMessages;
}

module.exports = {
    listUnreadEmails,
};
