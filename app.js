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

app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({extended: false}));//to handle url encoded data
app.use(cookieParser()) 
 


app.use('/auth', authRoutes);
app.use('/gmail', gmailRoutes);

// Home route
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

 
export default app;