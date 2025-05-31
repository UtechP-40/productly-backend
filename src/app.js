import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiResponse } from "./utils/ApiResponse.js";
import dotenv from "dotenv";
import session from "express-session";

dotenv.config();

const app = express();


app.use(
  session({
    secret: process.env.REFRESH_TOKEN_SECRATE,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json({ limit: "16kb" }));

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Serve static files from the "public" directory
app.use(express.static("public"));

// Parse cookies
app.use(cookieParser());



// Error handling middleware

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json(new ApiResponse(err.statusCode || 500, err.data || null, err.message || 'Internal Server Error'));
});


export { app };