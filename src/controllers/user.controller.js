// we will use asyncHandler

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)

        // adding await to accessToken and refreshToken keeps the tokes output in string format
        // else it might store the values in promise format as we are using async function
        // It took over 2 hours to debug
        // so remember from next time
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        // console.log("thhhhhhhis access",accessToken)

        // console.log("thhhhhhhis refresh", refreshToken)

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something Went Wrong while generating refresh and access tokens")
    }
}



const registerUser = asyncHandler ( async (req, res) => {
    // get user details form frontend
    // validation for all the details user entered - not empty
    // check if user already exists - using username and email
    // check for images
    // check for avatar
    // upload them to cloudinary, check avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation 
    // return response

    // data
    const {username, email, fullName, password}= req.body
    // console.log("email:- ", email)

    // validation
    if(
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError (400, "All fields are required")
    }

    // userr already exists?
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username Already Exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if( req.files && Array.isArray(req.files?.coverImage) && req.files?.coverImage.length > 0){

        coverImageLocalPath = req.files?.coverImage[0]?.path

    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadonCloudinary(avatarLocalPath);

    const coverImage = await uploadonCloudinary(coverImageLocalPath)


    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    // db entry
    const user = await User.create({
        fullName, 
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })

    const createdUser = await User.findById(user._id).select( 
        "-password -refreshToken"
     )

    if (!createdUser){
        throw new ApiError(500, "Server || Something went wrong while registering a user    ")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Created Successfully")
    )
} )

const loginUser = asyncHandler ( async (req, res) => {
    // take data from body

    // username, email is present
    // find the user
    // chaeck password
    // access and refresh tokens
    // send cookies 
    // send response

    const {email, username, password} = req.body;

    console.log(email);

    if(!username && !email){
        throw new ApiError(400, "Username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not Exists")
    }
    
    const isPasswordValid = await user.isPasswordCorrect(password)
    
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid User credentials")
    }

    // console.log(user._id)
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    // console.log("out",refreshToken)
    // console.log("out access:- ",accessToken)
    // console.log("This is access Token",accessToken)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // console.log(loggedInUser)
    // sending cookies

    const options = {
        httpOnly: true,
        secure: true
    }

    // console.log("Final access token:- ", accessToken)

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )

})

const logoutUser = asyncHandler ( async (req, res) => {
    // clear cookies
    // remove access token from db
    // find user Id

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field form document
            }
        },
        {
            new: true
        }

    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"))

})

const refreshAccessToken = asyncHandler( async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorised Request")
    }
    
    try {
        const decodedToke = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        
        const user = await User.findById(decodedToke?._id)
        
        if(!user){
            throw new ApiError(401, "Invalod Refresh Token")
        }
        
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh Token is Expired or Used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user?._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access Token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }

})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}