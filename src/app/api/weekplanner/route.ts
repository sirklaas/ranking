import { NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

const COLLECTION = 'weekplanner';

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

// Shape stored in PB for a single owner record
// { ownerId: string, data?: { tasks?: unknown[] } }

// Compute ISO week key like "2025-W35" using Europe/Amsterdam timezone
function isoWeekKeyEuropeAmsterdam(date = new Date()): string {
  // Convert to Europe/Amsterdam by formatting parts and reconstructing date
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const y = Number(parts.find(p => p.type === 'year')?.value || date.getUTCFullYear());
  const m = Number(parts.find(p => p.type === 'month')?.value || (date.getUTCMonth() + 1));
  const d = Number(parts.find(p => p.type === 'day')?.value || date.getUTCDate());
  const local = new Date(Date.UTC(y, m - 1, d));
  // ISO week number
  const dayNum = (local.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  const thursday = new Date(local);
  thursday.setUTCDate(local.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  const year = thursday.getUTCFullYear();
  const ww = String(week).padStart(2, '0');
  return `${year}-W${ww}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('owner') || searchParams.get('ownerId');
    if (!ownerId) return badRequest('Missing ownerId');

    const pb = await getServerPocketBase();
    try {
      const rec = await pb.collection(COLLECTION).getFirstListItem(
        `ownerId = "${ownerId}"`
      );
      const data = (rec as unknown as { data?: any }).data || {};
      let tasks: unknown[] = Array.isArray(data?.tasks) ? (data.tasks as unknown[]) : [];
      // Legacy fallback: data.weeks[currentWeek]?.tasks
      if ((!tasks || tasks.length === 0) && data && data.weeks && typeof data.weeks === 'object') {
        const key = isoWeekKeyEuropeAmsterdam();
        const wk = data.weeks[key];
        if (wk && Array.isArray(wk.tasks)) {
          tasks = wk.tasks as unknown[];
        }
      }
      return NextResponse.json(
        { id: (rec as any).id, tasks },
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
    let rec: { id: string; data?: { tasks?: unknown[] } } | null = null;
    try {
      rec = await pb.collection(COLLECTION).getFirstListItem(
        `ownerId = "${ownerId}"`
      );
    } catch {}

    const weekKey = isoWeekKeyEuropeAmsterdam();

    if (rec) {
      const existingData = (rec.data || {}) as any;
      const weeks = { ...(existingData.weeks || {}) };
      const prevWeek = weeks[weekKey] || { meta: { timezone: 'Europe/Amsterdam', weekKey }, tasks: [] };
      weeks[weekKey] = { ...prevWeek, tasks };
      const updated = await pb.collection(COLLECTION).update(rec.id, { data: { ...existingData, tasks, weeks } });
      return NextResponse.json({ id: updated.id, tasks });
    }

    const created = await pb.collection(COLLECTION).create({ ownerId, data: { tasks, weeks: { [weekKey]: { meta: { timezone: 'Europe/Amsterdam', weekKey }, tasks } } } });
    return NextResponse.json({ id: created.id, tasks });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
