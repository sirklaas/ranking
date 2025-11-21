import { EliminationState, EliminationOption, EliminationSubmission } from '@/types';
import { rankingService } from '@/lib/pocketbase';

export const INITIAL_OPTIONS: EliminationOption[] = [
    { id: '1', label: 'Ariel', votes: 0, eliminated: false },
    { id: '2', label: 'Sage', votes: 0, eliminated: false },
    { id: '3', label: 'Omo', votes: 0, eliminated: false },
    { id: '4', label: 'Robijn', votes: 0, eliminated: false },
];

export const getInitialState = (): EliminationState => ({
    round: 1,
    options: INITIAL_OPTIONS,
    status: 'waiting',
    totalVotes: 0,
});

export const startVoting = async (sessionId: string, currentState: EliminationState) => {
    const newState: EliminationState = {
        ...currentState,
        status: 'voting',
        timerStart: Date.now(),
        timerDuration: 20,
        totalVotes: 0,
        options: currentState.options.map(o => ({ ...o, votes: 0 })) // Reset votes for new round? Or keep? Usually reset.
    };

    // In a real app, we'd clear the 'submissions' collection here too

    await rankingService.updateSession(sessionId, {
        elimination_state: JSON.stringify(newState)
    });

    return newState;
};

export const submitVote = async (sessionId: string, currentState: EliminationState, optionId: string, playerId: string) => {
    // 1. Fetch current session to get existing submissions
    const session = await rankingService.getSessionById(sessionId);
    const currentSubmissions = (session.submissions || []) as EliminationSubmission[];

    // 2. Check if player already voted in this round (optional but good)
    // For now, we just append. If we want to enforce one vote per round per player:
    // const hasVoted = currentSubmissions.some((s) => s.playerId === playerId && s.round === currentState.round);
    // if (hasVoted) return currentState;

    // 3. Append new submission
    const newSubmission: EliminationSubmission = {
        playerId,
        optionId,
        round: currentState.round,
        timestamp: Date.now()
    };
    const updatedSubmissions = [...currentSubmissions, newSubmission];

    // 4. Recalculate vote counts for elimination_state based on submissions for CURRENT ROUND
    // We filter submissions for the current round
    const roundSubmissions = updatedSubmissions.filter((s) => s.round === currentState.round);

    // Reset counts
    const optionsWithResetCounts = currentState.options.map(o => ({ ...o, votes: 0 }));

    // Tally votes
    roundSubmissions.forEach((s) => {
        const opt = optionsWithResetCounts.find(o => o.id === s.optionId);
        if (opt) {
            opt.votes++;
        }
    });

    const newState: EliminationState = {
        ...currentState,
        options: optionsWithResetCounts,
        totalVotes: roundSubmissions.length
    };

    // 5. Update PocketBase with BOTH submissions and elimination_state
    await rankingService.updateSession(sessionId, {
        submissions: updatedSubmissions, // Store as JSON array
        elimination_state: JSON.stringify(newState)
    });

    return newState;
};

export const showResults = async (sessionId: string, currentState: EliminationState) => {
    const newState: EliminationState = {
        ...currentState,
        status: 'results'
    };

    await rankingService.updateSession(sessionId, {
        elimination_state: JSON.stringify(newState)
    });

    return newState;
};

export const revealWinner = async (sessionId: string, currentState: EliminationState) => {
    const newState: EliminationState = {
        ...currentState,
        status: 'reveal'
    };

    await rankingService.updateSession(sessionId, {
        elimination_state: JSON.stringify(newState)
    });

    return newState;
};

export const nextRound = async (sessionId: string, currentState: EliminationState) => {
    // Determine winner (most votes)
    const sorted = [...currentState.options].sort((a, b) => b.votes - a.votes);
    const winner = sorted[0];

    // Eliminate winner (or loser? User said "The option that had most votes will now fill the whole screen... this option is not in the next round anymore")
    // So winner is eliminated from the list.

    const remainingOptions = currentState.options.filter(o => o.id !== winner.id);

    const newState: EliminationState = {
        round: currentState.round + 1,
        options: remainingOptions,
        status: 'waiting',
        totalVotes: 0
    };

    await rankingService.updateSession(sessionId, {
        elimination_state: JSON.stringify(newState)
    });

    return newState;
};
