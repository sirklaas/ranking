import { Top10State, Top10Phase, Top10Vote, Top10Result, Top10QuestionState } from './types';
import { rankingService } from '@/lib/pocketbase';

const createEmptyQuestion = (questionIndex: number): Top10QuestionState => ({
    questionIndex,
    phase: 'intro',
    votes: [],
    results: [],
});

export const getInitialState = (allPlayerNames: string[] = []): Top10State => ({
    currentFase: '',
    currentQuestion: createEmptyQuestion(0),
    allPlayerNames,
});

// Persist state to PocketBase
export const persistState = async (sessionId: string, state: Top10State): Promise<void> => {
    await rankingService.updateSession(sessionId, {
        top10_state: JSON.stringify(state),
    });
};

// Start voting phase
export const startVoting = async (
    sessionId: string,
    currentState: Top10State
): Promise<Top10State> => {
    const newState: Top10State = {
        ...currentState,
        currentQuestion: {
            ...currentState.currentQuestion,
            phase: 'voting',
            votes: [],
            results: [],
        },
        allPlayerNames: currentState.allPlayerNames?.length > 0 ? currentState.allPlayerNames : [],
    };
    await persistState(sessionId, newState);
    return newState;
};

// Player submits a vote
export const submitVote = async (
    sessionId: string,
    currentState: Top10State,
    voterId: string,
    voterName: string,
    teamNumber: number,
    chosenPlayerId: string,
    chosenPlayerName: string
): Promise<Top10State> => {
    try {
        const res = await fetch('/api/top10-vote', {
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
            console.warn('Failed to submit top10 vote via queue. Falling back to optimistic state.');
            return currentState;
        }

        const data = await res.json();
        return data.state;
    } catch (err) {
        console.error('Error submitting top10 vote:', err);
        return currentState;
    }
};

// Compute top 10 results from votes
export const computeResults = (votes: Top10Vote[]): Top10Result[] => {
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

    return sorted.slice(0, 10);
};

// Show results
export const showResults = async (
    sessionId: string,
    currentState: Top10State
): Promise<Top10State> => {
    const results = computeResults(currentState?.currentQuestion?.votes || []);

    const newState: Top10State = {
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

// Move to next question
export const nextQuestion = async (
    sessionId: string,
    currentState: Top10State
): Promise<Top10State> => {
    const nextIndex = currentState.currentQuestion.questionIndex + 1;

    const newState: Top10State = {
        ...currentState,
        currentQuestion: createEmptyQuestion(nextIndex),
    };

    await persistState(sessionId, newState);
    return newState;
};

// Set phase explicitly
export const setPhase = async (
    sessionId: string,
    currentState: Top10State,
    phase: Top10Phase
): Promise<Top10State> => {
    const newState: Top10State = {
        ...currentState,
        currentQuestion: {
            ...currentState.currentQuestion,
            phase,
        },
    };

    await persistState(sessionId, newState);
    return newState;
};

// Update all player names
export const setPlayerNames = async (
    sessionId: string,
    currentState: Top10State,
    allPlayerNames: string[]
): Promise<Top10State> => {
    const newState: Top10State = {
        ...currentState,
        allPlayerNames,
    };

    await persistState(sessionId, newState);
    return newState;
};

// Get voters who have already voted
export const getVoterNames = (state: Top10State): string[] => {
    return state?.currentQuestion?.votes?.map((v) => v.voterName) || [];
};

// Check if a specific player has voted
export const hasPlayerVoted = (state: Top10State, playerId: string): boolean => {
    return state?.currentQuestion?.votes?.some((v) => v.voterId === playerId) || false;
};

// Get live tally (for real-time word cloud during voting)
export const getLiveTally = (state: Top10State): Top10Result[] => {
    const votes = state?.currentQuestion?.votes;
    if (!votes || votes.length === 0) return [];
    return computeResults(votes);
};
