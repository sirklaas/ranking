export type Top10Phase = 'intro' | 'voting' | 'waiting' | 'results';

export interface Top10Vote {
    voterId: string;
    voterName: string;
    teamNumber: number;
    chosenPlayerId: string;
    chosenPlayerName: string;
    timestamp: number;
}

export interface Top10Result {
    playerName: string;
    votes: number;
    percentage: number;
}

export interface Top10QuestionState {
    questionIndex: number;
    phase: Top10Phase;
    votes: Top10Vote[];
    results: Top10Result[];
}

export interface Top10State {
    currentFase?: string;
    currentQuestion: Top10QuestionState;
    allPlayerNames: string[];
}
