import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Session } from "../models/session.model.js";
import { ApiError } from "../utils/ApiError.js";
import authService from "../services/auth.service.js";

/**
 * Middleware to verify JWT token from Authorization header or cookies.
 * Attaches the authenticated user object to req.user.
 */
export const verifyJWT = async (req, res, next) => {
  try {
    let token;
    let sessionToken;
    
    // Check for access token in Authorization header or cookies
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    // Check for session token in cookies
    if (req.cookies && req.cookies.sessionToken) {
      sessionToken = req.cookies.sessionToken;
    }

    if (!token && !sessionToken) {
      throw new ApiError(401, "Authentication token missing");
    }

    // If we have a session token, validate the session
    if (sessionToken) {
      const session = await authService.validateSession(sessionToken);
      
      if (!session) {
        throw new ApiError(401, "Invalid or expired session");
      }
      
      // Get user from session
      const user = await User.findById(session.userId)
        .select("-password")
        .populate("organizationRole");
      
      if (!user) {
        throw new ApiError(401, "User not found");
      }
      
      if (!user.isActive) {
        throw new ApiError(403, "User account is inactive");
      }
      
      // Attach user and session to request
      req.user = user;
      req.session = session;
      return next();
    }
    
    // If no session token but we have an access token, verify JWT
    if (token) {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRATE);
      const user = await User.findById(decoded.id)
        .select("-password")
        .populate("organizationRole");

      if (!user) {
        throw new ApiError(401, "User not found");
      }
      
      if (!user.isActive) {
        throw new ApiError(403, "User account is inactive");
      }

      // Attach user to request
      req.user = user;
      return next();
    }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired"
      });
    }
    
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || "Unauthorized"
    });
  }
};

/**
 * Middleware to extract device information from request
 * Attaches device info to req.deviceInfo
 */
export const extractDeviceInfo = (req, res, next) => {
  const deviceInfo = {
    userAgent: req.headers["user-agent"] || "Unknown",
    ip: req.ip || req.connection.remoteAddress || "Unknown",
    deviceType: detectDeviceType(req.headers["user-agent"]),
    browser: detectBrowser(req.headers["user-agent"]),
    os: detectOS(req.headers["user-agent"])
  };
  
  req.deviceInfo = deviceInfo;
  next();
};

/**
 * Helper function to detect device type from user agent
 */
function detectDeviceType(userAgent = "") {
  if (!userAgent) return "UNKNOWN";
  
  if (/mobile/i.test(userAgent)) {
    return "MOBILE";
  } else if (/tablet|ipad/i.test(userAgent)) {
    return "TABLET";
  } else if (/windows|macintosh|linux/i.test(userAgent)) {
    return "DESKTOP";
  }
  
  return "UNKNOWN";
}

/**
 * Helper function to detect browser from user agent
 */
function detectBrowser(userAgent = "") {
  if (!userAgent) return "Unknown";
  
  if (/chrome/i.test(userAgent)) {
    return "Chrome";
  } else if (/firefox/i.test(userAgent)) {
    return "Firefox";
  } else if (/safari/i.test(userAgent)) {
    return "Safari";
  } else if (/edge/i.test(userAgent)) {
    return "Edge";
  } else if (/opera/i.test(userAgent)) {
    return "Opera";
  } else if (/msie|trident/i.test(userAgent)) {
    return "Internet Explorer";
  }
  
  return "Unknown";
}

/**
 * Helper function to detect OS from user agent
 */
function detectOS(userAgent = "") {
  if (!userAgent) return "Unknown";
  
  if (/windows/i.test(userAgent)) {
    return "Windows";
  } else if (/macintosh|mac os/i.test(userAgent)) {
    return "MacOS";
  } else if (/linux/i.test(userAgent)) {
    return "Linux";
  } else if (/android/i.test(userAgent)) {
    return "Android";
  } else if (/iphone|ipad|ios/i.test(userAgent)) {
    return "iOS";
  }
  
  return "Unknown";
}