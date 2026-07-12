import PocketBase from 'pocketbase';
import { authenticatePocketBaseAdmin } from './pbAdminAuth';

let serverPb: PocketBase | null = null;

async function authenticateAdmin(pb: PocketBase): Promise<void> {
  const adminEmail = process.env.PB_ADMIN_EMAIL;
  const adminPassword = process.env.PB_ADMIN_PASSWORD;
  const adminToken = process.env.PB_ADMIN_TOKEN;

  if (adminToken) {
    pb.authStore.save(adminToken, null);
    return;
  }

  if (!adminEmail || !adminPassword) {
    throw new Error('Missing PB admin credentials. Set PB_ADMIN_TOKEN or PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD.');
  }

  await authenticatePocketBaseAdmin(pb, adminEmail, adminPassword);
  console.log('[pbServer] Admin auth successful');
}

export async function getServerPocketBase(): Promise<PocketBase> {
  const baseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://pinkmilk.pockethost.io';

  if (!serverPb) {
    serverPb = new PocketBase(baseUrl);
  }

  // Always re-authenticate if token is missing or invalid
  if (!serverPb.authStore.isValid) {
    await authenticateAdmin(serverPb);
  }

  return serverPb;
}
