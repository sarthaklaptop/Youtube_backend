// this middleware will only tell uuser exists or not 
// mostly required at the time of logout

import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler ( async (req, _, next) => {


    try {
        const token = req.cookies?.accesToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token) {
            throw new ApiError(401, "Unauthorized Request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            // discuss about frontend
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;
    
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }

})