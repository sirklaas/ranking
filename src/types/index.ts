// PocketBase RecordModel compatibility
export interface PocketBaseRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}

// Ranking Session Types (based on existing PocketBase schema)
export interface RankingSession extends PocketBaseRecord {
  showname: string;
  city: string;
  nr_players: number;
  nr_teams: number;
  teamname: string;
  playernames: string; // comma-separated string
  photocircle: string; // URL for Photocircle app download
  team_assignments: string; // JSON string of team assignments {"1": ["player1", "player2"], "2": ["player3", "player4"]}
  headings: string; // JSON string for fase headings {"01/00": {"heading": "Text", "image": "pic.jpg"}}
  current_fase: string; // Current fase (e.g., "01/00")
}

// Parsed types for easier handling
export interface ParsedRankingSession extends Omit<RankingSession, 'playernames'> {
  playernames: string[]; // parsed array
}

export enum GameStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  REVEALING = 'revealing',
  COMPLETED = 'completed'
}

export enum GameType {
  RANKING = 'ranking',
  PREDICTION = 'prediction',
  CATEGORY = 'category'
}

export interface GameSettings {
  timeLimit: number; // in seconds
  maxPlayers: number;
  allowLateJoin: boolean;
  showRealTimeResults: boolean;
}

// Player Types
export interface Player {
  id: string;
  gameId: string;
  name?: string;
  sessionId: string;
  joinedAt: Date;
  isActive: boolean;
  hasSubmitted: boolean;
}

// Ranking Types
export interface RankingItem {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category?: string;
}

export interface PlayerRanking {
  playerId: string;
  gameId: string;
  rankings: RankingSubmission[];
  submittedAt: Date;
  score?: number;
}

export interface RankingSubmission {
  itemId: string;
  position: number;
}

// Results Types
export interface GameResults {
  gameId: string;
  totalPlayers: number;
  totalSubmissions: number;
  aggregatedRankings: AggregatedRanking[];
  playerScores: PlayerScore[];
  generatedAt: Date;
}

export interface AggregatedRanking {
  itemId: string;
  averagePosition: number;
  totalVotes: number;
  positionCounts: { [position: number]: number };
}

export interface PlayerScore {
  playerId: string;
  playerName?: string;
  score: number;
  rank: number;
}

// Chart Types
export interface ChartData {
  type: ChartType;
  data: Record<string, unknown>;
  options: ChartOptions;
}

export enum ChartType {
  WORD_CLOUD = 'wordcloud',
  DONUT = 'donut',
  BAR = 'bar',
  RANKING_BARS = 'ranking_bars'
}

export interface ChartOptions {
  title?: string;
  showAnimation: boolean;
  animationDuration: number;
  colors?: string[];
}

// Real-time Types
export interface GameUpdate {
  type: UpdateType;
  gameId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export enum UpdateType {
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  SUBMISSION_RECEIVED = 'submission_received',
  GAME_STATUS_CHANGED = 'game_status_changed',
  RESULTS_REVEALED = 'results_revealed'
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// PocketBase Types
export interface PocketBaseRecord {
  id: string;
  created: string;
  updated: string;
}

// Component Props Types
export interface PresenterDashboardProps {
  session?: RankingSession;
  players: Player[];
  onSessionStart: () => void;
  onSessionEnd: () => void;
  onRevealResults: () => void;
}

export interface PlayerInterfaceProps {
  session?: RankingSession;
  player?: Player;
  onJoinSession: (sessionId: string, name?: string) => void;
  onSubmitRanking: (rankings: RankingSubmission[]) => void;
}

export interface DisplayScreenProps {
  session?: RankingSession;
  results?: GameResults;
  chartData?: ChartData;
  showResults: boolean;
}

// Utility Types
export type GameCode = string; // 4-6 character code
export type PlayerId = string;
export type GameId = string;
