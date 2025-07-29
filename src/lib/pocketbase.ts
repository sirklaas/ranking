import PocketBase from 'pocketbase';

// Initialize PocketBase client
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://pinkmilk.pockethost.io');

// Disable auto cancellation
pb.autoCancellation(false);

// Simple auth helper
const ensureAuth = async () => {
  if (pb.authStore.isValid) return true;
  
  try {
    // Try to authenticate with a simple approach
    // For now, we'll make the collection public or handle auth in PocketBase admin
    return true;
  } catch (error) {
    console.error('Auth failed:', error);
    return false;
  }
};

export default pb;

// Helper functions for ranking management using existing schema
export const rankingService = {
  // Create a new ranking game session
  async createRankingSession(sessionData: {
    showname: string;
    city: string;
    nr_players: number;
    nr_teams: number;
    playernames: string;
  }) {
    await ensureAuth();
    return await pb.collection('ranking').create(sessionData);
  },

  // Get all ranking sessions
  async getAllSessions() {
    await ensureAuth();
    return await pb.collection('ranking').getFullList({
      sort: '-created'
    });
  },

  // Get ranking session by ID
  async getSessionById(id: string) {
    return await pb.collection('ranking').getOne(id);
  },

  // Update ranking session
  async updateSession(id: string, data: any) {
    return await pb.collection('ranking').update(id, data);
  },

  // Delete ranking session
  async deleteSession(id: string) {
    return await pb.collection('ranking').delete(id);
  },

  // Subscribe to ranking updates
  subscribeToRankings(callback: (data: any) => void) {
    return pb.collection('ranking').subscribe('*', callback);
  },

  // Unsubscribe from ranking updates
  unsubscribeFromRankings() {
    pb.collection('ranking').unsubscribe();
  },

  // Search sessions by show name or city
  async searchSessions(query: string) {
    return await pb.collection('ranking').getFullList({
      filter: `showname ~ "${query}" || city ~ "${query}"`,
      sort: '-created'
    });
  }
};

// Additional helper functions for team management
export const teamService = {
  // Parse player names from comma-separated string
  parsePlayerNames(playernames: string): string[] {
    return playernames.split(',').map(name => name.trim()).filter(name => name.length > 0);
  },

  // Format player names to comma-separated string
  formatPlayerNames(names: string[]): string {
    return names.join(', ');
  },

  // Get team statistics
  getTeamStats(sessions: any[]) {
    const totalPlayers = sessions.reduce((sum, session) => sum + session.nr_players, 0);
    const totalTeams = sessions.reduce((sum, session) => sum + session.nr_teams, 0);
    const cities = [...new Set(sessions.map(session => session.city))].length;
    
    return {
      totalSessions: sessions.length,
      totalPlayers,
      totalTeams,
      uniqueCities: cities
    };
  }
};
