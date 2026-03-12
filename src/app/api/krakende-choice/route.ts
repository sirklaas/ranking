import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';
import type { KrakendeState } from '@/modules/krakende-karakters/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { sessionId, playerId, playerName, teamNumber, traitId } = body;

        if (!sessionId || !playerId || !traitId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const pb = await getServerPocketBase();
        if (!pb) throw new Error('PocketBase not initialized on server');

        const maxRetries = 10;
        let lastError: Error | null = null;
        let finalState: KrakendeState | null = null;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const session = await pb.collection('ranking').getOne(sessionId, { $autoCancel: false });
                let krakendeState: KrakendeState | null = null;
                
                if (session.krakende_state) {
                    krakendeState = typeof session.krakende_state === 'string'
                        ? JSON.parse(session.krakende_state)
                        : session.krakende_state;
                }

                if (!krakendeState) {
                    throw new Error('Krakende state not initialized');
                }

                const isPositive = krakendeState.phase.includes('positive');
                let updatedSubmissions = [...krakendeState.submissions];
                const existingIndex = updatedSubmissions.findIndex(s => s.playerId === playerId);

                if (existingIndex >= 0) {
                    updatedSubmissions[existingIndex] = {
                        ...updatedSubmissions[existingIndex],
                        playerName,
                        teamNumber,
                        [isPositive ? 'positiveTrait' : 'negativeTrait']: traitId,
                        timestamp: Date.now()
                    };
                } else {
                    updatedSubmissions.push({
                        playerId,
                        playerName,
                        teamNumber,
                        [isPositive ? 'positiveTrait' : 'negativeTrait']: traitId,
                        timestamp: Date.now()
                    });
                }

                const newState: KrakendeState = {
                    ...krakendeState,
                    submissions: updatedSubmissions
                };

                await pb.collection('ranking').update(sessionId, {
                    krakende_state: JSON.stringify(newState),
                }, { $autoCancel: false });

                finalState = newState;
                break; // Exit retry loop on success
            } catch (err: any) {
                lastError = err;
                await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
            }
        }

        if (!finalState) {
            throw lastError || new Error('Failed to update Krakende state after max retries');
        }

        return NextResponse.json({ success: true, state: finalState });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to process krakende choice' }, { status: 500 });
    }
}
