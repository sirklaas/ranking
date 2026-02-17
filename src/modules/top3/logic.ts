import { Top3State, Top3Phase, Top3Vote, Top3Result, Top3QuestionState } from './types';
import { rankingService } from '@/lib/pocketbase';

const createEmptyQuestion = (questionIndex: number): Top3QuestionState => ({
  questionIndex,
  phase: 'intro',
  votes: [],
  results: [],
});

export const getInitialState = (allPlayerNames: string[] = []): Top3State => ({
  currentQuestion: createEmptyQuestion(0),
  allPlayerNames,
});

// Persist state to PocketBase
const persistState = async (sessionId: string, state: Top3State): Promise<void> => {
  await rankingService.updateSession(sessionId, {
    top3_state: JSON.stringify(state),
  });
};

// Start voting phase (triggered by presenter pressing V)
export const startVoting = async (
  sessionId: string,
  currentState: Top3State
): Promise<Top3State> => {
  const newState: Top3State = {
    ...currentState,
    currentQuestion: {
      ...currentState.currentQuestion,
      phase: 'voting',
      votes: [],
      results: [],
    },
  };
  await persistState(sessionId, newState);
  return newState;
};

// Player submits a vote
export const submitVote = async (
  sessionId: string,
  currentState: Top3State,
  voterId: string,
  voterName: string,
  teamNumber: number,
  chosenPlayerId: string,
  chosenPlayerName: string
): Promise<Top3State> => {
  // Prevent duplicate votes
  const alreadyVoted = currentState.currentQuestion.votes.some(
    (v) => v.voterId === voterId
  );
  if (alreadyVoted) return currentState;

  const newVote: Top3Vote = {
    voterId,
    voterName,
    teamNumber,
    chosenPlayerId,
    chosenPlayerName,
    timestamp: Date.now(),
  };

  const updatedVotes = [...currentState.currentQuestion.votes, newVote];

  const newState: Top3State = {
    ...currentState,
    currentQuestion: {
      ...currentState.currentQuestion,
      votes: updatedVotes,
    },
  };

  await persistState(sessionId, newState);
  return newState;
};

// Compute top 3 results from votes
export const computeResults = (votes: Top3Vote[]): Top3Result[] => {
  const tally: Record<string, number> = {};
  votes.forEach((v) => {
    tally[v.chosenPlayerName] = (tally[v.chosenPlayerName] || 0) + 1;
  });

  const totalVotes = votes.length;
  const sorted = Object.entries(tally)
    .map(([playerName, voteCount]) => ({
      playerName,
      votes: voteCount,
      percentage: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
    }))
    .sort((a, b) => b.votes - a.votes);

  return sorted.slice(0, 3);
};

// Show results (presenter triggers after all votes are in)
export const showResults = async (
  sessionId: string,
  currentState: Top3State
): Promise<Top3State> => {
  const results = computeResults(currentState.currentQuestion.votes);

  const newState: Top3State = {
    ...currentState,
    currentQuestion: {
      ...currentState.currentQuestion,
      phase: 'results',
      results,
    },
  };

  await persistState(sessionId, newState);
  return newState;
};

// Move to next question (presenter presses arrow right)
export const nextQuestion = async (
  sessionId: string,
  currentState: Top3State
): Promise<Top3State> => {
  const nextIndex = currentState.currentQuestion.questionIndex + 1;

  const newState: Top3State = {
    ...currentState,
    currentQuestion: createEmptyQuestion(nextIndex),
  };

  await persistState(sessionId, newState);
  return newState;
};

// Set phase explicitly
export const setPhase = async (
  sessionId: string,
  currentState: Top3State,
  phase: Top3Phase
): Promise<Top3State> => {
  const newState: Top3State = {
    ...currentState,
    currentQuestion: {
      ...currentState.currentQuestion,
      phase,
    },
  };

  await persistState(sessionId, newState);
  return newState;
};

// Update all player names (called when session loads)
export const setPlayerNames = async (
  sessionId: string,
  currentState: Top3State,
  allPlayerNames: string[]
): Promise<Top3State> => {
  const newState: Top3State = {
    ...currentState,
    allPlayerNames,
  };

  await persistState(sessionId, newState);
  return newState;
};

// Get voters who have already voted (for display: remove from name wall)
export const getVoterNames = (state: Top3State): string[] => {
  return state.currentQuestion.votes.map((v) => v.voterName);
};

// Check if a specific player has voted
export const hasPlayerVoted = (state: Top3State, playerId: string): boolean => {
  return state.currentQuestion.votes.some((v) => v.voterId === playerId);
};
