import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

const COLLECTION = 'weekplanner';

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

// Shape stored in PB for a single owner record
// { ownerId: string, data?: { tasks?: unknown[] } }
type PlannerData = { tasks?: unknown[] };
type PBRecord = { id: string; data?: PlannerData };

// Legacy week-based storage removed: we only store flat data.tasks now.

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('owner') || searchParams.get('ownerId');
    if (!ownerId) return badRequest('Missing ownerId');

    const pb = await getServerPocketBase();
    try {
      const rec = (await pb.collection(COLLECTION).getFirstListItem(
        `ownerId = "${ownerId}"`
      )) as PBRecord;
      const data: PlannerData = rec.data || {};
      const tasks: unknown[] = Array.isArray(data.tasks) ? (data.tasks as unknown[]) : [];
      return NextResponse.json(
        { id: rec.id, tasks },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } catch {
      return NextResponse.json(
        { id: null, tasks: [] },
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
    const tasks: unknown[] | undefined = body?.tasks;
    if (!ownerId || !Array.isArray(tasks)) {
      return badRequest('Missing ownerId or invalid tasks');
    }

    const pb = await getServerPocketBase();

    // Try find existing owner record
    let rec: PBRecord | null = null;
    try {
      rec = await pb.collection(COLLECTION).getFirstListItem(
        `ownerId = "${ownerId}"`
      );
    } catch {}

    if (rec) {
      // Clear any legacy fields by writing only { tasks }
      const updated = (await pb.collection(COLLECTION).update(rec.id, { data: { tasks } })) as PBRecord;
      return NextResponse.json({ id: updated.id, tasks });
    }

    const created = (await pb.collection(COLLECTION).create({ ownerId, data: { tasks } })) as PBRecord;
    return NextResponse.json({ id: created.id, tasks });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
