import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        },
    ]),
    registerUser)

router.route("/login").post(loginUser)

// secured routes

// here in next route verifyJWT is the new middleware we created for verifying the user
// It will help us get the userId we want to logout
// now from adding this middleware to the route
// we can access the user id in user.controller in (logoutUser) method

router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)



export default router