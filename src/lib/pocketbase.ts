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
    // Resolve locally mapped directory (via public/pics)
    return `/pics/${encodeURIComponent(fileName)}`;
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
  },

  async getWeekById(id: string): Promise<WeekplannerRecord | null> {
    const pb = getPocketBase();
    if (!pb) throw new Error('PocketBase not available');
    try {
      const rec = await pb.collection(this.collection).getOne(id);
      return rec as unknown as WeekplannerRecord;
    } catch {
      return null;
    }
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

  // Subscribe to specific session updates
  async subscribeToSession(id: string, callback: (data: Record<string, unknown>) => void) {
    const pb = getPocketBase();
    if (!pb) throw new Error('PocketBase not available');
    return await pb.collection('ranking').subscribe(id, (e) => callback(e.record as Record<string, unknown>));
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

// Predefined Source of Truth for frontend configurations.
// Any keys missing from the database (or having an empty image) will seamlessly fall back to these default values.
export const DEFAULT_HEADINGS: Record<string, { heading: string; image?: string | null }> = {
  '01/00': { heading: 'In welk team zit je?', image: null },
  '01/01': { heading: 'Klaar voor de\neerste vraag?', image: null },
  '01/02': { heading: 'Heb je \'n PhotoCircle account?', image: '' },
  '01/03': { heading: 'Wat is jouw naam?', image: '' },
  '01/04': { heading: 'Wat wordt jullie Teamnaam?', image: 'RankingNaam.mp4' },
  '01/05': { heading: 'Wat wordt jullie Teamyell?', image: 'RankingKreet.mp4' },
  '01/06': { heading: 'Maak een Selfie Video', image: 'RankingSelfie.mp4' },
  '01/07': { heading: 'Wie is jullie Teamleider?', image: '' },
  '02/00': { heading: 'Tijd voor\nronde 2!', image: null },
  '04/01': { heading: 'Guilty Pleasures', image: 'GuiltyPleasure.mp4' },
  '04/02': { heading: 'Vul nu jouw "Guilty Pleasure" in', image: '' },
  '07/01': { heading: 'Blijf staan als je het eens bent', image: 'TrailerZitten.mp4' },
  '07/05': { heading: 'Superfoods Ik zweer erbij', image: 'RankingSuperfoods.m4v' },
  '07/06': { heading: 'Ik flirt soms Om iets te krijgen', image: 'RankingFlirt.m4v' },
  '07/07': { heading: 'Houseparty Niks leukers dan', image: 'RankingHouseparty.m4v' },
  '07/08': { heading: 'Socials checken Het eerste wat ik doe', image: 'RankingSocials.m4v' },
  '07/09': { heading: 'Kleding Mijn hele salaris gaat op aan', image: 'RankingKleding.m4v' },
  '07/10': { heading: 'In een \'all-in\' vakantie', image: 'All-In.m4v' },
  '07/11': { heading: 'Sauna Ik vindt dat zo vies', image: 'RankingSauna.m4v' },
  '07/12': { heading: 'Met een collega Heb ik weleens wat gehad', image: 'RankingCollega.m4v' },
  '07/13': { heading: 'Billen Ik val echt op', image: 'RankingBillen.m4v' },
  '07/14': { heading: 'Gat in mijn hand Ik heb een enorm', image: 'RankingGat.m4v' },
  '07/15': { heading: 'Teveel Ik drink nooit', image: 'RankingDrink.m4v' },
  '10/01': { heading: 'Kies iemand uit een ander team!', image: 'TrailerTop3.mp4' },
  '10/05': { heading: 'Wie wordt er heel snel verliefd', image: 'verliefd.jpeg' },
  '10/06': { heading: 'Wie is de ideale schoonzoon of zus?', image: 'schoonzoon.png' },
  '10/07': { heading: 'Vliegtuig neer in de Andes. Wie eet je eerst op?', image: 'andes.jpeg' },
  '10/08': { heading: 'Wie zou je niet op je kinderen laten passen?', image: 'kinderen.png' },
  '10/09': { heading: 'Wie heeft de meeste crypto\'s', image: 'crypto.png' },
  '10/10': { heading: 'Wie is de grootste aansteller op het werk?', image: 'cry.png' },
  '10/11': { heading: 'Wie maakt als eerste een OnlyFans account?', image: 'only.png' },
  '10/12': { heading: 'Wie vertrouw je diepste geheimen toe?', image: 'geheim.png' },
  '10/13': { heading: 'Wie neem je mee naar een parenclub?', image: 'parenclub.png' },
  '13/01': { heading: 'Krakende Karakters', image: 'KrakendeKarakters.mp4' },
  '13/02': { heading: 'Hoe kom je hier doorheen?', image: '' },
  '13/03': { heading: 'Goede Geinige Eigenschappen', image: '' },
  '13/04': { heading: 'Minder goede Eigenschappen', image: '' },
  '13/05': { heading: 'Resultaten Positief', image: '' },
  '13/06': { heading: 'Resultaten Negatief', image: '' },
  '17/01': { heading: 'De Top 10', image: 'Top10.mp4' },
  '17/02': { heading: 'Kies iemand uit een ander team!', image: '' },
  '17/05': { heading: 'Wie mag een pukkel op je bil uitknijpen?', image: 'pukkel.png' },
  '17/06': { heading: 'Wie denkt altijd gelijk te hebben?', image: 'right.png' },
  '17/07': { heading: 'Wie doet mee aan naakte fotoshoot?', image: 'plaatje.jpeg' },
  '17/08': { heading: 'Wie kan 40 dagen zonder sex?', image: '40dagen.png' },
  '17/09': { heading: 'Wie kan niet tegen verlies?', image: 'verlies.png' },
  '17/10': { heading: 'Wie laat weleens een wind?', image: 'echt.png' },
  '17/11': { heading: 'Wie maakt de lelijkste Selfies?', image: 'selfie.png' },
  '17/12': { heading: 'Wie is meest verslaafd aan Social Media?', image: 'socials.png' },
  '17/13': { heading: 'Wie heeft de grootste mond?', image: '' },
  '17/14': { heading: 'Wie is de grootste drama queen?', image: '' },
  '20/01': { heading: 'De Finale', image: 'end.m4v' }
};

// Fases Management Helper Functions
export const faseService = {
  // Parse DB headings and gracefully fall back to DEFAULT_HEADINGS if keys or images are empty
  parseHeadings: (headingsInput: string | Record<string, any>): Record<string, { heading: string; image?: string }> => {
    let rawDb: Record<string, any> = {};
    try {
      if (typeof headingsInput === 'object' && headingsInput !== null) {
        rawDb = headingsInput;
      } else {
        rawDb = JSON.parse(headingsInput as string) || {};
      }
    } catch {
      rawDb = {};
    }

    // Merge the static defaults with the database overrides
    const merged: Record<string, { heading: string; image?: string }> = {};

    // 1. Copy over all the defaults
    for (const [key, val] of Object.entries(DEFAULT_HEADINGS)) {
      merged[key] = { heading: val.heading, image: val.image || '' };
    }

    // 2. Override with DB values ONLY if they actually hold user alterations
    for (const [key, val] of Object.entries(rawDb)) {
      if (!val || typeof val !== 'object') continue;

      // If the DB has an entry, initialize if missing
      if (!merged[key]) {
        merged[key] = { heading: val.heading || '', image: val.image || '' };
        continue;
      }

      // Explicit overrides
      if (val.heading !== undefined) {
        merged[key].heading = val.heading;
      }
      // ONLY overwrite the default image if the DB explicitly gives a strictly non-empty string.
      // (This inherently fixes old databases where images were accidentally empty/broken strings)
      if (val.image !== undefined && typeof val.image === 'string') {
        let fixedImage = val.image.trim();

        // Recover explicit defaults that were saved without extensions
        const defaultImage = DEFAULT_HEADINGS[key]?.image;
        if (defaultImage && typeof defaultImage === 'string') {
          const dropExt = (f: string) => f.replace(/\.[^/.]+$/, '').toLowerCase();
          if (dropExt(fixedImage) === dropExt(defaultImage)) {
            fixedImage = defaultImage;
          }
        }

        // Auto-fix other specific legacy mapping names previously saved to DB
        const extraMappings: Record<string, string> = {
          'trailerzitten': 'TrailerZitten.mp4',
          'trailertop3': 'TrailerTop3.mp4',
          'trailerkrakende': 'KrakendeKarakters.mp4',
          'trailertop10': 'Top10.mp4'
        };
        if (extraMappings[fixedImage.toLowerCase()]) {
          fixedImage = extraMappings[fixedImage.toLowerCase()];
        }

        // If the user explicitly cleared it or provided a value, respect it.
        merged[key].image = fixedImage;
      }
    }

    return merged;
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

  // We no longer inject huge schemas into the DB cleanly
  createDefaultHeadings: (): string => {
    return '{}';
  }
};

// Krakende Karakters vote service — uses separate PB collection for scalability
export interface KrakendeVote {
  id?: string;
  session_id: string;
  player_id: string;
  player_name: string;
  team_number: number;
  trait_id: string;
  fase: string; // 'positive' or 'negative'
}

export const krakendeVoteService = {
  /** Submit a vote via API route (simple INSERT, no conflicts) */
  async submitVote(vote: Omit<KrakendeVote, 'id'>): Promise<boolean> {
    try {
      const res = await fetch('/api/krakende-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: vote.session_id,
          playerId: vote.player_id,
          playerName: vote.player_name,
          teamNumber: vote.team_number,
          traitId: vote.trait_id,
          fase: vote.fase,
        }),
      });
      return res.ok;
    } catch (e) {
      console.error('[krakendeVoteService] submitVote error:', e);
      return false;
    }
  },

  /** Get all votes for a session (optionally filtered by fase) */
  async getVotes(sessionId: string, fase?: string): Promise<KrakendeVote[]> {
    try {
      let url = `/api/krakende-vote?sessionId=${encodeURIComponent(sessionId)}`;
      if (fase) url += `&fase=${encodeURIComponent(fase)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.votes || [];
    } catch (e) {
      console.error('[krakendeVoteService] getVotes error:', e);
      return [];
    }
  },

  /** Clear all votes for a session (used on reset) */
  async clearVotes(sessionId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/krakende-vote?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (e) {
      console.error('[krakendeVoteService] clearVotes error:', e);
      return false;
    }
  },
};
