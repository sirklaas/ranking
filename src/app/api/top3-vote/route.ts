import { NextResponse } from 'next/server';
import { updateState } from '@/modules/top3/logic';
import type { Top3Vote } from '@/modules/top3/types';

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

        const lastState = await updateState(sessionId, (current) => {
            const existingVotes = current?.currentQuestion?.votes || [];
            const alreadyVoted = existingVotes.some((v) => v.voterId === voterId);

            if (alreadyVoted || current?.currentQuestion?.phase !== 'voting') {
                return current;
            }

            const newVote: Top3Vote = {
                voterId,
                voterName,
                teamNumber,
                chosenPlayerId,
                chosenPlayerName,
                timestamp: Date.now(),
            };

            return {
                ...current,
                currentQuestion: {
                    ...(current?.currentQuestion || { phase: 'intro', questionIndex: 0, results: [] }),
                    votes: [...existingVotes, newVote],
                },
            };
        });

        return NextResponse.json({ success: true, state: lastState });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to process top3 vote' }, { status: 500 });
    }
}
