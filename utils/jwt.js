import dotenv from "dotenv"

dotenv.config({ path: "config/config.env" }); 
// Create and send token and save in the cookie.
const sendToken = (user, statusCode, res, token) => {



    // Options for cookie
    const options = {
        expires: new Date(
            Date.now() + 2 * 24 * 60 * 60 * 1000
        ),
        httpOnly: true, 
        sameSite: process.env.NODE_ENV === 'PRODUCTION' ? 'none' : 'lax', // for cross-origin cookies (if backend & frontend are on different domains)
        secure: process.env.NODE_ENV === 'PRODUCTION',
    }

    // if(process.env.NODE_ENV === 'PRODUCTION'){
    //     options.secure = true; // Set to true for production important for cookies to work over HTTPS (e.g., on Vercel)
    // }

    //console.log("saving token in cookie",token);
    
    res.cookie('token', token, options);

}

export default sendToken;