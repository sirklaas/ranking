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

interface VoteLike {
  chosenPlayerName: string;
}

function computeTop3Results(votes: VoteLike[]) {
  const tally: Record<string, number> = {};
  votes.forEach((v) => {
    if (!v.chosenPlayerName) return;
    tally[v.chosenPlayerName] = (tally[v.chosenPlayerName] || 0) + 1;
  });

  const totalVotes = votes.length;
  const sorted = Object.entries(tally)
    .map(([playerName, voteCount]) => ({
      playerName,
      votes: voteCount,
      percentage: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
    }))
    .sort((a, b) => b.votes - a.votes);

  const top3 = sorted.slice(0, 3);
  const otherVotes = sorted.slice(3).reduce((sum, item) => sum + item.votes, 0);

  if (top3.length > 1 && top3[0].votes === top3[1].votes && top3[0].votes > 0) {
    top3[0].percentage += 1;
  }

  if (otherVotes > 0) {
    top3.push({
      playerName: 'Overige spelers',
      votes: otherVotes,
      percentage: totalVotes > 0 ? Math.round((otherVotes / totalVotes) * 100) : 0,
    });
  }

  return top3;
}

function computeTop10Results(votes: VoteLike[]) {
  const tally: Record<string, number> = {};
  votes.forEach((v) => {
    if (!v.chosenPlayerName) return;
    tally[v.chosenPlayerName] = (tally[v.chosenPlayerName] || 0) + 1;
  });

  const totalVotes = votes.length;
  const sorted = Object.entries(tally)
    .map(([playerName, voteCount]) => ({
      playerName,
      votes: voteCount,
      percentage: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
    }))
    .sort((a, b) => b.votes - a.votes);

  const top10 = sorted.slice(0, 10);
  const otherVotes = sorted.slice(10).reduce((sum, item) => sum + item.votes, 0);

  if (top10.length > 1 && top10[0].votes === top10[1].votes && top10[0].votes > 0) {
    top10[0].percentage += 1;
  }

  if (otherVotes > 0) {
    top10.push({
      playerName: 'Overige spelers',
      votes: otherVotes,
      percentage: totalVotes > 0 ? Math.round((otherVotes / totalVotes) * 100) : 0,
    });
  }

  return top10;
}

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
    }
    // Special handling for Top 3 questions (10/05..10/13): first Next shows results, second Next advances slide
    else if (currentFase.startsWith('10/') && currentFase !== '10/01') {
      let top3State: any = null;
      try {
        top3State = typeof record.top3_state === 'string'
          ? JSON.parse(record.top3_state)
          : record.top3_state;
      } catch {}

      const curPhase = top3State?.currentQuestion?.phase || 'voting';

      if (curPhase === 'voting') {
        // Calculate results and transition to 'results' phase! Do NOT change current_fase!
        const votes = top3State?.currentQuestion?.votes || [];
        const results = computeTop3Results(votes);
        const updatedTop3 = {
          ...(top3State || {}),
          currentFase,
          currentQuestion: {
            ...(top3State?.currentQuestion || {}),
            phase: 'results',
            results,
          }
        };
        updateData.top3_state = JSON.stringify(updatedTop3);
      } else {
        // In 'results' (or other non-voting) phase: advance to the next slide!
        const idx = ORDERED_FASES.indexOf(currentFase);
        const nextFase = (idx !== -1 && idx < ORDERED_FASES.length - 1)
          ? ORDERED_FASES[idx + 1]
          : currentFase;

        updateData.current_fase = nextFase;

        if (nextFase.startsWith('10/')) {
          const qIdx = parseInt(nextFase.split('/')[1] || '0', 10);
          updateData.top3_state = JSON.stringify({
            currentFase: nextFase,
            currentQuestion: { questionIndex: qIdx, phase: 'voting', votes: [], results: [] },
            allPlayerNames: top3State?.allPlayerNames || []
          });
        }
      }
    }
    // Special handling for Top 10 questions (17/05..17/14): first Next shows results, second Next advances slide
    else if (currentFase.startsWith('17/') && currentFase !== '17/01' && currentFase !== '17/02') {
      let top10State: any = null;
      try {
        top10State = typeof record.top10_state === 'string'
          ? JSON.parse(record.top10_state)
          : record.top10_state;
      } catch {}

      const curPhase = top10State?.currentQuestion?.phase || 'voting';

      if (curPhase === 'voting') {
        const votes = top10State?.currentQuestion?.votes || [];
        const results = computeTop10Results(votes);
        const updatedTop10 = {
          ...(top10State || {}),
          currentFase,
          currentQuestion: {
            ...(top10State?.currentQuestion || {}),
            phase: 'results',
            results,
          }
        };
        updateData.top10_state = JSON.stringify(updatedTop10);
      } else {
        const idx = ORDERED_FASES.indexOf(currentFase);
        const nextFase = (idx !== -1 && idx < ORDERED_FASES.length - 1)
          ? ORDERED_FASES[idx + 1]
          : currentFase;

        updateData.current_fase = nextFase;

        if (nextFase.startsWith('17/')) {
          const qIdx = parseInt(nextFase.split('/')[1] || '0', 10);
          updateData.top10_state = JSON.stringify({
            currentFase: nextFase,
            currentQuestion: { questionIndex: qIdx, phase: 'voting', votes: [], results: [] },
            allPlayerNames: top10State?.allPlayerNames || []
          });
        }
      }
    }
    // Standard progression for other phases (01/*, 07/*, 10/01, 13/*, 17/01, 17/02)
    else {
      const idx = ORDERED_FASES.indexOf(currentFase);
      const nextFase = (idx !== -1 && idx < ORDERED_FASES.length - 1)
        ? ORDERED_FASES[idx + 1]
        : currentFase;

      updateData.current_fase = nextFase;

      // Initialize Top 3 state if entering 10/*
      if (nextFase.startsWith('10/')) {
        const qIdx = parseInt(nextFase.split('/')[1] || '0', 10);
        const curPhase = nextFase === '10/01' ? 'intro' : 'voting';
        updateData.top3_state = JSON.stringify({
          currentFase: nextFase,
          currentQuestion: { questionIndex: qIdx, phase: curPhase, votes: [], results: [] }
        });
      }

      // Initialize Top 10 state if entering 17/*
      if (nextFase.startsWith('17/')) {
        const qIdx = parseInt(nextFase.split('/')[1] || '0', 10);
        const curPhase = (nextFase === '17/01' || nextFase === '17/02') ? 'intro' : 'voting';
        updateData.top10_state = JSON.stringify({
          currentFase: nextFase,
          currentQuestion: { questionIndex: qIdx, phase: curPhase, votes: [], results: [] }
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
    // If in results phase for Top 3, revert back to voting phase!
    if (currentFase.startsWith('10/') && currentFase !== '10/01') {
      let top3State: any = null;
      try {
        top3State = typeof record.top3_state === 'string'
          ? JSON.parse(record.top3_state)
          : record.top3_state;
      } catch {}

      if (top3State?.currentQuestion?.phase === 'results') {
        const updatedTop3 = {
          ...(top3State || {}),
          currentQuestion: {
            ...(top3State?.currentQuestion || {}),
            phase: 'voting',
          }
        };
        updateData.top3_state = JSON.stringify(updatedTop3);
      } else {
        const idx = ORDERED_FASES.indexOf(currentFase);
        const prevFase = (idx > 0) ? ORDERED_FASES[idx - 1] : currentFase;
        updateData.current_fase = prevFase;
      }
    }
    // If in results phase for Top 10, revert back to voting phase!
    else if (currentFase.startsWith('17/') && currentFase !== '17/01' && currentFase !== '17/02') {
      let top10State: any = null;
      try {
        top10State = typeof record.top10_state === 'string'
          ? JSON.parse(record.top10_state)
          : record.top10_state;
      } catch {}

      if (top10State?.currentQuestion?.phase === 'results') {
        const updatedTop10 = {
          ...(top10State || {}),
          currentQuestion: {
            ...(top10State?.currentQuestion || {}),
            phase: 'voting',
          }
        };
        updateData.top10_state = JSON.stringify(updatedTop10);
      } else {
        const idx = ORDERED_FASES.indexOf(currentFase);
        const prevFase = (idx > 0) ? ORDERED_FASES[idx - 1] : currentFase;
        updateData.current_fase = prevFase;
      }
    } else {
      const idx = ORDERED_FASES.indexOf(currentFase);
      const prevFase = (idx > 0) ? ORDERED_FASES[idx - 1] : currentFase;
      updateData.current_fase = prevFase;
    }
  }

  const updated = await pb.collection('ranking').update(record.id, updateData, { $autoCancel: false });

  console.log(`[remote] Action: ${action} | From: ${currentFase} -> To: ${updateData.current_fase || currentFase} | Phase update: ${!!(updateData.top3_state || updateData.top10_state)}`);

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
