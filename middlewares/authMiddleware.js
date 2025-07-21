import jwt from 'jsonwebtoken';
import UserModel from "../models/user"
import ErrorHandler from '../utils/errorHandler';

export const authenticateUser = async(req,res,next)=>{
    try {
        const {token} = req.cookies
            if(!token){
                return next(new ErrorHandler("Login first to access this resource",401))
            }
            const verified=jwt.verify(token,process.env.SECRETE); 
            
            req.user = await UserModel.findById(verified.userid); 
            req.token = token; // Store the token in the request object for later use
            
            next(); 
    } catch (error) {
        next(error)
    }
}

export const allowedRoles = (...roles)=>{
    return (req,res,next)=>{
        const {user} = req;

        if(!roles.includes(user.role)){
            return next(new ErrorHandler(`Role ${user.role} is not allowed to access this resource`,401))
        }
        next();
    }
}