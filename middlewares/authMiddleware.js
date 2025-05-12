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
            console.log("middleware");
            
            req.user = await UserModel.findById(verified.userid);
            console.log(req.user,"hii");
            
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