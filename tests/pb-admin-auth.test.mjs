import test from 'node:test';
import assert from 'node:assert/strict';

import { authenticatePocketBaseAdmin } from '../src/lib/pbAdminAuth.ts';

function createPocketBaseStub() {
  const saved = [];

  return {
    pb: {
      baseUrl: 'https://example.test',
      authStore: {
        save(token, record) {
          saved.push({ token, record });
        },
      },
    },
    saved,
  };
}

test('uses the current PocketBase superuser login route', async () => {
  const { pb, saved } = createPocketBaseStub();
  const calls = [];
  const superuser = { id: 'superuser-1' };

  await authenticatePocketBaseAdmin(pb, 'admin@example.test', 'secret', async (url) => {
    calls.push(url);
    return new Response(JSON.stringify({ token: 'new-token', record: superuser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  assert.deepEqual(calls, [
    'https://example.test/api/collections/_superusers/auth-with-password',
  ]);
  assert.deepEqual(saved, [{ token: 'new-token', record: superuser }]);
});

test('falls back to the PocketBase 0.22 admin login route on a 404', async () => {
  const { pb, saved } = createPocketBaseStub();
  const calls = [];
  const admin = { id: 'admin-1' };

  await authenticatePocketBaseAdmin(pb, 'admin@example.test', 'secret', async (url) => {
    calls.push(url);
    if (url.includes('/_superusers/')) {
      return new Response('{}', {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ token: 'legacy-token', admin }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  assert.deepEqual(calls, [
    'https://example.test/api/collections/_superusers/auth-with-password',
    'https://example.test/api/admins/auth-with-password',
  ]);
  assert.deepEqual(saved, [{ token: 'legacy-token', record: admin }]);
});
