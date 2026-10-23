import { describe, expect, test } from 'vitest';
import { hashCredentials, normalizeAnswer, verifyCredentials, type AdminConfig } from './credentials';

describe('normalizeAnswer', () => {
  test('is case/space/punctuation-insensitive', () => {
    expect(normalizeAnswer('  Elk City  Elementary! ')).toBe('elk city elementary');
    expect(normalizeAnswer('ELK CITY ELEMENTARY')).toBe('elk city elementary');
  });
});

describe('hashCredentials', () => {
  test('is stable for the same inputs and salt', async () => {
    const a = await hashCredentials('admin', 'hunter2', 'Elk City Elementary', 'salt123');
    const b = await hashCredentials('Admin', 'hunter2', 'elk city  elementary!', 'salt123');
    expect(a).toBe(b); // username and school are normalized
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  test('password is case-sensitive and exact', async () => {
    const a = await hashCredentials('admin', 'hunter2', 's', 'salt');
    const b = await hashCredentials('admin', 'Hunter2', 's', 'salt');
    expect(a).not.toBe(b);
  });
  test('a different salt gives a different hash', async () => {
    const a = await hashCredentials('admin', 'p', 's', 'salt1');
    const b = await hashCredentials('admin', 'p', 's', 'salt2');
    expect(a).not.toBe(b);
  });
});

describe('verifyCredentials', () => {
  const build = async (): Promise<AdminConfig> => ({
    salt: 'abc',
    hash: await hashCredentials('admin', 'hunter2', 'Elk City Elementary', 'abc'),
  });

  test('accepts the exact three factors (user/school case-insensitive)', async () => {
    const cfg = await build();
    expect(await verifyCredentials({ username: 'ADMIN', password: 'hunter2', school: 'elk city elementary' }, cfg)).toBe(true);
  });
  test('rejects a wrong password', async () => {
    expect(await verifyCredentials({ username: 'admin', password: 'nope', school: 'Elk City Elementary' }, await build())).toBe(false);
  });
  test('rejects a wrong school', async () => {
    expect(await verifyCredentials({ username: 'admin', password: 'hunter2', school: 'Other School' }, await build())).toBe(false);
  });
  test('an unconfigured admin (empty hash) rejects everything', async () => {
    expect(await verifyCredentials({ username: 'admin', password: 'hunter2', school: 'Elk City Elementary' }, { salt: '', hash: '' })).toBe(false);
  });
  test('isConfigured reflects whether a hash is set', async () => {
    const { isConfigured } = await import('./credentials');
    expect(isConfigured({ salt: '', hash: '' })).toBe(false);
    expect(isConfigured(await build())).toBe(true);
  });
});
