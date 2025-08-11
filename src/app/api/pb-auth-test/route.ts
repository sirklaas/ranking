export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://pinkmilk.pockethost.io';
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
    if (token) {
      pb.authStore.save(token, null);
      // try a lightweight admin-only call to verify token works
      try {
        // list the collections (admin-only)
        await pb.collections.getList(1, 1, { $autoCancel: false });
        return NextResponse.json({ success: true, mode: 'token', meta });
      } catch (e) {
        return NextResponse.json({ success: false, error: 'token_auth_failed', details: String(e), meta }, { status: 500 });
      }
    }

    if (email && password) {
      try {
        await pb.admins.authWithPassword(email, password);
        // verify by listing collections (admin-only)
        await pb.collections.getList(1, 1, { $autoCancel: false });
        return NextResponse.json({ success: true, mode: 'password', meta });
      } catch (e) {
        return NextResponse.json({ success: false, error: 'password_auth_failed', details: String(e), meta }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: 'no_credentials', meta }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'unexpected', details: String(error), meta }, { status: 500 });
  }
}
