import PocketBase from 'pocketbase';
import { authenticatePocketBaseAdmin } from './pbAdminAuth';

let serverPb: PocketBase | null = null;

export function resolveServerPocketBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || process.env.NEXT_PUBLIC_PB_URL;
  if (envUrl && !envUrl.includes('pinkmilk.pockethost.io')) {
    return envUrl;
  }
  return 'https://pb.pinkmilk.eu';
}

async function authenticateAdmin(pb: PocketBase): Promise<void> {
  const adminEmail = process.env.PB_ADMIN_EMAIL;
  const adminPassword = process.env.PB_ADMIN_PASSWORD;

  // Prefer active password auth against the current PocketBase instance
  if (adminEmail && adminPassword) {
    try {
      await authenticatePocketBaseAdmin(pb, adminEmail, adminPassword);
      console.log('[pbServer] Admin auth successful with password');
      return;
    } catch (err) {
      console.warn('[pbServer] Password authentication failed, checking token fallback:', err);
    }
  }

  const adminToken = process.env.PB_ADMIN_TOKEN;
  if (adminToken) {
    pb.authStore.save(adminToken, null);
    return;
  }

  throw new Error('Missing PB admin credentials. Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD.');
}

export async function getServerPocketBase(): Promise<PocketBase> {
  const baseUrl = resolveServerPocketBaseUrl();

  if (!serverPb) {
    serverPb = new PocketBase(baseUrl);
  }

  // Always re-authenticate if token is missing or invalid
  if (!serverPb.authStore.isValid) {
    await authenticateAdmin(serverPb);
  }

  return serverPb;
}
