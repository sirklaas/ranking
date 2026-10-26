import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ── Server-side cache (1s TTL) ──────────────────────────────────────────────
let cachedSession: { data: Record<string, unknown>; ts: number; id: string; isLatest?: boolean } | null = null;
const CACHE_TTL = 1000;

/**
 * GET /api/session-state?id=<sessionId>
 * Returns full session record, cached server-side for 1s.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Return cached if fresh
    if (cachedSession && (cachedSession.id === sessionId || (sessionId === 'latest' && cachedSession.isLatest)) && Date.now() - cachedSession.ts < CACHE_TTL) {
      return NextResponse.json({ success: true, session: cachedSession.data });
    }

    const pb = await getServerPocketBase();
    let record;

    if (sessionId === 'latest') {
      // Priority-based: find the session with priority=1 first
      let records;
      try {
        records = await pb.collection('ranking').getList(1, 1, { filter: 'priority = 1', sort: '-updated', $autoCancel: false });
      } catch {
        // priority field may not exist yet — ignore
        records = { items: [] };
      }
      if (!records.items.length) {
        // Fallback: most recently updated
        records = await pb.collection('ranking').getList(1, 1, { sort: '-updated', $autoCancel: false });
      }
      record = records.items[0];
      if (!record) return NextResponse.json({ error: 'No active session' }, { status: 404 });
    } else {
      record = await pb.collection('ranking').getOne(sessionId, { $autoCancel: false });
    }

    cachedSession = {
      data: record as unknown as Record<string, unknown>,
      ts: Date.now(),
      id: record.id,
      isLatest: sessionId === 'latest'
    };
    return NextResponse.json({ success: true, session: record });
  } catch (error) {
    console.error('[session-state] GET Error:', error);
    if (cachedSession) {
      return NextResponse.json({ success: true, session: cachedSession.data, stale: true });
    }
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}

/**
 * PATCH /api/session-state
 * Body: { id: string, data: Record<string, unknown> }
 * Merges `data` into the session using server-side authenticated PocketBase.
 * Used for teamleader votes and other client-initiated writes that need auth.
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    let id = body.id;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const pb = await getServerPocketBase();

    if (id === 'latest') {
      let records;
      try {
        records = await pb.collection('ranking').getList(1, 1, { filter: 'priority = 1', sort: '-updated', $autoCancel: false });
      } catch {
        records = { items: [] };
      }
      if (!records.items.length) {
        records = await pb.collection('ranking').getList(1, 1, { sort: '-updated', $autoCancel: false });
      }
      if (!records.items[0]) {
        return NextResponse.json({ error: 'No active session' }, { status: 404 });
      }
      id = records.items[0].id;
    }

    // Specific action: A player claims/joins on their phone
    if (body.action === 'join_player' && body.playerName) {
      const current = await pb.collection('ranking').getOne(id, { $autoCancel: false });
      const existing: string[] = Array.isArray(current.joined_players)
        ? [...current.joined_players]
        : (typeof current.joined_players === 'object' && current.joined_players !== null
            ? Object.keys(current.joined_players)
            : []);

      if (!existing.includes(body.playerName)) {
        existing.push(body.playerName);
        const updated = await pb.collection('ranking').update(id, { joined_players: existing }, { $autoCancel: false });
        cachedSession = null;
        console.log(`[session-state] Player joined: "${body.playerName}", total joined: ${existing.length}`);
        return NextResponse.json({ success: true, session: updated });
      }
      return NextResponse.json({ success: true, session: current });
    }

    // Specific action: Reset all joined players and game data (e.g. on 01/01 / new run)
    if (body.action === 'reset_joined_players') {
      const resetPayload: Record<string, unknown> = {
        joined_players: [],
        teamleaders: {},
        top3_state: {},
        top10_state: {},
        krakende_state: {},
        endgame_state: { selectedCard: null, playbackState: 'grid', usedCards: [], teamSelections: {} },
        ...(body.data || {})
      };
      const updated = await pb.collection('ranking').update(id, resetPayload, { $autoCancel: false });
      cachedSession = null;
      console.log('[session-state] Reset game data (joined_players, teamleaders, module states)');
      return NextResponse.json({ success: true, session: updated });
    }

    const data = body.data as Record<string, unknown>;
    if (!data) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Automatically reset joined_players when entering 01/01
    if (data.current_fase === '01/01') {
      data.joined_players = [];
      data.teamleaders = {};
      data.endgame_state = { selectedCard: null, playbackState: 'grid', usedCards: [], teamSelections: {} };
    }

    console.log('[session-state] PATCH input:', id, JSON.stringify(data));

    const updated = await pb.collection('ranking').update(id, data, { $autoCancel: false });

    console.log('[session-state] PATCH updated teamleaders:', JSON.stringify((updated as Record<string, unknown>).teamleaders));

    // Verify: re-read to confirm PB persisted the change
    const verify = await pb.collection('ranking').getOne(id, { $autoCancel: false });
    console.log('[session-state] PATCH verify teamleaders:', JSON.stringify((verify as Record<string, unknown>).teamleaders));

    // Invalidate cache so next GET returns fresh data immediately
    cachedSession = null;

    return NextResponse.json({ success: true, session: verify });
  } catch (error) {
    console.error('[session-state] PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update session', detail: String(error) }, { status: 500 });
  }
}
