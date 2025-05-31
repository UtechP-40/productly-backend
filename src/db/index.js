import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const DB_NAME = ""; // TODO: Add the name of your database here

console.log(process.env.MONGODB_URI); // Log the MongoDB URI from the environment variables

const connectDb = async () => {
    try {
        // Connect to MongoDB using the provided URI and additional options
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}`, {
            minPoolSize: 5,
            maxPoolSize: 20,
            serverSelectionTimeoutMS: 5000,
        }); ///DB_NAME

        console.log(`\nConnected to MongoDB: ${connectionInstance.connection.host}`); // Log the host of the connected MongoDB instance
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error}`); // Log any errors that occur during the connection process
        process.exit(1); // Exit the process with a non-zero status code to indicate an error
    }
};

export default connectDb;