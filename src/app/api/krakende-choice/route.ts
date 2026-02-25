import { NextResponse } from 'next/server';
import * as krakendeLogic from '@/modules/krakende-karakters/logic';
import type { KrakendeState } from '@/modules/krakende-karakters/types';

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

        const lastState = await krakendeLogic.updateState(sessionId, (current) => {
            const isPositive = current.phase.includes('positive');
            let updatedSubmissions = [...current.submissions];
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

            return {
                ...current,
                submissions: updatedSubmissions
            };
        });

        return NextResponse.json({ success: true, state: lastState });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to process krakende choice' }, { status: 500 });
    }
}
