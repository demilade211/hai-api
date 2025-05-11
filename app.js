import  express from "express"; 
import path from "path" 
import cookieParser from "cookie-parser" 
import cors from "cors";
// Routes
import authRoutes from './routes/auth.js';
import gmailRoutes from './routes/gmail.js';

const app = express();

// Session configuration
// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: true,
// }));

// ✅ Set allowed origin (adjust to your frontend origin)
const allowedOrigin = process.env.NODE_ENV === "DEVELOPMENT"?"http://localhost:3000":"https://haimail.vercel.app"; // or your frontend URL

app.use(cors({
  origin: allowedOrigin,
  credentials: true // ✅ allow sending cookies
}));

app.use(express.json());
app.use(express.urlencoded({extended: false}));//to handle url encoded data
app.use(cookieParser()) 
 


app.use('/auth', authRoutes);
app.use('/gmail', gmailRoutes);

// // Home route
// app.get('/', (req, res) => {
//   res.render('index', { user: req.session.user });
// });

 
export default app;