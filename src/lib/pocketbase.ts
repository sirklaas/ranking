import PocketBase from 'pocketbase';

interface RankingSession {
  id: string;
  showname: string;
  city: string;
  nr_players: number;
}

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://pinkmilk.pockethost.io');

// Disable auto cancellation
pb.autoCancellation(false);

// Helper functions for ranking management
export const rankingService = {
  // Create a new ranking game session
  async createSession(sessionData: {
    showname: string;
    city: string;
    nr_players: number;
    nr_teams: number;
    playernames: string;
  }) {
    return await pb.collection('ranking').create(sessionData);
  },

  // Get all ranking sessions
  async getAllSessions() {
    return await pb.collection('ranking').getFullList({
      sort: '-created'
    });
  },

  // Get ranking session by ID
  async getSessionById(id: string) {
    return await pb.collection('ranking').getOne(id);
  },

  // Update ranking session
  async updateSession(id: string, data: Record<string, unknown>) {
    return await pb.collection('ranking').update(id, data);
  },

  // Delete ranking session
  async deleteSession(id: string) {
    return await pb.collection('ranking').delete(id);
  },

  // Subscribe to real-time updates
  subscribeToRankings(callback: (data: unknown) => void) {
    return pb.collection('ranking').subscribe('*', callback);
  },

  // Search sessions by show name or city
  async searchSessions(query: string) {
    return await pb.collection('ranking').getFullList({
      filter: `showname ~ "${query}" || city ~ "${query}"`,
      sort: '-created'
    });
  },
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
  getTeamStats(sessions: Array<Record<string, unknown>>) {
    const totalPlayers = sessions.reduce((sum, session) => {
      const s = session as { nr_players?: number };
      return sum + (s.nr_players || 0);
    }, 0);
    
    const totalTeams = sessions.reduce((sum, session) => {
      const s = session as { nr_teams?: number };
      return sum + (s.nr_teams || 0);
    }, 0);
    
    const cities = [...new Set(sessions.map(session => {
      const s = session as { city?: string };
      return s.city;
    }))];

    return {
      totalSessions: sessions.length,
      totalPlayers,
      totalTeams,
      uniqueCities: cities.length
    };
  }
};
