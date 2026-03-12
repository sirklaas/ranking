import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';
import type { Top3State, Top3Vote } from '@/modules/top3/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { sessionId, voterId, voterName, teamNumber, chosenPlayerId, chosenPlayerName } = body;

        if (!sessionId || !voterId || !chosenPlayerId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const pb = await getServerPocketBase();
        if (!pb) throw new Error('PocketBase not initialized on server');

        const maxRetries = 10;
        let lastError: Error | null = null;
        let finalState: Top3State | null = null;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const session = await pb.collection('ranking').getOne(sessionId, { $autoCancel: false });
                let top3State: Top3State | null = null;
                
                if (session.top3_state) {
                    top3State = typeof session.top3_state === 'string'
                        ? JSON.parse(session.top3_state)
                        : session.top3_state;
                }

                if (!top3State) {
                    throw new Error('Top3 state not initialized in session');
                }

                const existingVotes = top3State?.currentQuestion?.votes || [];
                const alreadyVoted = existingVotes.some((v) => v.voterId === voterId);

                // If already voted or not in voting phase, bypass mutation
                if (alreadyVoted || top3State?.currentQuestion?.phase !== 'voting') {
                    finalState = top3State;
                    break;
                }

                const newVote: Top3Vote = {
                    voterId,
                    voterName,
                    teamNumber,
                    chosenPlayerId,
                    chosenPlayerName,
                    timestamp: Date.now(),
                };

                const newState: Top3State = {
                    ...top3State,
                    currentQuestion: {
                        ...(top3State?.currentQuestion || { phase: 'intro', questionIndex: 0, results: [] }),
                        votes: [...existingVotes, newVote],
                    },
                };

                await pb.collection('ranking').update(sessionId, {
                    top3_state: JSON.stringify(newState),
                }, { $autoCancel: false });

                finalState = newState;
                break; // Exit retry loop on success
            } catch (err: any) {
                lastError = err;
                // Jittered backoff to prevent thundering herd
                await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
            }
        }

        if (!finalState) {
            throw lastError || new Error('Failed to update Top3 state after max retries');
        }

        return NextResponse.json({ success: true, state: finalState });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to process top3 vote' }, { status: 500 });
    }
}
