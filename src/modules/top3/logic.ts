import { Top3State, Top3Phase, Top3Vote, Top3Result, Top3QuestionState } from './types';
import { rankingService } from '@/lib/pocketbase';

const createEmptyQuestion = (questionIndex: number): Top3QuestionState => ({
  questionIndex,
  phase: 'intro',
  votes: [],
  results: [],
});

export const getInitialState = (allPlayerNames: string[] = []): Top3State => ({
  currentFase: '',
  currentQuestion: createEmptyQuestion(0),
  allPlayerNames,
});

// Persist state to PocketBase
export const persistState = async (sessionId: string, state: Top3State): Promise<void> => {
  await rankingService.updateSession(sessionId, {
    top3_state: JSON.stringify(state),
  });
};

export const startVoting = async (
  sessionId: string,
  currentState: Top3State
): Promise<Top3State> => {
  // Always fetch fresh state to prevent race conditions
  let freshState = currentState;
  try {
    const session = await rankingService.getSessionById(sessionId) as Record<string, unknown>;
    if (session?.top3_state) {
      freshState = typeof session.top3_state === 'string' ? JSON.parse(session.top3_state as string) : session.top3_state as Top3State;
    }
  } catch (e) { console.warn('[top3] startVoting fresh fetch error:', e); }

  const newState: Top3State = {
    ...freshState,
    currentQuestion: {
      ...freshState.currentQuestion,
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
  try {
    const res = await fetch('/api/top3-vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        voterId,
        voterName,
        teamNumber,
        chosenPlayerId,
        chosenPlayerName
      })
    });

    if (!res.ok) {
      console.warn('Failed to submit vote via queue API. Falling back to optimistic state.');
      return currentState;
    }

    const data = await res.json();
    return data.state;
  } catch (err) {
    console.error('Error submitting vote:', err);
    return currentState;
  }
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

  const top3 = sorted.slice(0, 3);
  const otherVotes = sorted.slice(3).reduce((sum, item) => sum + item.votes, 0);

  if (otherVotes > 0) {
    top3.push({
      playerName: 'Overige spelers',
      votes: otherVotes,
      percentage: totalVotes > 0 ? Math.round((otherVotes / totalVotes) * 100) : 0,
    });
  }

  return top3;
};

// Show results (presenter triggers after all votes are in)
export const showResults = async (
  sessionId: string,
  currentState: Top3State
): Promise<Top3State> => {
  let freshState = currentState;
  try {
    const session = await rankingService.getSessionById(sessionId) as Record<string, unknown>;
    if (session?.top3_state) {
      freshState = typeof session.top3_state === 'string' ? JSON.parse(session.top3_state as string) : session.top3_state as Top3State;
    }
  } catch (e) { console.warn('[top3] showResults fresh fetch error:', e); }

  const results = computeResults(freshState.currentQuestion.votes);

  const newState: Top3State = {
    ...freshState,
    currentQuestion: {
      ...freshState.currentQuestion,
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
  let freshState = currentState;
  try {
    const session = await rankingService.getSessionById(sessionId) as Record<string, unknown>;
    if (session?.top3_state) {
      freshState = typeof session.top3_state === 'string' ? JSON.parse(session.top3_state as string) : session.top3_state as Top3State;
    }
  } catch (e) { console.warn('[top3] nextQuestion fresh fetch error:', e); }

  const nextIndex = freshState.currentQuestion.questionIndex + 1;

  const newState: Top3State = {
    ...freshState,
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
