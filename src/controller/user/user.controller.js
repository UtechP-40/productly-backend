// FILEPATH: /mnt/data/kick_start/productly/backend/src/controller/user/user.controller.js

import { User } from "../../models/user.model.js";
// import { Organization } from "../../models/organization.model.js";
import { OrganizationUser } from "../../models/organizationUser.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
};

export const loginUser = asyncHandler(async (req, res,next) => {
    console.log('reached here')
    try {
        const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // Fetch user's organizations and permissions
    const userOrganizations = await OrganizationUser.find({ userId: user._id })
        .populate('organizationId', 'name slug')
        .select('organizationId role permissions');

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    organizations: userOrganizations,
                    accessToken
                },
                "User logged in successfully"
            )
        );
    } catch (error) {
        console.log(error)
        next(error)
    }
});

export const getUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Fetch user's organizations and permissions
    const userOrganizations = await OrganizationUser.find({ userId })
        .populate('organizationId', 'name slug')
        .select('organizationId role permissions');

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    user,
                    organizations: userOrganizations
                },
                "User profile fetched successfully"
            )
        );
});
