import PocketBase from 'pocketbase';

let serverPb: PocketBase | null = null;

async function authenticateAdmin(pb: PocketBase): Promise<void> {
  const baseUrl = pb.baseUrl;
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

  // Direct fetch to bypass SDK version mismatch issues
  const authRes = await fetch(`${baseUrl}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: adminEmail, password: adminPassword }),
  });

  if (!authRes.ok) {
    const errData = await authRes.json().catch(() => ({}));
    throw new Error(errData.message || `Admin auth failed with status ${authRes.status}`);
  }

  const authData = await authRes.json();
  if (!authData.token) {
    throw new Error('No token returned from admin auth');
  }

  pb.authStore.save(authData.token, authData.admin || null);
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
