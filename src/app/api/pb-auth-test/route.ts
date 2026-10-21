export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { resolveServerPocketBaseUrl } from '@/lib/pbServer';
import { authenticatePocketBaseAdmin } from '@/lib/pbAdminAuth';

export async function GET() {
  const baseUrl = resolveServerPocketBaseUrl();
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;
  const token = process.env.PB_ADMIN_TOKEN;

  const meta = {
    baseUrl,
    hasEmail: Boolean(email),
    hasPassword: Boolean(password),
    hasToken: Boolean(token),
  } as const;

  try {
    const pb = new PocketBase(baseUrl);

    // Prefer password auth against current PocketBase
    if (email && password) {
      try {
        await authenticatePocketBaseAdmin(pb, email, password);
        await pb.collections.getList(1, 1, { $autoCancel: false });
        return NextResponse.json({ success: true, mode: 'password', meta });
      } catch (e) {
        console.warn('Password auth failed, checking token fallback:', e);
      }
    }

    if (token) {
      pb.authStore.save(token, null);
      try {
        await pb.collections.getList(1, 1, { $autoCancel: false });
        return NextResponse.json({ success: true, mode: 'token', meta });
      } catch (e) {
        return NextResponse.json({ success: false, error: 'token_auth_failed', details: String(e), meta }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: 'no_credentials', meta }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'unexpected', details: String(error), meta }, { status: 500 });
  }
}
