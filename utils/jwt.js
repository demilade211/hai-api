import dotenv from "dotenv"

dotenv.config({ path: "../config/config.env" }); 
// Create and send token and save in the cookie.
const sendToken = (user, statusCode, res, token) => {



    // Options for cookie
    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRY_TIME * 24 * 60 * 60 * 1000
        ),
        httpOnly: true, 
        sameSite: 'None', // for cross-origin cookies (if backend & frontend are on different domains)
    }

    if(process.env.NODE_ENV === 'PRODUCTION'){
        options.secure = true; // Set to true for production important for cookies to work over HTTPS (e.g., on Vercel)
    }


    res.cookie('token', token, options);

}

export default sendToken;