const app = require('./app.js');
const dotenv = require('dotenv');
import connectDb from "./db/db.js"
dotenv.config({ path: "config/config.env" }); 

connectDb();

const PORT = process.env.PORT || 8000; 






app.listen(PORT, () => {
    console.log(`haiMail server connected on Port: http://localhost:${PORT} in ${process.env.NODE_ENV} MODE`);
}); 