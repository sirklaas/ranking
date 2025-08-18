import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

const COLLECTION = 'weekplanner';

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

// Shape stored in PB for a single owner record (compatible with existing schema)
// { ownerId: string, data?: { weeks?: { [weekKey: string]: unknown } } }

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('owner') || searchParams.get('ownerId');
    const weekKey = searchParams.get('weekKey'); // e.g. 2025-W34
    if (!ownerId || !weekKey) return badRequest('Missing ownerId or weekKey');

    const pb = await getServerPocketBase();
    try {
      const rec = await pb.collection(COLLECTION).getFirstListItem(
        `ownerId = "${ownerId}"`
      );
      const container = (rec as unknown as { data?: { weeks?: Record<string, unknown> } }).data || {};
      const weeks = (container.weeks || {}) as Record<string, unknown>;
      const weekData = weeks[weekKey] ?? null;
      return NextResponse.json(
        { id: rec.id, week: weekData },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } catch {
      return NextResponse.json(
        { id: null, week: null },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ownerId: string | undefined = body?.ownerId;
    const weekKey: string | undefined = body?.weekKey; // e.g. 2025-W34
    const weekData = body?.weekData; // arbitrary payload for that week
    if (!ownerId || !weekKey || typeof weekData === 'undefined') {
      return badRequest('Missing ownerId, weekKey or weekData');
    }

    const pb = await getServerPocketBase();

    // Try find existing owner record
    let rec: { id: string; data?: { weeks?: Record<string, unknown> } } | null = null;
    try {
      rec = await pb.collection(COLLECTION).getFirstListItem(
        `ownerId = "${ownerId}"`
      );
    } catch {}

    if (rec) {
      const existingData = (rec.data || {}) as { weeks?: Record<string, unknown> };
      const existingWeeks = (existingData.weeks || {}) as Record<string, unknown>;
      const nextWeeks = { ...existingWeeks, [weekKey]: weekData } as Record<string, unknown>;
      const updated = await pb.collection(COLLECTION).update(rec.id, { data: { ...existingData, weeks: nextWeeks } });
      return NextResponse.json({ id: updated.id, week: nextWeeks[weekKey] });
    }

    const created = await pb.collection(COLLECTION).create({ ownerId, data: { weeks: { [weekKey]: weekData } } });
    return NextResponse.json({ id: created.id, week: weekData });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
