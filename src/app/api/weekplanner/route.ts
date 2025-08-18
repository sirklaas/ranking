import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

const COLLECTION = 'weekplanner';

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('owner') || searchParams.get('ownerId');
    const weekStart = searchParams.get('weekStart');
    if (!ownerId || !weekStart) return badRequest('Missing ownerId or weekStart');

    const pb = await getServerPocketBase();
    try {
      const rec = await pb.collection(COLLECTION).getFirstListItem(
        `ownerId = "${ownerId}" && weekStart = "${weekStart}"`
      );
      return NextResponse.json({ id: rec.id, data: rec.data }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return NextResponse.json({ id: null, data: null }, { headers: { 'Cache-Control': 'no-store' } });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ownerId: string | undefined = body?.ownerId;
    const weekStart: string | undefined = body?.weekStart;
    const data = body?.data;
    if (!ownerId || !weekStart || typeof data === 'undefined') {
      return badRequest('Missing ownerId, weekStart or data');
    }

    const pb = await getServerPocketBase();

    // Try find existing
    let rec: { id: string } | null = null;
    try {
      rec = await pb.collection(COLLECTION).getFirstListItem(
        `ownerId = "${ownerId}" && weekStart = "${weekStart}"`
      );
    } catch {}

    if (rec) {
      const updated = await pb.collection(COLLECTION).update(rec.id, { data });
      return NextResponse.json({ id: updated.id, data: updated.data });
    }

    const created = await pb.collection(COLLECTION).create({ ownerId, weekStart, data });
    return NextResponse.json({ id: created.id, data: created.data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
