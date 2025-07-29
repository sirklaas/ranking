import pb from './pocketbase';

// Simple authentication helper
export const authService = {
  // Try to authenticate as admin or create a temporary user
  async ensureAuth() {
    // Check if already authenticated
    if (pb.authStore.isValid) {
      return true;
    }

    try {
      // Try to authenticate with admin credentials if available
      // You'll need to set these in your environment or PocketBase admin panel
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

      if (adminEmail && adminPassword) {
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        return true;
      }

      // Alternative: Create or authenticate a regular user for the app
      // This requires a 'users' collection with appropriate permissions
      console.warn('No admin credentials found. App may have limited access.');
      return false;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  },

  // Logout
  logout() {
    pb.authStore.clear();
  },

  // Check if authenticated
  isAuthenticated() {
    return pb.authStore.isValid;
  },

  // Get current user/admin
  getCurrentUser() {
    return pb.authStore.model;
  }
};

// Auto-authenticate on import
authService.ensureAuth().catch(console.error);
