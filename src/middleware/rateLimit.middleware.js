/**
 * Rate limiting middleware to prevent brute force attacks
 * Uses in-memory storage for simplicity, but can be extended to use Redis or other stores
 */

// In-memory store for rate limiting
const ipRequestStore = new Map();
const userRequestStore = new Map();

/**
 * Clear expired entries from the rate limit stores
 * This should be called periodically to prevent memory leaks
 */
const clearExpiredEntries = () => {
  const now = Date.now();
  
  // Clear IP-based entries
  for (const [ip, data] of ipRequestStore.entries()) {
    if (data.resetTime < now) {
      ipRequestStore.delete(ip);
    }
  }
  
  // Clear user-based entries
  for (const [userId, data] of userRequestStore.entries()) {
    if (data.resetTime < now) {
      userRequestStore.delete(userId);
    }
  }
};

// Run cleanup every 15 minutes
setInterval(clearExpiredEntries, 15 * 60 * 1000);

/**
 * IP-based rate limiting middleware
 * Limits requests based on client IP address
 * 
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum number of requests allowed in the window
 * @param {Array<string>} options.excludePaths - Paths to exclude from rate limiting
 * @returns {Function} Express middleware function
 */
export const ipRateLimit = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes by default
  const maxRequests = options.maxRequests || 100; // 100 requests per window by default
  const excludePaths = options.excludePaths || [];
  
  return (req, res, next) => {
    // Skip rate limiting for excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Initialize or get the IP entry
    if (!ipRequestStore.has(ip)) {
      ipRequestStore.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    const ipData = ipRequestStore.get(ip);
    
    // Reset counter if window has passed
    if (ipData.resetTime < now) {
      ipData.count = 1;
      ipData.resetTime = now + windowMs;
      return next();
    }
    
    // Increment counter and check limit
    ipData.count += 1;
    
    if (ipData.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((ipData.resetTime - now) / 1000)
      });
    }
    
    return next();
  };
};

/**
 * Authentication route rate limiting middleware
 * Stricter limits for authentication-related endpoints
 * 
 * @returns {Function} Express middleware function
 */
export const authRateLimit = () => {
  // Stricter limits for auth routes: 10 requests per 5 minutes
  const windowMs = 5 * 60 * 1000;
  const maxRequests = 10;
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Initialize or get the IP entry
    if (!ipRequestStore.has(ip)) {
      ipRequestStore.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    const ipData = ipRequestStore.get(ip);
    
    // Reset counter if window has passed
    if (ipData.resetTime < now) {
      ipData.count = 1;
      ipData.resetTime = now + windowMs;
      return next();
    }
    
    // Increment counter and check limit
    ipData.count += 1;
    
    if (ipData.count > maxRequests) {
      // Add exponential backoff for repeated failures
      const retryAfter = Math.min(
        Math.pow(2, ipData.count - maxRequests) * 10,
        60 * 60 // Max 1 hour
      );
      
      return res.status(429).json({
        success: false,
        message: 'Too many authentication attempts, please try again later',
        retryAfter
      });
    }
    
    return next();
  };
};

/**
 * User-based rate limiting middleware
 * Limits requests based on authenticated user ID
 * 
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum number of requests allowed in the window
 * @returns {Function} Express middleware function
 */
export const userRateLimit = (options = {}) => {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute by default
  const maxRequests = options.maxRequests || 30; // 30 requests per minute by default
  
  return (req, res, next) => {
    // Skip if no authenticated user
    if (!req.user || !req.user._id) {
      return next();
    }
    
    const userId = req.user._id.toString();
    const now = Date.now();
    
    // Initialize or get the user entry
    if (!userRequestStore.has(userId)) {
      userRequestStore.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    const userData = userRequestStore.get(userId);
    
    // Reset counter if window has passed
    if (userData.resetTime < now) {
      userData.count = 1;
      userData.resetTime = now + windowMs;
      return next();
    }
    
    // Increment counter and check limit
    userData.count += 1;
    
    if (userData.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded, please slow down',
        retryAfter: Math.ceil((userData.resetTime - now) / 1000)
      });
    }
    
    return next();
  };
};