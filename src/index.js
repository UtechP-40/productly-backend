import dotenv from "dotenv"; // Module for handling environment variables
import { app } from "./app.js"; // Custom app module
import mongoose from "mongoose"; // MongoDB library
import connectDb from "./db/index.js"; // Custom database connection module

// Import necessary modules

// Load environment variables from .env file
dotenv.config({
    path: './env'
});

// Connect to the database
connectDb()
    .then(() => {
        // Start the server
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at Port : ${process.env.PORT}`);
        });
    })
    .catch((err) => {
        console.log("MONGO db Connection failed ", err);
        app.on("error", (error) => {
            console.error("Server error:", error);
            throw error;
        });
    });

    // clusters implementation 

    // import dotenv from "dotenv";
    // import cluster from "cluster";
    // import os from "os";
    // import { app } from "./app.js";
    // import connectDb from "./db/index.js";
    
    // dotenv.config({
    //     path: './env'
    // });
    
    // if (cluster.isMaster) {
    //     const numWorkers = os.cpus().length;
    
    //     console.log(`Master ${process.pid} is running`);
    //     for (let i = 0; i < numWorkers; i++) {
    //         cluster.fork();
    //     }
    
    //     cluster.on("exit", (worker, code, signal) => {
    //         console.log(`Worker ${worker.process.pid} died`);
    //         cluster.fork();
    //     });
    // } else {
    //     connectDb()
    //         .then(() => {
    //             app.listen(process.env.PORT || 8000, () => {
    //                 console.log(`Worker ${process.pid} is running`);
    //                 console.log(`Server is running at Port : ${process.env.PORT}`);
    //             });
    //         })
    //         .catch((err) => {
    //             console.log("MONGO db Connection failed ", err);
    //             app.on("error", (error) => {
    //                 console.error("Server error:", error);
    //                 throw error;
    //             });
    //         });
    // }
    