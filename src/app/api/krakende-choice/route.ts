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

const choiceQueue: ChoiceRequest[] = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || choiceQueue.length === 0) return;
    isProcessing = true;

    const currentReq = choiceQueue.shift();
    if (!currentReq) {
        isProcessing = false;
        return;
    }

    try {
        const pb = await getServerPocketBase();
        if (!pb) throw new Error('PocketBase not initialized on server');

        // 1. Fetch current session
        const session = await pb.collection('ranking').getOne(currentReq.sessionId);
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

        const existingIdx = krakendeState.submissions.findIndex(
            (s) => s.playerId === currentReq.playerId
        );

        let updatedSubmissions: KrakendeSubmission[];
        if (existingIdx >= 0) {
            updatedSubmissions = [...krakendeState.submissions];
            if (isPositive) {
                updatedSubmissions[existingIdx] = {
                    ...updatedSubmissions[existingIdx],
                    positiveTrait: currentReq.traitId,
                    timestamp: Date.now(),
                };
            } else {
                updatedSubmissions[existingIdx] = {
                    ...updatedSubmissions[existingIdx],
                    negativeTrait: currentReq.traitId,
                    timestamp: Date.now(),
                };
            }
        } else {
            const newSub: KrakendeSubmission = {
                playerId: currentReq.playerId,
                playerName: currentReq.playerName,
                teamNumber: currentReq.teamNumber,
                timestamp: Date.now(),
                ...(isPositive ? { positiveTrait: currentReq.traitId } : { negativeTrait: currentReq.traitId }),
            };
            updatedSubmissions = [...krakendeState.submissions, newSub];
        }

        const newState: KrakendeState = {
            ...krakendeState,
            submissions: updatedSubmissions,
        };

        // 3. Save securely
        let finalHeadings = typeof session.headings === 'string' ? JSON.parse(session.headings) : (session.headings || {});
        if (typeof finalHeadings === 'string') finalHeadings = JSON.parse(finalHeadings);
        finalHeadings.krakende_state = newState;

        await pb.collection('ranking').update(currentReq.sessionId, {
            headings: JSON.stringify(finalHeadings)
        });

        currentReq.resolve(newState);

    } catch (error) {
        console.error('[Krakende Choice API Queue Error]', error);
        currentReq.reject(error as Error);
    } finally {
        isProcessing = false;
        processQueue();
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { sessionId, playerId, playerName, teamNumber, traitId } = body;

        if (!sessionId || !playerId || !traitId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newState = await new Promise<KrakendeState>((resolve, reject) => {
            choiceQueue.push({
                sessionId,
                playerId,
                playerName,
                teamNumber,
                traitId,
                resolve,
                reject,
            });
            processQueue();
        });

        return NextResponse.json({ success: true, state: newState });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to process krakende choice' }, { status: 500 });
    }
}
