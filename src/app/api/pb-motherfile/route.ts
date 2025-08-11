export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerPocketBase } from '@/lib/pbServer';

export async function GET() {
  try {
    const pb = await getServerPocketBase();
    const rec = await pb.collection('Motherfile').getOne('motherfile');
    return NextResponse.json({ success: true, data: rec });
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
    const updated = await pb.collection('Motherfile').update('motherfile', { fases });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update Motherfile';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const pb = await getServerPocketBase();
    const form = await request.formData();
    const updated = await pb.collection('Motherfile').update('motherfile', form);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to upload media to Motherfile';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
