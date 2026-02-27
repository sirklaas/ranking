import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const COLLECTION = 'krakende_votes';

/**
 * POST — submit or update a vote (upsert per player+session+fase).
 * Each vote is an independent INSERT/UPDATE — no read-modify-write on shared state.
 * Scales to 1000+ concurrent phones.
 */
export async function POST(req: Request) {
  try {
    const { sessionId, playerId, playerName, teamNumber, traitId, fase } = await req.json();

    if (!sessionId || !playerId || !traitId || !fase) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const pb = await getServerPocketBase();

    // Try to find existing vote for this player+session+fase
    let existing = null;
    try {
      existing = await pb.collection(COLLECTION).getFirstListItem(
        `session_id = "${sessionId}" && player_id = "${playerId}" && fase = "${fase}"`,
        { $autoCancel: false }
      );
    } catch {
      // Not found — will create new
    }

    if (existing) {
      // Update existing vote
      const updated = await pb.collection(COLLECTION).update(existing.id, {
        trait_id: traitId,
        player_name: playerName,
        team_number: teamNumber,
      }, { $autoCancel: false });
      return NextResponse.json({ success: true, vote: updated });
    } else {
      // Create new vote — simple INSERT, no conflicts
      const created = await pb.collection(COLLECTION).create({
        session_id: sessionId,
        player_id: playerId,
        player_name: playerName,
        team_number: teamNumber,
        trait_id: traitId,
        fase,
      }, { $autoCancel: false });
      return NextResponse.json({ success: true, vote: created });
    }
  } catch (error) {
    console.error('[krakende-vote] Error:', error);
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
  }
}

/**
 * GET — retrieve votes for a session (optionally filtered by fase).
 * Used by display and presenter to count votes.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    const fase = url.searchParams.get('fase');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const pb = await getServerPocketBase();
    let filter = `session_id = "${sessionId}"`;
    if (fase) filter += ` && fase = "${fase}"`;

    const votes = await pb.collection(COLLECTION).getFullList({
      filter,
      $autoCancel: false,
    });

    return NextResponse.json({ success: true, votes });
  } catch (error) {
    console.error('[krakende-vote] GET Error:', error);
    return NextResponse.json({ error: 'Failed to get votes' }, { status: 500 });
  }
}

/**
 * DELETE — clear all votes for a session (used on reset/start).
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

    // Delete all votes for this session
    await Promise.all(existing.map(v => pb.collection(COLLECTION).delete(v.id, { $autoCancel: false })));

    return NextResponse.json({ success: true, deleted: existing.length });
  } catch (error) {
    console.error('[krakende-vote] DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to clear votes' }, { status: 500 });
  }
}
