// npm run set-admin — set (or change) the admin panel's username, password and secret answer.
// Stores only a salted SHA-256 fingerprint in src/features/admin/admin.config.json.
// Your password is never written to the repo. Run this in a private terminal.
import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { hashCredentials } from '../src/features/admin/credentials';

const { values } = parseArgs({ options: { username: { type: 'string' }, password: { type: 'string' }, school: { type: 'string' } } });
const rl = values.username && values.password && values.school ? null : createInterface({ input: process.stdin, output: process.stdout });

async function main() {
  console.log('Set the Bramble admin login. Only a scrambled fingerprint is saved, never the password.\n');
  const username = (values.username ?? (await rl!.question('Username: '))).trim();
  const password = values.password ?? (await rl!.question('Password (will show as you type — use a private terminal): '));
  const school = (values.school ?? (await rl!.question('Secret answer (e.g. your 3rd grade school): '))).trim();
  if (!username || !password || !school) throw new Error('all three are required');

  const salt = randomBytes(16).toString('hex');
  const hash = await hashCredentials(username, password, school, salt);
  writeFileSync('src/features/admin/admin.config.json', `${JSON.stringify({ salt, hash }, null, 2)}\n`);
  console.log('\nSaved src/features/admin/admin.config.json. Rebuild/redeploy for it to take effect.');
}

main()
  .catch((e: unknown) => {
    console.error(`set-admin: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  })
  .finally(() => rl?.close());
