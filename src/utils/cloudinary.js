import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({
    path: './env'
});

// Configure Cloudinary with API credentials
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Log Cloudinary configuration
console.log(cloudinary.config());

// Function to upload a file to Cloudinary
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            // If local file path is not provided, return null
            return null;
        }

        // Upload the file to Cloudinary
        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
            // folder: "folder_name" // Optional: Specify a folder to store the uploaded file
        });
        
        // Log success message and delete the file from local storage
        console.log("File uploaded successfully", result);
        fs.unlinkSync(localFilePath);
        console.log("File unlinked from local storage");

        return result;
    } catch (error) {
        // If an error occurs, delete the file from local storage and return null
        fs.unlinkSync(localFilePath);
        return null;
    }
}

export { uploadOnCloudinary };
