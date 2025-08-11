export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

const HARDCODED_COLLECTION = 'motherfile';
const HARDCODED_RECORD_ID = 'vb0waum2c1yevsg';

type ResolveTrace = Array<{ strategy: string; collection: string; recordId?: string; ok: boolean; error?: string }>

async function getMotherfileContext(pb: Awaited<ReturnType<typeof getServerPocketBase>>): Promise<{ collection: string; recordId: string; trace: ResolveTrace }> {
  const envName = (process.env.PB_MOTHERFILE_COLLECTION || '').trim();
  const candidates = Array.from(new Set([envName, 'motherfile', 'Motherfile'].filter(Boolean)));
  const explicitId = (process.env.PB_MOTHERFILE_RECORD_ID || '').trim();

  let lastError: unknown = null;
  const trace: ResolveTrace = [];
  for (const collection of candidates) {
    // -1) Try hardcoded fallback first
    if (HARDCODED_COLLECTION && HARDCODED_RECORD_ID && collection === HARDCODED_COLLECTION) {
      try {
        const rec = await pb.collection(HARDCODED_COLLECTION).getOne(HARDCODED_RECORD_ID, { $autoCancel: false });
        if (rec?.id) {
          trace.push({ strategy: 'hardcoded', collection: HARDCODED_COLLECTION, recordId: HARDCODED_RECORD_ID, ok: true });
          return { collection: HARDCODED_COLLECTION, recordId: rec.id, trace };
        }
      } catch (e) {
        lastError = e;
        trace.push({ strategy: 'hardcoded', collection: HARDCODED_COLLECTION, recordId: HARDCODED_RECORD_ID, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
    // 0) If explicit record id is provided, try it directly
    if (explicitId) {
      try {
        const rec = await pb.collection(collection).getOne(explicitId, { $autoCancel: false });
        if (rec?.id) {
          trace.push({ strategy: 'env_record_id', collection, recordId: explicitId, ok: true });
          return { collection, recordId: rec.id, trace };
        }
      } catch (e) {
        lastError = e;
        trace.push({ strategy: 'env_record_id', collection, recordId: explicitId, ok: false, error: e instanceof Error ? e.message : String(e) });
        // continue to other strategies
      }
    }
    // 1) Try to read the well-known id directly to avoid admin-only list permissions
    try {
      const rec = await pb.collection(collection).getOne('motherfile', { $autoCancel: false });
      if (rec?.id) {
        trace.push({ strategy: 'well_known_id', collection, recordId: 'motherfile', ok: true });
        return { collection, recordId: rec.id, trace };
      }
    } catch (e) {
      lastError = e;
      trace.push({ strategy: 'well_known_id', collection, recordId: 'motherfile', ok: false, error: e instanceof Error ? e.message : String(e) });
    }
    // 2) Try list-first (requires admin permissions)
    try {
      const list = await pb.collection(collection).getList(1, 1, { $autoCancel: false });
      if (list?.items?.length) {
        trace.push({ strategy: 'list_first', collection, recordId: list.items[0].id, ok: true });
        return { collection, recordId: list.items[0].id, trace };
      }
    } catch (e) {
      lastError = e;
      trace.push({ strategy: 'list_first', collection, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
    // 3) Create singleton if missing (requires admin)
    try {
      const created = await pb.collection(collection).create({ id: 'motherfile', fases: {} }, { $autoCancel: false });
      if (created?.id) {
        trace.push({ strategy: 'create_singleton', collection, recordId: created.id, ok: true });
        return { collection, recordId: created.id, trace };
      }
    } catch (e) {
      lastError = e;
      trace.push({ strategy: 'create_singleton', collection, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  throw new Error(
    `PocketBase Motherfile collection not found or inaccessible. Tried collections: [${candidates.join(', ')}]. Ensure PB_MOTHERFILE_COLLECTION matches the API id and server has admin credentials. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)} | TRACE: ${JSON.stringify(trace)}`
  );
}

export async function GET(req: NextRequest) {
  let meta: { collection?: string; recordId?: string } = {};
  try {
    const pb = await getServerPocketBase();
    const ctx = await getMotherfileContext(pb);
    meta = { collection: ctx.collection, recordId: ctx.recordId };
    const rec = await pb.collection(ctx.collection).getOne(ctx.recordId, { $autoCancel: false });
    const baseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://pinkmilk.pockethost.io';
    const debug = req.nextUrl.searchParams.get('debug');
    return NextResponse.json({ success: true, data: rec, meta: { ...meta, baseUrl, trace: debug ? ctx.trace : undefined } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to read Motherfile';
    return NextResponse.json({ success: false, error: msg, details: String(error), meta }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { fases } = body || {};
    if (!fases || typeof fases !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing fases payload' }, { status: 400 });
    }
    const pb = await getServerPocketBase();
    const { collection, recordId } = await getMotherfileContext(pb);
    const updated = await pb.collection(collection).update(recordId, { fases });
    return NextResponse.json({ success: true, data: updated, meta: { collection, recordId } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update Motherfile';
    return NextResponse.json({ success: false, error: msg, details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const pb = await getServerPocketBase();
    const form = await request.formData();
    const { collection, recordId } = await getMotherfileContext(pb);
    const updated = await pb.collection(collection).update(recordId, form);
    return NextResponse.json({ success: true, data: updated, meta: { collection, recordId } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to upload media to Motherfile';
    return NextResponse.json({ success: false, error: msg, details: String(error) }, { status: 500 });
  }
}
