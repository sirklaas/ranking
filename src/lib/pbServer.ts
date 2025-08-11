import PocketBase from 'pocketbase';

let serverPb: PocketBase | null = null;

export async function getServerPocketBase(): Promise<PocketBase> {
  if (!serverPb) {
    const baseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
    serverPb = new PocketBase(baseUrl);

    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;
    const adminToken = process.env.PB_ADMIN_TOKEN; // optional permanent token

    if (adminToken) {
      serverPb.authStore.save(adminToken, null);
    } else if (adminEmail && adminPassword) {
      await serverPb.admins.authWithPassword(adminEmail, adminPassword);
    } else {
      throw new Error('Missing PB admin credentials. Set PB_ADMIN_TOKEN or PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD.');
    }
  }
  return serverPb;
}
