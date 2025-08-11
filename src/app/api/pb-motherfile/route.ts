export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

async function getMotherfileContext(pb: Awaited<ReturnType<typeof getServerPocketBase>>) {
  const envName = (process.env.PB_MOTHERFILE_COLLECTION || '').trim();
  const candidates = Array.from(new Set([envName, 'motherfile', 'Motherfile'].filter(Boolean)));
  const explicitId = (process.env.PB_MOTHERFILE_RECORD_ID || '').trim();

  let lastError: unknown = null;
  for (const collection of candidates) {
    // 0) If explicit record id is provided, try it directly
    if (explicitId) {
      try {
        const rec = await pb.collection(collection).getOne(explicitId, { $autoCancel: false });
        if (rec?.id) return { collection, recordId: rec.id };
      } catch (e) {
        lastError = e;
        // continue to other strategies
      }
    }
    // 1) Try to read the well-known id directly to avoid admin-only list permissions
    try {
      const rec = await pb.collection(collection).getOne('motherfile', { $autoCancel: false });
      if (rec?.id) return { collection, recordId: rec.id };
    } catch (e) {
      lastError = e;
      // If it's a 404, the collection may exist but record not created yet
      const msg = e instanceof Error ? e.message : String(e);
      const notFound = /not found|404/i.test(msg);
      if (notFound) {
        // Try to find the first existing record (supports singleton with random id)
        try {
          const list = await pb.collection(collection).getList(1, 1, { $autoCancel: false });
          if (list?.items?.length) {
            return { collection, recordId: list.items[0].id };
          }
        } catch (listErr) {
          lastError = listErr;
        }
        // If none exist, create singleton
        try {
          const created = await pb.collection(collection).create({ fases: {} });
          return { collection, recordId: created.id };
        } catch (createErr) {
          lastError = createErr;
          // fallthrough to next candidate
        }
      }
    }
  }
  throw new Error(
    `PocketBase Motherfile collection not found or inaccessible. Tried collections: [${candidates.join(', ')}]. Ensure PB_MOTHERFILE_COLLECTION matches the API id and server has admin credentials. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

export async function GET() {
  try {
    const pb = await getServerPocketBase();
    const { collection, recordId } = await getMotherfileContext(pb);
    const rec = await pb.collection(collection).getOne(recordId);
    return NextResponse.json({ success: true, data: rec, meta: { collection, recordId } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to read Motherfile';
    return NextResponse.json({ success: false, error: msg, details: String(error) }, { status: 500 });
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
