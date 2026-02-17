export type KrakendePhase = 'positive-voting' | 'negative-voting' | 'positive-results' | 'negative-results';

export type KrakendeLanguage = 'nl' | 'en';

export interface KrakendeTrait {
  id: string;
  nl: string;
  en: string;
}

export interface KrakendeSubmission {
  playerId: string;
  playerName: string;
  teamNumber: number;
  positiveTrait?: string; // trait id
  negativeTrait?: string; // trait id
  timestamp: number;
}

export interface KrakendeState {
  phase: KrakendePhase;
  language: KrakendeLanguage;
  positiveTraits: KrakendeTrait[];
  negativeTraits: KrakendeTrait[];
  submissions: KrakendeSubmission[];
  revealedIndex: number; // how many traits have been revealed on display (0-24)
}
