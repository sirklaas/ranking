import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ── Server-side cache (3s TTL) ──────────────────────────────────────────────
// ALL clients (display, presenter, phones) poll this route instead of hitting PB directly.
// Only 1 PB call every 3 seconds regardless of how many clients there are.
let cachedSession: { data: Record<string, unknown>; ts: number; id: string } | null = null;
const CACHE_TTL = 1000;

/**
 * GET /api/session-state?id=<sessionId>
 * Returns full session record, cached server-side for 3s.
 * Eliminates ALL direct browser→PB calls.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Return cached if fresh
    if (cachedSession && cachedSession.id === sessionId && Date.now() - cachedSession.ts < CACHE_TTL) {
      return NextResponse.json({ success: true, session: cachedSession.data });
    }

    const pb = await getServerPocketBase();
    const record = await pb.collection('ranking').getOne(sessionId, { $autoCancel: false });

    cachedSession = { data: record as unknown as Record<string, unknown>, ts: Date.now(), id: sessionId };
    return NextResponse.json({ success: true, session: record });
  } catch (error) {
    console.error('[session-state] GET Error:', error);
    // Return stale cache on error (better than nothing)
    if (cachedSession) {
      return NextResponse.json({ success: true, session: cachedSession.data, stale: true });
    }
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}
