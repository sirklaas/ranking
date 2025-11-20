import { EliminationState, EliminationOption } from '@/types';
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

export const submitVote = async (sessionId: string, currentState: EliminationState, optionId: string) => {
    // Optimistic update
    const updatedOptions = currentState.options.map(opt =>
        opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
    );

    const newState: EliminationState = {
        ...currentState,
        options: updatedOptions,
        totalVotes: currentState.totalVotes + 1
    };

    // We don't save every single vote to the session JSON to avoid race conditions in this simple implementation.
    // Ideally, votes are individual records in a 'submissions' collection, and we aggregate them.
    // For this MVP, we'll assume the Presenter is the source of truth or we use a 'submissions' listener.
    // BUT, since the user asked NOT to use PB too intensively, we might rely on client-side aggregation or
    // a simple counter if concurrency isn't huge.
    // Let's try to save it for now, but debounced in a real scenario. 
    // Here we will just return the state for the client to handle or save.

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
