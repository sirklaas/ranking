import type PocketBase from 'pocketbase';

type PocketBaseAdminClient = Pick<PocketBase, 'baseUrl' | 'authStore'>;
type AuthRecord = Parameters<PocketBase['authStore']['save']>[1];
type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type AdminAuthResponse = {
  token?: string;
  record?: AuthRecord;
  admin?: AuthRecord;
  message?: string;
};

const CURRENT_AUTH_PATH = '/api/collections/_superusers/auth-with-password';
const LEGACY_AUTH_PATH = '/api/admins/auth-with-password';

export async function authenticatePocketBaseAdmin(
  pb: PocketBaseAdminClient,
  email: string,
  password: string,
  fetcher: Fetcher = fetch,
): Promise<void> {
  const paths = [CURRENT_AUTH_PATH, LEGACY_AUTH_PATH];

  for (const [index, path] of paths.entries()) {
    const authRes = await fetcher(`${pb.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password }),
    });

    if (!authRes.ok) {
      if (index === 0 && authRes.status === 404) {
        continue;
      }

      const errData = (await authRes.json().catch(() => ({}))) as AdminAuthResponse;
      throw new Error(errData.message || `Admin auth failed with status ${authRes.status}`);
    }

    const authData = (await authRes.json()) as AdminAuthResponse;
    if (!authData.token) {
      throw new Error('No token returned from admin auth');
    }

    pb.authStore.save(authData.token, authData.record ?? authData.admin ?? null);
    return;
  }

  throw new Error('PocketBase admin auth endpoint was not found');
}
