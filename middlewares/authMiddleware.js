import jwt from 'jsonwebtoken';
import UserModel from "../models/user"
import ErrorHandler from '../utils/errorHandler';


export const authenticateUser = async(req,res,next)=>{
    try {
        const token = req.headers.authorization
        if(!token){
            return next(new ErrorHandler("Login first to access this resource",401))
        }
        const {userid}=jwt.verify(req.headers.authorization,process.env.SECRETE);
        let testUser = await UserModel.findById(userid);

        if(!testUser) return next(new ErrorHandler("This user does not exist",404))
        
        req.user = testUser;
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