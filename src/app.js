import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiResponse } from "./utils/ApiResponse.js";
import dotenv from "dotenv";
import session from "express-session";
import MongoStore from "connect-mongodb-session";
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const swaggerDocument = YAML.load(join(__dirname, '../swagger.yaml'));

dotenv.config();

const app = express();


// app.use(
//   session({
//     secret: process.env.REFRESH_TOKEN_SECRATE,
//     resave: false,
//     saveUninitialized: true,
//     store: new MongoStore({
//       mongoUrl: process.env.MONGODB_URI,
//       collection: 'sessions' // Optional: explicitly name the collection
//     }),
//     cookie: { 
//       secure: process.env.NODE_ENV === 'production',
//       maxAge: 24 * 60 * 60 * 1000
//     }
//   })
// );

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

//routes imports
import organizationRouter from "./routes/organization.routes.js";

app.use('/api/v1/organizations', organizationRouter)


// Error handling middleware

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json(new ApiResponse(err.statusCode || 500, err.data || null, err.message || 'Internal Server Error'));
});


// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export { app };