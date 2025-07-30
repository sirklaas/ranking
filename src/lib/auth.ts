import { getPocketBase } from './pocketbase';

// Simple authentication helper - client-side only
export const authService = {
  // Try to authenticate as admin or create a temporary user
  async ensureAuth() {
    const pb = getPocketBase();
    if (!pb) return false;

    // Check if already authenticated
    if (pb.authStore.isValid) {
      return true;
    }

    try {
      // Try to authenticate with admin credentials if available
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

      if (adminEmail && adminPassword) {
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        return true;
      }

      console.warn('No admin credentials found. App may have limited access.');
      return false;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  },

  // Logout
  logout() {
    const pb = getPocketBase();
    if (pb) pb.authStore.clear();
  },

  // Check if authenticated
  isAuthenticated() {
    const pb = getPocketBase();
    return pb ? pb.authStore.isValid : false;
  },

  // Get current user/admin
  getCurrentUser() {
    const pb = getPocketBase();
    return pb ? pb.authStore.model : null;
  }
};

// Auto-authenticate on import
authService.ensureAuth().catch(console.error);
