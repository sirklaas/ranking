import PocketBase from 'pocketbase';

let pbClient: PocketBase | null = null;
let motherfileRecordId: string | null = null;
function resolvePocketBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_PB_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL;
  if (envUrl && !envUrl.includes('pinkmilk.pockethost.io')) {
    return envUrl;
  }
  return (typeof window !== 'undefined' && window.location?.protocol === 'https:')
    ? 'https://pb.pinkmilk.eu'
    : 'http://127.0.0.1:8090';
}

// Client-side only - no build-time PocketBase dependency
export function getPocketBase(): PocketBase | null {
  if (typeof window === 'undefined') return null;
  if (!pbClient) {
    pbClient = new PocketBase(resolvePocketBaseUrl());
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

    let clean = fileName.trim();
    if (clean.startsWith('/')) return clean;

    const aliasMap: Record<string, string> = {
      'teamnaam': 'RankingNaam.mp4',
      'teamyell': 'RankingKreet.mp4',
      'selfie': 'RankingSelfie.mp4',
      'trailerzit': 'trailercreepy.m4v',
      'trailerzitten': 'trailercreepy.m4v',
      'trailertop3': 'trailercreepy.m4v',
      'trailerkrakende': 'trailercreepy.m4v',
      'trailertop10': 'trailercreepy.m4v',
      'trailerfinale': 'trailercreepy.m4v',
      'super': 'RankingSuperfoods.m4v',
      'flirt': 'RankingFlirt.m4v',
      'houseparty': 'RankingHouseparty.m4v',
      'socials': 'RankingSocials.m4v',
      'kleding': 'RankingKleding.m4v',
      'all-in': 'All-In.m4v',
      'sauna': 'RankingSauna.m4v',
      'collega': 'RankingCollega.m4v',
      'billen': 'RankingBillen.m4v',
      'gat': 'RankingGat.m4v',
      'teveel': 'RankingDrink.m4v',
      // Legacy to Halloween mappings:
      'verliefd': 'dracula.webp',
      'verliefd.webp': 'dracula.webp',
      'schoonzoon': 'frankenstein.webp',
      'schoonzoon.webp': 'frankenstein.webp',
      'andes': 'zombie.webp',
      'andes.webp': 'zombie.webp',
      'kinderen': 'witch.webp',
      'kinderen.webp': 'witch.webp',
      'crypto': 'mummy.webp',
      'crypto.webp': 'mummy.webp',
      'cry': 'skeleton.webp',
      'cry.webp': 'skeleton.webp',
      'only': 'werewolf.webp',
      'only.webp': 'werewolf.webp',
      'geheim': 'ghost.webp',
      'geheim.webp': 'ghost.webp',
      'parenclub': 'sinister-man.webp',
      'parenclub.webp': 'sinister-man.webp',
      'pukkel': 'hannibal.webp',
      'pukkel.webp': 'hannibal.webp',
      'right': 'always-right.webp',
      'right.webp': 'always-right.webp',
      'plaatje': 'photoshoot.webp',
      'plaatje.webp': 'photoshoot.webp',
      '40dagen': '40-days.webp',
      '40dagen.webp': '40-days.webp',
      'echt': 'trump-pumpkin.webp',
      'echt.webp': 'trump-pumpkin.webp',
      'selfie.webp': 'selfie-monster.webp',
      'socials.webp': 'socials-zombie.webp',
      'verlies': 'speeding-ticket.webp',
      'verlies.webp': 'speeding-ticket.webp',
      'end.m4v': 'trailercreepy.m4v',
      'end.webp': 'end_card_qr.webp',
      'bedriegelijk.webp': 'betoverd.jpeg',
      'beschermend.webp': 'elegant.jpeg',
      'creatief.webp': 'gentle.jpeg',
      'dapper.webp': 'muzikaal.jpeg',
      'doorzetter.webp': 'mystiek.jpeg',
      'sinister.webp': 'ondeugend.jpeg',
      'vreugdevol.webp': 'vrolijk.jpeg',
      'wreed.webp': 'wijs.jpeg',
    };

    if (aliasMap[clean.toLowerCase()]) {
      clean = aliasMap[clean.toLowerCase()];
    }

    const webpName = clean.replace(/\.(png|jpe?g)$/i, '.webp');
    const lower = webpName.toLowerCase();

    const top3HalloweenFiles = ['dracula.webp', 'einstein.webp', 'frankenstein.webp', 'ghost.webp', 'mummy.webp', 'sinister-man.webp', 'skeleton.webp', 'werewolf.webp', 'witch.webp', 'zombie.webp'];
    const top10HalloweenFiles = ['40-days.webp', 'always-right.webp', 'hannibal.webp', 'inlaw.webp', 'photoshoot.webp', 'selfie-monster.webp', 'socials-zombie.webp', 'speeding-ticket.webp', 'temptation.webp', 'trump-pumpkin.webp'];
    const endHalloweenFiles = ['betoverd.jpeg', 'betoverd.webp', 'elegant.jpeg', 'elegant.webp', 'gentle.jpeg', 'gentle.webp', 'muzikaal.jpeg', 'muzikaal.webp', 'mystiek.jpeg', 'mystiek.webp', 'ondeugend.jpeg', 'ondeugend.webp', 'vrolijk.jpeg', 'vrolijk.webp', 'wijs.jpeg', 'wijs.webp'];
    const trailers = ['trailerzitten.mp4', 'trailertop3.mp4', 'top3.mp4', 'krakendekarakters.mp4', 'top10.mp4', 'guiltypleasure.mp4', 'trailercreepy.m4v'];

    if (top3HalloweenFiles.includes(lower)) {
      return `/pics/Top3 Haloween/${webpName}`;
    }
    if (top10HalloweenFiles.includes(lower)) {
      return `/pics/Top10Haloween/${webpName}`;
    }
    if (endHalloweenFiles.includes(clean.toLowerCase())) {
      return `/pics/End Haloween/${clean}`;
    }
    if (trailers.includes(clean.toLowerCase())) {
      return `/pics/HaloweenTrailer/trailercreepy.m4v`;
    }

    const top3Files = ['andes.webp', 'crypto.webp', 'cry.webp', 'geheim.webp', 'kinderen.webp', 'only.webp', 'parenclub.webp', 'schoonzoon.webp', 'verliefd.webp'];
    const top10Files = ['40dagen.webp', 'echt.webp', 'plaatje.webp', 'pukkel.webp', 'right.webp', 'selfie.webp', 'socials.webp', 'verlies.webp'];
    const endFiles = ['end.m4v', 'end.webp', 'bedriegelijk.webp', 'beschermend.webp', 'creatief.webp', 'dapper.webp', 'doorzetter.webp', 'sinister.webp', 'vreugdevol.webp', 'wreed.webp'];

    if (top3Files.includes(lower)) {
      return `/pics/Top3/${webpName}`;
    }
    if (top10Files.includes(lower)) {
      return `/pics/Top10/${webpName}`;
    }
    if (endFiles.includes(lower)) {
      return `/pics/End/${clean}`;
    }
    if (trailers.includes(clean.toLowerCase())) {
      return `/pics/HaloweenTrailer/trailercreepy.m4v`;
    }

    return `/pics/${encodeURIComponent(clean)}`;
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
    // Try priority-based sort first; fall back if priority field doesn't exist yet
    try {
      return await pb.collection('ranking').getFullList({
        sort: '-priority,-updated',
        requestKey: null,
      });
    } catch {
      return await pb.collection('ranking').getFullList({
        sort: '-updated',
        requestKey: null,
      });
    }
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

    // Assign team numbers by prefixing names
    return playerNames.map((player, index) => {
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

  // Generate team assignments from player names (handles BOTH prefixed and unprefixed names)
  generateTeamAssignments: (playerNames: string[], numberOfTeams: number): { [key: number]: string[] } => {
    if (!playerNames.length || numberOfTeams === 0) return {};

    const teams: { [key: number]: string[] } = {};

    // Initialize teams
    for (let i = 1; i <= numberOfTeams; i++) {
      teams[i] = [];
    }

    const unprefixedPlayers: string[] = [];

    // First pass: Group players by explicit team prefix if they have one
    playerNames.forEach(playerName => {
      const explicitTeamNumber = teamService.getPlayerTeamNumber(playerName);
      if (explicitTeamNumber > 0 && explicitTeamNumber <= numberOfTeams) {
        const displayName = teamService.getDisplayPlayerName(playerName);
        teams[explicitTeamNumber].push(displayName);
      } else {
        // Player has no prefix (or invalid prefix), queue them for auto-distribution
        unprefixedPlayers.push(teamService.getDisplayPlayerName(playerName));
      }
    });

    // Second pass: Distribute unprefixed players sequentially to fill the rest of the teams
    if (unprefixedPlayers.length > 0) {
      const namesPerTeam = Math.ceil(unprefixedPlayers.length / numberOfTeams);
      unprefixedPlayers.forEach((playerName, index) => {
        const autoTeamNum = Math.floor(index / namesPerTeam) + 1;
        const finalTeamNum = Math.min(autoTeamNum, numberOfTeams);
        teams[finalTeamNum].push(playerName);
      });
    }

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
  '01/01': { heading: 'In welk team zit je?', image: null },
  '01/02': { heading: 'Wat is jouw naam?', image: '' },
  '01/03': { heading: 'Wat is jouw naam?', image: '' },
  '01/04': { heading: 'Wat wordt jullie Teamnaam?', image: 'RankingNaam.mp4' },
  '01/05': { heading: 'Wat wordt jullie Teamyell?', image: 'RankingKreet.mp4' },
  '01/06': { heading: 'Maak een selfie Video en zet die in de Photo App', image: 'RankingSelfie.mp4' },
  '01/07': { heading: 'Wie is jullie Teamleider?', image: '' },
  '02/00': { heading: 'Tijd voor\nronde 2!', image: null },
  '07/01': { heading: 'Blijf staan als je het eens /n bent met de volgende stelling:', image: 'trailercreepy.m4v' },
  '07/05': { heading: 'Superfoods /n Ik zweer erbij', image: 'RankingSuperfoods.m4v' },
  '07/06': { heading: 'Ik flirt soms /n om iets te krijgen', image: 'RankingFlirt.m4v' },
  '07/07': { heading: 'Houseparty /n Niks leukers dan', image: 'RankingHouseparty.m4v' },
  '07/08': { heading: 'Socials checken /n Het eerste wat ik doe', image: 'RankingSocials.m4v' },
  '07/09': { heading: 'Kleding /n Mijn hele salaris gaat op aan', image: 'RankingKleding.m4v' },
  '07/10': { heading: "In een 'all-in' /n Ik zweer bij een vakantie", image: 'All-In.m4v' },
  '07/11': { heading: 'Sauna /n Ik vind dat zo vies', image: 'RankingSauna.m4v' },
  '07/12': { heading: 'Met een collega /n Heb ik weleens wat gehad', image: 'RankingCollega.m4v' },
  '07/13': { heading: 'Billen /n Ik val echt op', image: 'RankingBillen.m4v' },
  '07/14': { heading: 'Gat in mijn hand /n Ik heb een enorm', image: 'RankingGat.m4v' },
  '07/15': { heading: 'Teveel /n Ik drink nooit', image: 'RankingDrink.m4v' },
  '10/01': { heading: 'De Top 3', image: 'trailercreepy.m4v' },
  '10/05': { heading: 'Wie wordt er echt heel erg snel verliefd', image: 'dracula.webp' },
  '10/06': { heading: 'Wie is de ideale schoon- zoon of zus?', image: 'frankenstein.webp' },
  '10/07': { heading: 'Je vliegtuig stort neer in de Andes. /n Wie eet je als eerste op ?', image: 'zombie.webp' },
  '10/08': { heading: 'Wie zou je absoluut niet op je kinderen laten passen?', image: 'witch.webp' },
  '10/09': { heading: "Wie heeft de meeste crypto's", image: 'mummy.webp' },
  '10/10': { heading: 'Wie komt het vaakst te laat?', image: 'skeleton.webp' },
  '10/11': { heading: 'Wie zou er als eerste een account aanmaken /n op OnlyFans?', image: 'werewolf.webp' },
  '10/12': { heading: 'Wie moet je zeker geen geheim vertellen?', image: 'ghost.webp' },
  '10/13': { heading: 'Wie zou je meenemen naar een parenclub?', image: 'sinister-man.webp' },
  '13/01': { heading: 'Krakende Karakters', image: 'trailercreepy.m4v' },
  '13/02': { heading: 'Hoe kom je hier doorheen?', image: '' },
  '13/03': { heading: 'Goede Geinige Eigenschappen', image: '' },
  '13/04': { heading: 'Resultaten Goede Eigenschappen', image: '' },
  '13/05': { heading: 'Geinige grappenmaker...', image: '' },
  '17/01': { heading: 'De Top 10', image: 'trailercreepy.m4v' },
  '17/02': { heading: 'Kies iemand uit een ander team!', image: '' },
  '17/05': { heading: 'Een pijnlijke pukkel op je bil waar je niet bij kan. /n Wie mag hem voor je uitknijpen?', image: 'hannibal.webp' },
  '17/06': { heading: 'Wie denkt dat ie altijd gelijk heeft?', image: 'always-right.webp' },
  '17/07': { heading: 'Wie zou meedoen [tegen betaling uiteraard] /n aan de naakte fotoshoot van het Perfecte Plaatje?', image: 'photoshoot.webp' },
  '17/08': { heading: 'Wie kan 40 dagen zonder sex?', image: '40-days.webp' },
  '17/09': { heading: 'Wie kan absoluut niet tegen kritiek?', image: 'trump-pumpkin.webp' },
  '17/10': { heading: 'Wie is het monsterlijke schoon-kind?', image: 'inlaw.webp' },
  '17/11': { heading: 'Wie maakt de allerlelijkste Selfies ?', image: 'selfie-monster.webp' },
  '17/12': { heading: 'Wie is het meest verslaafd aan Social Media?', image: 'socials-zombie.webp' },
  '17/13': { heading: 'Wie krijgt de meeste bekeuringen?', image: 'speeding-ticket.webp' },
  '17/14': { heading: 'Jullie doen mee met Temptation Island. /n Wie heeft als eerste iemand tusen de lakens?', image: 'temptation.webp' },
  '20/01': { heading: 'De Finale', image: 'trailercreepy.m4v' }
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
          'trailerzit': 'TrailerZitten.mp4',
          'trailertop3': 'TrailerTop3.mp4',
          'trailerkrakende': 'KrakendeKarakters.mp4',
          'trailertop10': 'Top10.mp4',
          'teamnaam': 'RankingNaam.mp4',
          'teamyell': 'RankingKreet.mp4',
          'selfie': 'RankingSelfie.mp4',
          'super': 'RankingSuperfoods.m4v',
          'flirt': 'RankingFlirt.m4v',
          'houseparty': 'RankingHouseparty.m4v',
          'socials': 'RankingSocials.m4v',
          'kleding': 'RankingKleding.m4v',
          'all-in': 'All-In.m4v',
          'sauna': 'RankingSauna.m4v',
          'collega': 'RankingCollega.m4v',
          'billen': 'RankingBillen.m4v',
          'gat': 'RankingGat.m4v',
          'teveel': 'RankingDrink.m4v',
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

  // Convert "/n" or "/N" to line breaks for display
  formatHeadingText: (headingText: string): string[] => {
    if (!headingText) return [];
    return headingText.split(/\/n/i).map(line => line.trim());
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
