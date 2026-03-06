import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';
import { Top3State, Top3Vote, Top3Result } from '@/modules/top3/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// In-memory queue backoff
type VoteRequest = {
    sessionId: string;
    voterId: string;
    voterName: string;
    teamNumber: number;
    chosenPlayerId: string;
    chosenPlayerName: string;
    resolve: (res: Top3State) => void;
    reject: (err: Error) => void;
};

const voteQueue: VoteRequest[] = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || voteQueue.length === 0) return;
    isProcessing = true;

    const currentReq = voteQueue.shift();
    if (!currentReq) {
        isProcessing = false;
        return;
    }

    try {
        const pb = await getServerPocketBase();
        if (!pb) throw new Error('PocketBase not initialized on server');

        // 1. Fetch current session
        const session = await pb.collection('ranking').getOne(currentReq.sessionId);
        let top3State: Top3State | null = null;

        // Read from top-level top3_state field (NOT from headings)
        if (session.top3_state) {
            top3State = typeof session.top3_state === 'string' ? JSON.parse(session.top3_state) : session.top3_state;
        }

        if (!top3State) {
            throw new Error('Top3 state not initialized in session');
        }

        // 2. Validate vote (has player already voted in the current question)?
        const alreadyVoted = top3State?.currentQuestion?.votes?.some(
            (v) => v.voterId === currentReq.voterId
        ) || false;

        let newState = top3State;

        if (!alreadyVoted && top3State) {
            // 3. Mutate
            const newVote: Top3Vote = {
                voterId: currentReq.voterId,
                voterName: currentReq.voterName,
                teamNumber: currentReq.teamNumber,
                chosenPlayerId: currentReq.chosenPlayerId,
                chosenPlayerName: currentReq.chosenPlayerName,
                timestamp: Date.now(),
            };

            const existingVotes = top3State?.currentQuestion?.votes || [];

            newState = {
                ...top3State,
                currentQuestion: {
                    ...(top3State?.currentQuestion || { phase: 'intro', questionIndex: 0, results: [] }),
                    votes: [...existingVotes, newVote],
                },
            };

            // 4. Save back to top-level top3_state field
            await pb.collection('ranking').update(currentReq.sessionId, {
                top3_state: JSON.stringify(newState)
            });
        }

        // 5. Respond
        currentReq.resolve(newState);

    } catch (error) {
        console.error('[Top3 Vote API Queue Error]', error);
        currentReq.reject(error as Error);
    } finally {
        isProcessing = false;
        // Process next item continuously
        processQueue();
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { sessionId, voterId, voterName, teamNumber, chosenPlayerId, chosenPlayerName } = body;

        if (!sessionId || !voterId || !chosenPlayerId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Wrap the request in a Promise matching our Queue structure
        const newState = await new Promise<Top3State>((resolve, reject) => {
            voteQueue.push({
                sessionId,
                voterId,
                voterName,
                teamNumber,
                chosenPlayerId,
                chosenPlayerName,
                resolve,
                reject,
            });
            processQueue();
        });

        return NextResponse.json({ success: true, state: newState });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to process vote' }, { status: 500 });
    }
}
