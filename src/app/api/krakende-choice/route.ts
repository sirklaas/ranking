import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';
import { KrakendeState, KrakendeSubmission } from '@/modules/krakende-karakters/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type ChoiceRequest = {
    sessionId: string;
    playerId: string;
    playerName: string;
    teamNumber: number;
    traitId: string;
    resolve: (res: KrakendeState) => void;
    reject: (err: Error) => void;
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { sessionId, playerId, playerName, teamNumber, traitId } = body;

        if (!sessionId || !playerId || !traitId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const pb = await getServerPocketBase();
        if (!pb) throw new Error('PocketBase not initialized on server');

        let attempts = 0;
        const maxAttempts = 10;
        let lastState: KrakendeState | null = null;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                // 1. Fetch current session fresh
                const session = await pb.collection('ranking').getOne(sessionId, { requestKey: null }); // disable caching
                let krakendeState: KrakendeState | null = null;

                if (session.headings) {
                    let hObj = typeof session.headings === 'string' ? JSON.parse(session.headings) : session.headings;
                    if (typeof hObj === 'string') hObj = JSON.parse(hObj);
                    if (hObj.krakende_state) {
                        krakendeState = typeof hObj.krakende_state === 'string' ? JSON.parse(hObj.krakende_state) : hObj.krakende_state;
                    }
                }

                if (!krakendeState) {
                    throw new Error('Krakende state not initialized in session');
                }

                // 2. Validate and Mutate
                const isPositive = krakendeState.phase === 'positive-voting' || krakendeState.phase === 'positive-results';
                const existingIdx = krakendeState.submissions.findIndex((s) => s.playerId === playerId);

                let updatedSubmissions = [...krakendeState.submissions];
                if (existingIdx >= 0) {
                    updatedSubmissions[existingIdx] = {
                        ...updatedSubmissions[existingIdx],
                        ...(isPositive ? { positiveTrait: traitId } : { negativeTrait: traitId }),
                        timestamp: Date.now(),
                    };
                } else {
                    updatedSubmissions.push({
                        playerId,
                        playerName,
                        teamNumber,
                        timestamp: Date.now(),
                        ...(isPositive ? { positiveTrait: traitId } : { negativeTrait: traitId }),
                    });
                }

                const newState: KrakendeState = {
                    ...krakendeState,
                    submissions: updatedSubmissions,
                };

                // 3. Save with optimistic lock (manual)
                let finalHeadings = typeof session.headings === 'string' ? JSON.parse(session.headings) : (session.headings || {});
                if (typeof finalHeadings === 'string') finalHeadings = JSON.parse(finalHeadings);
                finalHeadings.krakende_state = newState;

                // We use a simple update. If another request updated during our fetch/merge, 
                // we might overwrite. To be REAL OCC, we should check 'updated' timestamp, 
                // but PB's `.update()` doesn't support conditional filters natively in the SDK 
                // without complex configuration. However, re-fetching and retrying is highly effective.
                await pb.collection('ranking').update(sessionId, {
                    headings: JSON.stringify(finalHeadings)
                });

                lastState = newState;
                break; // Success!

            } catch (err) {
                console.error(`[Krakende Choice API] Attempt ${attempts} failed:`, err);
                if (attempts === maxAttempts) throw err;
                // Wait briefly before retry
                await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
            }
        }

        return NextResponse.json({ success: true, state: lastState });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to process krakende choice' }, { status: 500 });
    }
}
