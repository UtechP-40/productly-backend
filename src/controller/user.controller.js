import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadOnCloudinary } from "../utils/cloudinary";

export const createUser = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;
  // Get avatar from request
  const avatarLocalPath = req.files?.avatar[0]?.path;

  try {
    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is required");
    }
    
    // Upload to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    
    if (!avatar) {
      throw new ApiError(400, "Avatar file upload failed");
    }

    if ([email, password, fullName].some((field) => field?.trim() === "")) {
      throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({ email });
    if (existedUser) {
      throw new ApiError(409, "User with email already exists");
    }

    const user = await User.create({
      fullName,
      email,
      password,
      avatar: avatar.url
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User registered successfully"));
  } catch (error) {
    throw error;
  }
});
