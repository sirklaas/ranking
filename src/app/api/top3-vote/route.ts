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
                const alreadyVoted = existingVotes.some((v) => v.voterId === voterId || (voterName && voterName !== 'Speler' && v.voterName === voterName));

                // If already voted or in results phase, bypass mutation
                if (alreadyVoted || top3State?.currentQuestion?.phase === 'results') {
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

                const expectedVotesCount = existingVotes.length + 1;

                const newState: Top3State = {
                    ...top3State,
                    currentQuestion: {
                        ...(top3State?.currentQuestion || { questionIndex: 0, results: [] }),
                        phase: 'voting',
                        votes: [...existingVotes, newVote],
                    },
                };

                await pb.collection('ranking').update(sessionId, {
                    top3_state: JSON.stringify(newState),
                }, { $autoCancel: false });

                // Post-write verification: ensure our vote was NOT overwritten by a concurrent write!
                const verifySession = await pb.collection('ranking').getOne(sessionId, { $autoCancel: false });
                const verifyState: Top3State = typeof verifySession.top3_state === 'string'
                    ? JSON.parse(verifySession.top3_state)
                    : verifySession.top3_state;

                const verifiedVotes = verifyState?.currentQuestion?.votes || [];
                const containsOurVote = verifiedVotes.some((v) => v.voterId === voterId || (voterName && voterName !== 'Speler' && v.voterName === voterName));

                if (!containsOurVote || verifiedVotes.length < expectedVotesCount) {
                    console.warn(`[top3-vote] Concurrent overwrite detected for voter ${voterId}. Retrying attempt ${i + 1}/${maxRetries}...`);
                    throw new Error('Concurrent vote write collision detected');
                }

                finalState = verifyState;
                break; // Exit retry loop on success
            } catch (err: any) {
                lastError = err;
                // Jittered backoff to prevent thundering herd
                await new Promise(r => setTimeout(r, 60 + Math.random() * 120));
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
