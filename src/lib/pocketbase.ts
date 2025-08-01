import PocketBase from 'pocketbase';

// Client-side only - no build-time PocketBase dependency
export const getPocketBase = () => {
  if (typeof window === 'undefined') {
    return null; // Return null for SSR/build time
  }
  const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://pinkmilk.pockethost.io');
  pb.autoCancellation(false);
  return pb;
};

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
    const pb = getPocketBase();
    if (!pb) throw new Error('PocketBase not available');
    return await pb.collection('ranking').create(sessionData);
  },

  // Get all ranking sessions
  async getAllSessions() {
    const pb = getPocketBase();
    if (!pb) throw new Error('PocketBase not available');
    return await pb.collection('ranking').getFullList({
      sort: '-created'
    });
  },

  // Get ranking session by ID
  async getSessionById(id: string) {
    const pb = getPocketBase();
    if (!pb) throw new Error('PocketBase not available');
    return await pb.collection('ranking').getOne(id);
  },

  // Update ranking session
  async updateSession(id: string, data: Record<string, unknown>) {
    const pb = getPocketBase();
    if (!pb) throw new Error('PocketBase not available');
    return await pb.collection('ranking').update(id, data);
  },

  // Delete ranking session
  async deleteSession(id: string) {
    const pb = getPocketBase();
    if (!pb) throw new Error('PocketBase not available');
    return await pb.collection('ranking').delete(id);
  },

  // Subscribe to real-time updates
  subscribeToRankings(callback: (data: unknown) => void) {
    const pb = getPocketBase();
    if (!pb) throw new Error('PocketBase not available');
    return pb.collection('ranking').subscribe('*', callback);
 },

  // Search sessions by show name or city
  async searchSessions(query: string) {
    const pb = getPocketBase();
    if (!pb) throw new Error('PocketBase not available');
    return await pb.collection('ranking').getFullList({
      filter: `showname ~ "${query}" || city ~ "${query}"`,
      sort: '-created'
    });
  },
};

// Additional helper functions for team management
export const teamService = {
  // Parse player names from comma-separated string
  parsePlayerNames: (playerNames: string): string[] => {
    if (!playerNames) return [];
    return playerNames
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
  },

  generateTeamAssignments: (playerNames: string[], numberOfTeams: number): { [key: number]: string[] } => {
    if (!playerNames.length || numberOfTeams === 0) return {};
    
    // Shuffle players randomly for initial distribution
    const shuffledPlayers = [...playerNames].sort(() => Math.random() - 0.5);
    const teams: { [key: number]: string[] } = {};
    
    // Initialize teams
    for (let i = 1; i <= numberOfTeams; i++) {
      teams[i] = [];
    }
    
    // Distribute players evenly
    shuffledPlayers.forEach((player, index) => {
      const teamNumber = (index % numberOfTeams) + 1;
      teams[teamNumber].push(player);
    });
    
    return teams;
  },

  parseTeamAssignments: (teamAssignmentsJson: string): { [key: number]: string[] } => {
    if (!teamAssignmentsJson) return {};
    try {
      return JSON.parse(teamAssignmentsJson);
    } catch {
      return {};
    }
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
