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
import { ipRateLimit, authRateLimit } from "./middleware/rateLimit.middleware.js";
import { extractDeviceInfo } from "./middleware/auth.middleware.js";
import scheduleSessionCleanup from "./utils/sessionCleanup.js";
import scheduleInvitationCleanup from "./utils/invitationCleanup.js";

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

// Extract device information for all requests
app.use(extractDeviceInfo);

// Apply general rate limiting to all routes
app.use(ipRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // 100 requests per 15 minutes
}));

// Apply stricter rate limiting to authentication routes
app.use('/api/v1/auth', authRateLimit());

// Initialize session cleanup (run every 30 minutes)
scheduleSessionCleanup(30);

// Initialize invitation cleanup (run every 60 minutes)
scheduleInvitationCleanup(60);

//routes imports
import organizationRouter from "./routes/organization.routes.js";
import userRouter from "./routes/user.routes.js";
import authRouter from "./routes/auth.routes.js";
import roleRouter from "./routes/role.routes.js";
import invitationRouter from "./routes/invitation.routes.js";

app.use('/api/v1/organizations', organizationRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/roles', roleRouter);
app.use('/api/v1/invitations', invitationRouter);

// Error handling middleware

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json(new ApiResponse(err.statusCode || 500, err.data || null, err.message || 'Internal Server Error'));
});


// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export { app };