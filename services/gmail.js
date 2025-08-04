import { google } from 'googleapis';
import quotedPrintable from 'quoted-printable';

function decodeBase64Url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = 4 - (str.length % 4);
  if (pad !== 4) str += '='.repeat(pad);
  return Buffer.from(str, 'base64').toString('utf-8');
}

function tryDecodeContent(data, mimeType, transferEncoding) {
  if (!data) return '';

  const tryBase64 = () => {
    try {
      const d = decodeBase64Url(data);
      if (/<(html|!DOCTYPE)/i.test(d) || mimeType === 'text/plain') return d;
    } catch {}
    return null;
  };

  const tryQuotedPrintable = () => {
    try {
      const d = quotedPrintable.decode(data);
      if (/<(html|!DOCTYPE)/i.test(d) || mimeType === 'text/plain') return d;
    } catch {}
    return null;
  };

  let decoded = '';
  if (transferEncoding && transferEncoding.toLowerCase().includes('base64')) {
    decoded = tryBase64() ?? (mimeType === 'text/html' ? tryQuotedPrintable() ?? '' : '');
  } else if (transferEncoding && transferEncoding.toLowerCase().includes('quoted-printable')) {
    decoded = tryQuotedPrintable() ?? tryBase64() ?? '';
  } else {
    decoded = tryBase64() ?? tryQuotedPrintable() ?? '';
  }

  return decoded;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBody(payload) {
  const parts = payload.parts || [];
  // prefer plain text for raw text, but for html retrieval prefer html
  const plain = parts.find(p => p.mimeType === 'text/plain');
  const html = parts.find(p => p.mimeType === 'text/html');

  // Helper to decode a part
  const decodePart = (part) => {
    if (!part || !part.body?.data) return '';
    const teHeader = (part.headers || []).find(h => h.name.toLowerCase() === 'content-transfer-encoding');
    const transferEncoding = teHeader?.value || '';
    return tryDecodeContent(part.body.data, part.mimeType, transferEncoding);
  };

  const plainText = decodePart(plain);
  const htmlText = decodePart(html);

  return {
    plain: plainText || (htmlText ? stripHtml(htmlText) : ''),
    html: htmlText || '',
    fallbackFromHtml: htmlText ? stripHtml(htmlText) : '',
  };
}

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
    maxResults: 10,
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

export {
  listUnreadEmails,
  getGmailClient,
  extractBody,
};
