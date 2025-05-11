const app = require('./app.js');
const dotenv = require('dotenv');

dotenv.config({ path: "config/config.env" }); 



const PORT = process.env.PORT || 8000; 






app.listen(PORT, () => {
    console.log(`dafixas server connected on Port: http://localhost:${PORT}`);
}); 