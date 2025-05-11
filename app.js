require('dotenv').config({ path: "config/config.env" });
import  express from "express";
const session = require('express-session');
import path from "path" 
import cookieParser from "cookie-parser" 
import cors from "cors";


const app = express();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({extended: false}));//to handle url encoded data
app.use(cookieParser())

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/auth');
const gmailRoutes = require('./routes/gmail');
app.use('/auth', authRoutes);
app.use('/gmail', gmailRoutes);

// Home route
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

 
module.exports = app;