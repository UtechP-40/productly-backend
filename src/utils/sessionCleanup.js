import authService from "../services/auth.service.js";

/**
 * Schedule periodic cleanup of expired sessions
 * @param {number} intervalMinutes - Interval in minutes between cleanup runs
 */
export const scheduleSessionCleanup = (intervalMinutes = 60) => {
  // Initial cleanup after 1 minute
  setTimeout(async () => {
    try {
      const cleanedCount = await authService.cleanupExpiredSessions();
      console.log(`Initial session cleanup: ${cleanedCount} expired sessions removed`);
    } catch (error) {
      console.error("Error during initial session cleanup:", error);
    }
  }, 60 * 1000);

  // Schedule regular cleanup
  setInterval(async () => {
    try {
      const cleanedCount = await authService.cleanupExpiredSessions();
      console.log(`Scheduled session cleanup: ${cleanedCount} expired sessions removed`);
    } catch (error) {
      console.error("Error during scheduled session cleanup:", error);
    }
  }, intervalMinutes * 60 * 1000);
};

export default scheduleSessionCleanup;