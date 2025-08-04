import express from "express";
import path from "path"
import cookieParser from "cookie-parser"
import cors from "cors";
// Routes
import authRoutes from './routes/auth.js';
import gmailRoutes from './routes/gmail.js';
import errorMiddleware from "./middlewares/errorsMiddleware.js"
import moment from 'moment';

moment.updateLocale('en', {
  calendar: {
    sameDay: '[Today] LT',
    lastDay: '[Yesterday] LT',
    lastWeek: '[Last] dddd LT',
    sameElse: 'MM/DD/YYYY LT'
  }
});

const app = express();

// ✅ Set allowed origin (adjust to your frontend origin)
const allowedOrigin = process.env.NODE_ENV === "DEVELOPMENT" ? "http://localhost:3000" : "https://haimail.vercel.app";
let API_URL = process.env.NODE_ENV === 'PRODUCTION' ? 'https://hai-api.onrender.com' : 'http://localhost:8000';

app.use(cors({
  origin: allowedOrigin,
  credentials: true // allow sending cookies
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser())

// Vapi tool proxy
app.post('/vapi/tool/gmail', async (req, res) => {
  try {
    const token = req.body?.message?.assistant?.variableValues?.token;
    if (!token) return res.status(401).json({ error: "Token missing in variableValues" });

    const toolCallList = req.body?.message?.toolCallList || [];
    if (!toolCallList.length) {
      return res.status(400).json({ error: "No tool calls provided" });
    }

    const results = [];

    for (const toolCall of toolCallList) {
      const { id: toolCallId, function: fn } = toolCall;
      if (!fn || !fn.name) continue;

      if (fn.name === "listUnreadEmails") {
        const endpoint = `${API_URL}/gmail/unread`;
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `token=${token}`,
          },
        });

        const data = await response.json();
        const formatted = (data.messages || []).map(email =>
          `From: ${email.from}, Subject: ${email.subject}, Date: ${moment(email.date).calendar()}, ID: ${email.id}, Thread ID: ${email.threadId}`
        ).join(' | ') || 'No unread emails found.';

        results.push({
          toolCallId,
          result: formatted,
        });

      } else if (fn.name === "markOneEmailAsRead") {
        const args = fn.arguments || {};
        const messageId = args.id || args.messageId;
        if (!messageId) {
          results.push({
            toolCallId,
            result: 'Error: no message id provided to mark as read.',
          });
          continue;
        }

        const endpoint = `${API_URL}/gmail/mark-read/${messageId}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `token=${token}`,
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const errBody = await response.text();
          results.push({
            toolCallId,
            result: `Failed to mark email as read: ${errBody}`,
          });
        } else {
          results.push({
            toolCallId,
            result: `Marked as read: ${messageId}`,
          });
        }

      } else if (fn.name === "markManyEmailsAsRead") {
        console.log("Marking multiple emails as read",fn.name);
        
        const args = fn.arguments || {};
        const ids = args.ids || args.messageIds || args.message_ids;
        if (!Array.isArray(ids) || ids.length === 0) {
          results.push({
            toolCallId,
            result: 'Error: provide an array of message IDs in `ids` to mark as read.',
          });
          continue;
        }

        const endpoint = `${API_URL}/gmail/mark-read`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `token=${token}`,
          },
          body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          results.push({
            toolCallId,
            result: `Failed to mark multiple emails as read: ${errBody}`,
          });
        } else {
          console.log("Marked multiple emails as read",ids);
          results.push({
            toolCallId,
            result: `Marked multiple as read: ${ids.join(', ')}`,
          });
        }

      } else {
        results.push({
          toolCallId,
          result: `Unhandled tool call: ${fn.name}`,
        });
      }
    }

    return res.json({ results });

  } catch (err) {
    console.error("Vapi proxy error:", err);
    res.status(500).json({ error: "Vapi proxy failed" });
  }
});

app.use('/auth', authRoutes);
app.use('/gmail', gmailRoutes);
// Middleware to handle errors
app.use(errorMiddleware);

export default app;
