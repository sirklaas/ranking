export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

async function getMotherfileContext(pb: Awaited<ReturnType<typeof getServerPocketBase>>) {
  const collection = (process.env.PB_MOTHERFILE_COLLECTION || 'motherfile').trim();
  // Try to find existing singleton record
  try {
    const list = await pb.collection(collection).getList(1, 1, { $autoCancel: false });
    if (list?.items?.length) {
      return { collection, recordId: list.items[0].id };
    }
  } catch (e) {
    // fallthrough to creation; if collection name is wrong, following ops will surface error
  }
  // Create an empty record if none exists
  const created = await pb.collection(collection).create({ fases: {} });
  return { collection, recordId: created.id };
}

export async function GET() {
  try {
    const pb = await getServerPocketBase();
    const { collection, recordId } = await getMotherfileContext(pb);
    const rec = await pb.collection(collection).getOne(recordId);
    return NextResponse.json({ success: true, data: rec, meta: { collection, recordId } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to read Motherfile';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
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
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
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
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
