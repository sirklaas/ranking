import PocketBase from 'pocketbase';

let pbClient: PocketBase | null = null;
let motherfileRecordId: string | null = null;
// Client-side only - no build-time PocketBase dependency
export function getPocketBase(): PocketBase | null {
  if (typeof window === 'undefined') return null;
  if (!pbClient) {
    const fallback = (typeof window !== 'undefined' && window.location?.protocol === 'https:')
      ? 'https://pinkmilk.pockethost.io'
      : 'http://127.0.0.1:8090';
    const baseUrl = process.env.NEXT_PUBLIC_PB_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || fallback;
    pbClient = new PocketBase(baseUrl);
  }
  return pbClient;
}

// Motherfile types
export type MotherfileFases = Record<string, { heading: string; image?: string }>;
export interface MotherfileRecord {
  fases?: MotherfileFases;
  media?: string[];
}

// Motherfile (singleton) service
export const motherfileService = {
  async get(): Promise<MotherfileRecord> {
    const res = await fetch('/api/pb-motherfile', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Motherfile GET failed: ${res.status}`);
    const json = await res.json();
    if (json?.meta?.recordId) motherfileRecordId = json.meta.recordId as string;
    return (json?.data as MotherfileRecord) || {};
  },
  setRecordId(id: string | null) {
    motherfileRecordId = id || null;
  },
  async update(data: Partial<MotherfileRecord>) {
    // Server route expects { fases }
    const res = await fetch('/api/pb-motherfile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Motherfile PUT failed: ${res.status}`);
    return await res.json();
  },
  async uploadMedia(files: File | File[]) {
    const formData = new FormData();
    const arr = Array.isArray(files) ? files : [files];
    for (const f of arr) formData.append('media', f);
    const res = await fetch('/api/pb-motherfile', { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Motherfile media upload failed: ${res.status}`);
    return await res.json();
  },
  async listMedia(): Promise<string[]> {
    const rec = await this.get();
    const media = rec.media || [];
    return Array.isArray(media) ? media : (media ? [media] : []);
  },
  fileUrl(fileName: string) {
    if (!fileName) return '';
    if (/^https?:\/\//i.test(fileName)) return fileName;
    const fallback = (typeof window !== 'undefined' && window.location?.protocol === 'https:')
      ? 'https://pinkmilk.pockethost.io'
      : 'http://127.0.0.1:8090';
    const baseUrl = process.env.NEXT_PUBLIC_PB_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || fallback;
    const collection = (process.env.NEXT_PUBLIC_PB_MOTHERFILE_COLLECTION || 'motherfile').trim();
    if (motherfileRecordId) {
      return `${baseUrl}/api/files/${collection}/${motherfileRecordId}/${encodeURIComponent(fileName)}`;
    }
    // If record id unknown, return the bare filename to avoid broken URL; UI can still render name/placeholder
    return fileName;
  }
};

// Weekplanner service (TEXT ownerId, Date weekStart, JSON data)
export interface WeekplannerRecordData {
  ownerId: string; // e.g. "klaas" | "liza"
  weekStart: string; // ISO string at Monday 00:00:00.000Z
  data: unknown; // entire planner JSON
}

export interface WeekplannerRecord extends WeekplannerRecordData {
  id: string;
  created?: string;
  updated?: string;
}

export const weekplannerService = {
  collection: 'weekplanner',

  async findWeek(ownerId: string, weekStartISO: string): Promise<WeekplannerRecord | null> {
    const pb = getPocketBase();
    if (!pb) throw new Error('PocketBase not available');
    try {
      const rec = await pb.collection(this.collection).getFirstListItem(
        `ownerId = "${ownerId}" && weekStart = "${weekStartISO}"`
      );
      return rec as unknown as WeekplannerRecord;
    } catch {
      // 404 when not found
      return null;
    }
  },

  async createWeek(payload: WeekplannerRecordData): Promise<WeekplannerRecord> {
    const pb = getPocketBase();
    if (!pb) throw new Error('PocketBase not available');
    try {
      const rec = await pb
        .collection(this.collection)
        .create(payload as unknown as Record<string, unknown>);
      return rec as unknown as WeekplannerRecord;
    } catch (err) {
      if (typeof window !== 'undefined') {
        // Surface error in browser console
        // eslint-disable-next-line no-console
        console.warn('[weekplannerService.createWeek] failed', err);
      }
      throw err;
    }
  },

  async updateWeek(id: string, data: Partial<WeekplannerRecordData>): Promise<WeekplannerRecord> {
    const pb = getPocketBase();
    if (!pb) throw new Error('PocketBase not available');
    try {
      const rec = await pb
        .collection(this.collection)
        .update(id, data as unknown as Record<string, unknown>);
      return rec as unknown as WeekplannerRecord;
    } catch (err) {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn('[weekplannerService.updateWeek] failed', err);
      }
      throw err;
    }
  },

  async upsertWeek(ownerId: string, weekStartISO: string, data: unknown): Promise<WeekplannerRecord> {
    const existing = await this.findWeek(ownerId, weekStartISO);
    if (existing) {
      return await this.updateWeek(existing.id, { data });
    }
    return await this.createWeek({ ownerId, weekStart: weekStartISO, data });
  }
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

  // Assign team numbers to player names by prefixing (rock-solid approach)
  assignTeamNumbersToPlayers: (playerNames: string[], numberOfTeams: number): string[] => {
    if (!playerNames.length || numberOfTeams === 0) return playerNames;
    
    // Shuffle players randomly for initial distribution
    const shuffledPlayers = [...playerNames].sort(() => Math.random() - 0.5);
    
    // Assign team numbers by prefixing names
    return shuffledPlayers.map((player, index) => {
      const teamNumber = (index % numberOfTeams) + 1;
      const teamPrefix = teamNumber.toString().padStart(3, '0'); // 001, 002, etc.
      return `${teamPrefix} ${player}`;
    });
  },

  // Extract team number from prefixed player name
  getPlayerTeamNumber: (prefixedPlayerName: string): number => {
    const match = prefixedPlayerName.match(/^(\d{3})\s/);
    return match ? parseInt(match[1], 10) : 0;
  },

  // Remove team number prefix from player name for display
  getDisplayPlayerName: (prefixedPlayerName: string): string => {
    return prefixedPlayerName.replace(/^\d{3}\s/, '');
  },

  // Generate team assignments from prefixed player names
  generateTeamAssignments: (playerNames: string[], numberOfTeams: number): { [key: number]: string[] } => {
    if (!playerNames.length || numberOfTeams === 0) return {};
    
    const teams: { [key: number]: string[] } = {};
    
    // Initialize teams
    for (let i = 1; i <= numberOfTeams; i++) {
      teams[i] = [];
    }
    
    // Group players by their team number prefix
    playerNames.forEach(playerName => {
      const teamNumber = teamService.getPlayerTeamNumber(playerName);
      if (teamNumber > 0 && teamNumber <= numberOfTeams) {
        const displayName = teamService.getDisplayPlayerName(playerName);
        teams[teamNumber].push(displayName);
      }
    });
    
    return teams;
  },

  parseTeamAssignments: (teamAssignmentsJson: string): { [key: number]: string[] } => {
    try {
      return JSON.parse(teamAssignmentsJson) || {};
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

// Fases Management Helper Functions
export const faseService = {
  // Parse headings JSON from PocketBase
  parseHeadings: (headingsJson: string): Record<string, { heading: string; image?: string }> => {
    try {
      return JSON.parse(headingsJson) || {};
    } catch {
      return {};
    }
  },

  // Get heading text for current fase
  getCurrentHeading: (headingsJson: string, currentFase: string): string => {
    const headings = faseService.parseHeadings(headingsJson);
    return headings[currentFase]?.heading || 'In welk team zit je?';
  },

  // Convert "/n" to line breaks for display
  formatHeadingText: (headingText: string): string[] => {
    return headingText.split('/n').map(line => line.trim());
  },

  // Get image path for current fase
  getCurrentImage: (headingsJson: string, currentFase: string): string | null => {
    const headings = faseService.parseHeadings(headingsJson);
    return headings[currentFase]?.image || null;
  },

  // Validate fase format (XX/YY)
  isValidFaseFormat: (fase: string): boolean => {
    const regex = /^\d{2}\/\d{2}$/;
    return regex.test(fase);
  },

  // Navigate to next fase variant (01/00 → 01/01)
  getNextVariant: (currentFase: string): string => {
    if (!faseService.isValidFaseFormat(currentFase)) return '01/00';
    
    const [phase, variant] = currentFase.split('/').map(Number);
    const nextVariant = variant + 1;
    return `${phase.toString().padStart(2, '0')}/${nextVariant.toString().padStart(2, '0')}`;
  },

  // Navigate to next phase (01/XX → 02/00)
  getNextPhase: (currentFase: string): string => {
    if (!faseService.isValidFaseFormat(currentFase)) return '01/00';
    
    const [phase] = currentFase.split('/').map(Number);
    const nextPhase = phase + 1;
    return `${nextPhase.toString().padStart(2, '0')}/00`;
  },

  // Create default headings JSON for a new session
  createDefaultHeadings: (): string => {
    const defaultHeadings = {
      '01/00': {
        heading: 'In welk team zit je?',
        image: null
      },
      '01/01': {
        heading: 'Klaar voor de/neerste vraag?',
        image: null
      },
      '02/00': {
        heading: 'Tijd voor/nronde 2!',
        image: null
      }
    };
    return JSON.stringify(defaultHeadings);
  }
};
