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
    const { id, data } = body as { id: string; data: Record<string, unknown> };

    if (!id || !data) {
      return NextResponse.json({ error: 'Missing id or data' }, { status: 400 });
    }

    console.log('[session-state] PATCH input:', id, JSON.stringify(data));

    const pb = await getServerPocketBase();
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
