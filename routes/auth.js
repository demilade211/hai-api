import express from 'express';

import { google } from 'googleapis';

import UserModel from '../models/user.js'; // Adjust the path to your User model
import jwt from 'jsonwebtoken';
import sendToken from "../utils/jwt.js";
import { authenticateUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

let apiUrl = process.env.NODE_ENV === 'PRODUCTION' ? 'https://hai-api.onrender.com' : 'http://localhost:8000';
let feUrl = process.env.NODE_ENV === 'PRODUCTION' ? 'https://haimail.vercel.app' : 'http://localhost:3000';
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${apiUrl}/auth/google/callback`
);

// const oauth2Client = new google.auth.OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   'http://localhost:8000/auth/google/callback'
// );

// Scopes for Gmail access
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
];

// Initiate OAuth flow
router.get('/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  res.status(200).json({
    success: true,
    url: authUrl
  })
  //res.redirect(authUrl);
});

// OAuth callback
// router.get('/google/callback', async (req, res) => {
//   const code = req.query.code;
//   try {
//     const { tokens } = await oauth2Client.getToken(code);
//     oauth2Client.setCredentials(tokens);

//     // Store tokens and user info in session
//     req.session.tokens = tokens;

//     // Retrieve user's email
//     const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
//     const profile = await gmail.users.getProfile({ userId: 'me' });
//     req.session.user = { email: profile.data.emailAddress };

//     res.redirect('/');
//   } catch (error) {
//     console.error('Error during OAuth callback', error);
//     res.redirect('/');
//   }
// });

router.get('/google/callback', async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user's email
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const email = profile.data.emailAddress;

    // Find or create user in DB
    let user = await UserModel.findOne({ email });

    if (!user) {
      user = new UserModel({ email });
    }

    user.email = email; // Update email in case it was not set before

    // Save tokens in user.google
    user.google = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || user.google.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
    };

    await user.save();

    const payload = { userid: user._id }
    const authToken = await jwt.sign(payload, process.env.SECRETE, { expiresIn: '7d' })

    sendToken(user, 200, res, authToken)

    // Optionally store userId in session or JWT for future requests
    // req.session.userId = user._id;

    res.redirect(`${feUrl}/home`);
  } catch (error) {
    console.error('Error during OAuth callback', error);
    res.redirect(`${feUrl}/auth/login`);
  }
});


router.get('/me',authenticateUser, async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    })
  } catch (error) {
    return next(error)
  }
});

module.exports = router;
