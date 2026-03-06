import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';
import { Top10State, Top10Vote } from '@/modules/top10/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type VoteRequest = {
    sessionId: string;
    voterId: string;
    voterName: string;
    teamNumber: number;
    chosenPlayerId: string;
    chosenPlayerName: string;
    resolve: (res: Top10State) => void;
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
        let top10State: Top10State | null = null;

        // Read from top-level top10_state field (NOT from headings)
        if (session.top10_state) {
            top10State = typeof session.top10_state === 'string' ? JSON.parse(session.top10_state) : session.top10_state;
        }

        if (!top10State) {
            throw new Error('Top10 state not initialized in session');
        }

        // 2. Validate vote
        const alreadyVoted = top10State?.currentQuestion?.votes?.some(
            (v) => v.voterId === currentReq.voterId
        ) || false;

        let newState = top10State;

        if (!alreadyVoted && top10State) {
            // 3. Build the new vote
            const newVote: Top10Vote = {
                voterId: currentReq.voterId,
                voterName: currentReq.voterName,
                teamNumber: currentReq.teamNumber,
                chosenPlayerId: currentReq.chosenPlayerId,
                chosenPlayerName: currentReq.chosenPlayerName,
                timestamp: Date.now(),
            };

            // 4. Re-read latest state to avoid overwriting phase changes (e.g. results)
            const latestSession = await pb.collection('ranking').getOne(currentReq.sessionId, { $autoCancel: false });
            let latestState: Top10State | null = null;
            if (latestSession.top10_state) {
                latestState = typeof latestSession.top10_state === 'string' ? JSON.parse(latestSession.top10_state) : latestSession.top10_state;
            }

            // If phase moved past voting, don't overwrite — just return latest state
            if (latestState && latestState?.currentQuestion?.phase !== 'voting') {
                currentReq.resolve(latestState);
                isProcessing = false;
                processQueue();
                return;
            }

            // Merge vote into latest state (preserves concurrent changes)
            const baseState = latestState || top10State;
            const existingVotes = baseState?.currentQuestion?.votes || [];
            const stillNotVoted = !existingVotes.some((v) => v.voterId === currentReq.voterId);

            if (stillNotVoted) {
                newState = {
                    ...baseState,
                    currentQuestion: {
                        ...(baseState?.currentQuestion || { phase: 'intro', questionIndex: 0, results: [] }),
                        votes: [...existingVotes, newVote],
                    },
                };

                // 5. Save back to top-level top10_state field
                await pb.collection('ranking').update(currentReq.sessionId, {
                    top10_state: JSON.stringify(newState)
                });
            } else {
                newState = baseState;
            }
        }

        currentReq.resolve(newState);

    } catch (error) {
        console.error('[Top10 Vote API Queue Error]', error);
        currentReq.reject(error as Error);
    } finally {
        isProcessing = false;
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

        const newState = await new Promise<Top10State>((resolve, reject) => {
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
        return NextResponse.json({ error: 'Failed to process top10 vote' }, { status: 500 });
    }
}
