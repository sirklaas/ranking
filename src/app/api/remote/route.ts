import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const ORDERED_FASES = [
  '01/01', '01/02', '01/04', '01/05', '01/06', '01/07',
  '07/01', '07/05', '07/06', '07/07', '07/08', '07/09', '07/10', '07/11', '07/12', '07/13', '07/14', '07/15',
  '10/01', '10/05', '10/06', '10/07', '10/08', '10/09', '10/10', '10/11', '10/12', '10/13',
  '13/01', '13/02', '13/03', '13/04', '13/05',
  '17/01', '17/05', '17/06', '17/07', '17/08', '17/09', '17/10', '17/11', '17/12', '17/13', '17/14',
  '20/01'
];

async function handleRemoteAction(action: string, explicitSessionId?: string | null) {
  const pb = await getServerPocketBase();

  let record;
  if (explicitSessionId) {
    record = await pb.collection('ranking').getOne(explicitSessionId, { $autoCancel: false });
  } else {
    // 1. Try session with priority = 1
    let records;
    try {
      records = await pb.collection('ranking').getList(1, 1, { filter: 'priority = 1', sort: '-updated', $autoCancel: false });
    } catch {
      records = { items: [] };
    }
    if (!records.items.length) {
      records = await pb.collection('ranking').getList(1, 1, { sort: '-updated', $autoCancel: false });
    }
    record = records.items[0];
  }

  if (!record) {
    return NextResponse.json({ error: 'No active session found' }, { status: 404 });
  }

  const currentFase = (record.current_fase as string) || '01/01';
  const updateData: Record<string, unknown> = {};

  if (action === 'next') {
    // Special handling for Finale (20/01)
    if (currentFase === '20/01') {
      const curEndState = typeof record.endgame_state === 'string'
        ? JSON.parse(record.endgame_state)
        : (record.endgame_state as Record<string, unknown>) || {};

      const playbackState = curEndState.playbackState || 'grid';

      if (playbackState === 'trailer') {
        curEndState.playbackState = 'grid';
      } else if (playbackState === 'paused') {
        curEndState.playbackState = 'playing'; // Reveal!
      } else if (playbackState === 'playing' || playbackState === 'finished' || curEndState.selectedCard) {
        curEndState.playbackState = 'grid';
        curEndState.selectedCard = null;
      }
      updateData.endgame_state = curEndState;
    } else {
      const idx = ORDERED_FASES.indexOf(currentFase);
      const nextFase = (idx !== -1 && idx < ORDERED_FASES.length - 1)
        ? ORDERED_FASES[idx + 1]
        : currentFase;

      updateData.current_fase = nextFase;

      // Initialize Top 3 state if entering 10/*
      if (nextFase.startsWith('10/')) {
        const qIdx = parseInt(nextFase.split('/')[1] || '0', 10);
        updateData.top3_state = JSON.stringify({
          currentFase: nextFase,
          currentQuestion: { questionIndex: qIdx, phase: 'voting', votes: [], results: [] }
        });
      }

      // Initialize Top 10 state if entering 17/*
      if (nextFase.startsWith('17/')) {
        const qIdx = parseInt(nextFase.split('/')[1] || '0', 10);
        updateData.top10_state = JSON.stringify({
          currentFase: nextFase,
          currentQuestion: { questionIndex: qIdx, phase: 'voting', votes: [], results: [] }
        });
      }

      // Clear counter data if entering 07/*
      if (nextFase.startsWith('07/')) {
        try {
          const oldVotes = await pb.collection('zitten_votes').getFullList({
            filter: `session_id="${record.id}" && fase="${nextFase}"`,
            $autoCancel: false,
          });
          for (const v of oldVotes) {
            await pb.collection('zitten_votes').delete(v.id, { $autoCancel: false }).catch(() => {});
          }
        } catch {}
      }

      // Initialize finale if entering 20/01
      if (nextFase === '20/01') {
        const curEnd = (record.endgame_state as { usedCards?: string[] } | undefined);
        if (!curEnd?.usedCards?.length) {
          updateData.endgame_state = { selectedCard: null, playbackState: 'trailer', usedCards: [], teamSelections: {} };
        }
      }
    }
  } else if (action === 'prev') {
    const idx = ORDERED_FASES.indexOf(currentFase);
    const prevFase = (idx > 0) ? ORDERED_FASES[idx - 1] : currentFase;
    updateData.current_fase = prevFase;
  }

  const updated = await pb.collection('ranking').update(record.id, updateData, { $autoCancel: false });

  console.log(`[remote] Action: ${action} | From: ${currentFase} -> To: ${updateData.current_fase || currentFase}`);

  return NextResponse.json({
    success: true,
    action,
    from: currentFase,
    to: (updateData.current_fase as string) || currentFase,
    session: record.id,
    updatedAt: updated.updated
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'next';
    const sessionId = url.searchParams.get('sessionId') || url.searchParams.get('id');

    return await handleRemoteAction(action, sessionId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let action = 'next';
    let sessionId: string | null = null;

    try {
      const body = await req.json();
      if (body.action) action = body.action;
      if (body.sessionId || body.id) sessionId = body.sessionId || body.id;
    } catch {
      const url = new URL(req.url);
      action = url.searchParams.get('action') || 'next';
      sessionId = url.searchParams.get('sessionId') || url.searchParams.get('id');
    }

    return await handleRemoteAction(action, sessionId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
