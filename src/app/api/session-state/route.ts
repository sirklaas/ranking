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
      const records = await pb.collection('ranking').getList(1, 1, { sort: '-updated', $autoCancel: false });
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
    const { id, data } = body as { id: string; data: Record<string, unknown> };

    if (!id || !data) {
      return NextResponse.json({ error: 'Missing id or data' }, { status: 400 });
    }

    const pb = await getServerPocketBase();
    const updated = await pb.collection('ranking').update(id, data, { $autoCancel: false });

    // Invalidate cache so next GET returns fresh data immediately
    cachedSession = null;

    return NextResponse.json({ success: true, session: updated });
  } catch (error) {
    console.error('[session-state] PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
