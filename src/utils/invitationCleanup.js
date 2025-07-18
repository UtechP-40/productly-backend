import invitationService from "../services/invitation.service.js";

/**
 * Schedule periodic cleanup of expired invitations
 * @param {number} intervalMinutes - Cleanup interval in minutes
 */
function scheduleInvitationCleanup(intervalMinutes = 60) {
  // Initial cleanup
  setTimeout(async () => {
    try {
      const count = await invitationService.cleanupExpiredInvitations();
      console.log(`Initial invitation cleanup: ${count} expired invitations processed`);
    } catch (error) {
      console.error("Error during invitation cleanup:", error);
    }
  }, 10000); // Run initial cleanup after 10 seconds

  // Schedule periodic cleanup
  setInterval(async () => {
    try {
      const count = await invitationService.cleanupExpiredInvitations();
      if (count > 0) {
        console.log(`Invitation cleanup: ${count} expired invitations processed`);
      }
    } catch (error) {
      console.error("Error during invitation cleanup:", error);
    }
  }, intervalMinutes * 60 * 1000);
}

export default scheduleInvitationCleanup;