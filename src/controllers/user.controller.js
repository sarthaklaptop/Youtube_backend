// we will use asyncHandler

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)

        const accesToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accesToken, refreshToken}
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

    if(!username || !email){
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

    const {accesToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // sending cookies

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accesToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accesToken, refreshToken
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
            $set: {
                refreshToken: undefined
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

export {
    registerUser,
    loginUser,
    logoutUser
}