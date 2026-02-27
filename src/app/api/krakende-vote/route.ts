import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const COLLECTION = 'krakende_votes';

// ── Server-side cache (5s TTL) ──────────────────────────────────────────────
// Multiple clients (display, presenter) poll this route.
// Cache prevents each poll from hitting PocketBase.
const cache = new Map<string, { data: unknown[]; ts: number }>();
const CACHE_TTL = 5000; // 5 seconds

function getCached(key: string): unknown[] | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key: string, data: unknown[]) {
  cache.set(key, { data, ts: Date.now() });
}
function invalidateCache(sessionId: string) {
  for (const k of cache.keys()) {
    if (k.startsWith(sessionId)) cache.delete(k);
  }
}

/**
 * POST — submit or update a vote (upsert per player+session+fase).
 * Tries create first (1 PB call). Falls back to find+update on duplicate.
 */
export async function POST(req: Request) {
  try {
    const { sessionId, playerId, playerName, teamNumber, traitId, fase } = await req.json();

    if (!sessionId || !playerId || !traitId || !fase) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const pb = await getServerPocketBase();

    // Try create first (happy path = 1 PB call)
    try {
      const created = await pb.collection(COLLECTION).create({
        session_id: sessionId,
        player_id: playerId,
        player_name: playerName,
        team_number: teamNumber,
        trait_id: traitId,
        fase,
      }, { $autoCancel: false });
      invalidateCache(sessionId);
      return NextResponse.json({ success: true, vote: created });
    } catch {
      // Likely duplicate — find and update
    }

    // Fallback: find existing + update
    try {
      const existing = await pb.collection(COLLECTION).getFirstListItem(
        `session_id = "${sessionId}" && player_id = "${playerId}" && fase = "${fase}"`,
        { $autoCancel: false }
      );
      const updated = await pb.collection(COLLECTION).update(existing.id, {
        trait_id: traitId,
        player_name: playerName,
        team_number: teamNumber,
      }, { $autoCancel: false });
      invalidateCache(sessionId);
      return NextResponse.json({ success: true, vote: updated });
    } catch (error) {
      console.error('[krakende-vote] Upsert fallback error:', error);
      return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
    }
  } catch (error) {
    console.error('[krakende-vote] Error:', error);
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
  }
}

/**
 * GET — retrieve votes for a session (optionally filtered by fase).
 * Cached for 5s server-side to avoid hammering PocketBase.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    const fase = url.searchParams.get('fase');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const cacheKey = `${sessionId}:${fase || 'all'}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, votes: cached });
    }

    const pb = await getServerPocketBase();
    let filter = `session_id = "${sessionId}"`;
    if (fase) filter += ` && fase = "${fase}"`;

    const votes = await pb.collection(COLLECTION).getFullList({
      filter,
      $autoCancel: false,
    });

    setCache(cacheKey, votes);
    return NextResponse.json({ success: true, votes });
  } catch (error) {
    console.error('[krakende-vote] GET Error:', error);
    return NextResponse.json({ error: 'Failed to get votes' }, { status: 500 });
  }
}

/**
 * DELETE — clear all votes for a session (used on reset/start).
 * Deletes in small batches to avoid rate limits.
 */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const pb = await getServerPocketBase();
    const existing = await pb.collection(COLLECTION).getFullList({
      filter: `session_id = "${sessionId}"`,
      $autoCancel: false,
    });

    // Delete in batches of 5 with small delays to avoid rate limits
    for (let i = 0; i < existing.length; i += 5) {
      const batch = existing.slice(i, i + 5);
      await Promise.all(batch.map(v =>
        pb.collection(COLLECTION).delete(v.id, { $autoCancel: false }).catch(() => {})
      ));
      if (i + 5 < existing.length) await new Promise(r => setTimeout(r, 200));
    }

    invalidateCache(sessionId);
    return NextResponse.json({ success: true, deleted: existing.length });
  } catch (error) {
    console.error('[krakende-vote] DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to clear votes' }, { status: 500 });
  }
}
