import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const COLLECTION = 'zitten_votes';

// Fast in-memory tally cache (1s TTL)
const cache = new Map<string, { data: { red: number; blue: number; total: number }; ts: number }>();
const CACHE_TTL = 1000;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId') || url.searchParams.get('session_id');
    const fase = url.searchParams.get('fase');

    if (!sessionId || !fase) {
      return NextResponse.json({ error: 'Missing sessionId or fase' }, { status: 400 });
    }

    const cacheKey = `${sessionId}:${fase}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json({ success: true, ...cached.data });
    }

    const pb = await getServerPocketBase();
    const records = await pb.collection(COLLECTION).getFullList({
      filter: `session_id="${sessionId}" && fase="${fase}"`,
      $autoCancel: false,
    });

    let red = 0;
    let blue = 0;
    records.forEach((r) => {
      if (r.choice === 'red') red++;
      else if (r.choice === 'blue') blue++;
    });

    const result = { red, blue, total: records.length };
    cache.set(cacheKey, { data: result, ts: Date.now() });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[zitten-vote] GET error:', error);
    return NextResponse.json({ success: false, red: 0, blue: 0, total: 0 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, playerId, playerName, teamNumber, choice, fase } = body;

    if (!sessionId || !playerId || !choice || !fase) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const pb = await getServerPocketBase();

    // Check if player already voted in this session & fase
    try {
      const existing = await pb.collection(COLLECTION).getFirstListItem(
        `session_id="${sessionId}" && player_id="${playerId}" && fase="${fase}"`,
        { $autoCancel: false }
      );
      await pb.collection(COLLECTION).update(existing.id, {
        choice,
        team_nr: teamNumber,
        player_name: playerName,
      }, { $autoCancel: false });
    } catch {
      // First vote for this player on this fase
      await pb.collection(COLLECTION).create({
        session_id: sessionId,
        player_id: playerId,
        player_name: playerName,
        team_nr: teamNumber,
        choice,
        fase,
      }, { $autoCancel: false });
    }

    cache.delete(`${sessionId}:${fase}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[zitten-vote] POST error:', error);
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId') || url.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const pb = await getServerPocketBase();
    const records = await pb.collection(COLLECTION).getFullList({
      filter: `session_id="${sessionId}"`,
      $autoCancel: false,
    });

    for (const r of records) {
      await pb.collection(COLLECTION).delete(r.id, { $autoCancel: false }).catch(() => {});
    }

    for (const k of cache.keys()) {
      if (k.startsWith(sessionId)) cache.delete(k);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[zitten-vote] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
