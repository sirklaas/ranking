export type Top3Phase = 'intro' | 'voting' | 'waiting' | 'results';

export interface Top3Vote {
  voterId: string;       // player who voted
  voterName: string;
  teamNumber: number;
  chosenPlayerId: string; // player they voted for
  chosenPlayerName: string;
  timestamp: number;
}

export interface Top3Result {
  playerName: string;
  votes: number;
  percentage: number;
}

export interface Top3QuestionState {
  questionIndex: number;       // which sub-fase (e.g. 10/05 → index 0, 10/06 → index 1, etc.)
  phase: Top3Phase;
  votes: Top3Vote[];
  results: Top3Result[];       // top 3 computed after voting closes
}

export interface Top3State {
  currentFase?: string;        // Tracks which slide key this state belongs to (for wiping logic)
  currentQuestion: Top3QuestionState;
  allPlayerNames: string[];    // all player names from session (for display + phone lists)
}
