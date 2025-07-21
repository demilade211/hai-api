import express from "express";
import path from "path"
import cookieParser from "cookie-parser"
import cors from "cors";
// Routes
import authRoutes from './routes/auth.js';
import gmailRoutes from './routes/gmail.js';
import errorMiddleware from "./middlewares/errorsMiddleware.js"

const app = express();

// Session configuration
// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: true,
// }));

// ✅ Set allowed origin (adjust to your frontend origin)
const allowedOrigin = process.env.NODE_ENV === "DEVELOPMENT" ? "http://localhost:3000" : "https://haimail.vercel.app"; // or your frontend URL
let API_URL = process.env.NODE_ENV === 'PRODUCTION' ? 'https://hai-api.onrender.com' : 'http://localhost:8000';
app.use(cors({
  origin: allowedOrigin,
  credentials: true // ✅ allow sending cookies
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));//to handle url encoded data
app.use(cookieParser())

// Vapi tool proxy
app.post('/vapi/tool/gmail', async (req, res) => {
  try {
    // Extract token from assistant.variableValues
    const token = req.body?.message?.assistant?.variableValues?.token;

    if (!token) return res.status(401).json({ error: "Token missing in variableValues" });

    // Optionally verify the token (recommended for security)
    jwt.verify(token, process.env.SECRETE);

    // Forward the body to the Gmail API endpoint you need,
    // e.g., GET unread messages
    const endpoint = `${API_URL}/gmail/unread`

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Include cookie for authentication
        Cookie: `token=${token}`,
      },
    });

    let toolCallId 

    req.body?.message?.toolCallList.forEach((toolCall) => {
      if (toolCall.function.name === "listUnreadEmails") {
        toolCallId = toolCall.id;

      }
    });
    if (!toolCallId) {
      return res.status(400).json({ error: "Missing toolCallId" });
    }

    // const data = await response.json();
    console.log("🚀 Vapi proxy called! Payload:", toolCallId);

    // Format as expected by Vapi
    const resultPayload = {
      results: [
        {
          toolCallId,
          result: response.data.messages.join(', ')
        }
      ]
    };

    return res.json(resultPayload);

  } catch (err) {
    console.error("Vapi proxy error:", err);
    res.status(500).json({ error: "Vapi proxy failed" });
  }
});

app.use('/auth', authRoutes);
app.use('/gmail', gmailRoutes);
//Middleware to handle errors
app.use(errorMiddleware);

// // Home route
// app.get('/', (req, res) => {
//   res.render('index', { user: req.session.user });
// });


export default app;