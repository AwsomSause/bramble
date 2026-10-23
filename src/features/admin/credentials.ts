/**
 * Soft lock for the admin panel. IMPORTANT: this is obfuscation, not real security.
 * Bramble is a static site, so this code and the stored hash are public. A determined
 * person can read the source or edit storage to get past it. It only keeps the panel
 * out of sight from casual visitors. Real protection would need a server (see docs).
 *
 * We store only a salted SHA-256 fingerprint of (username + password + school answer),
 * never the plaintext. `npm run set-admin` writes it; the owner's password never enters
 * the repo or this conversation.
 */

export type AdminConfig = { salt: string; hash: string };
export type AdminInput = { username: string; password: string; school: string };

/** Lowercase, trim, collapse spaces, drop punctuation — used for the username and school answer. */
export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hashCredentials(username: string, password: string, school: string, salt: string): Promise<string> {
  // Password is used exactly as typed; username and school are normalized so capitalization
  // and stray spaces don't lock the owner out.
  return sha256Hex([salt, normalizeAnswer(username), password, normalizeAnswer(school)].join('\u0000'));
}

export function isConfigured(cfg: AdminConfig): boolean {
  return !!cfg.salt && /^[0-9a-f]{64}$/.test(cfg.hash);
}

export async function verifyCredentials(input: AdminInput, cfg: AdminConfig): Promise<boolean> {
  if (!isConfigured(cfg)) return false;
  const got = await hashCredentials(input.username, input.password, input.school, cfg.salt);
  // Length-constant compare over the hex strings.
  if (got.length !== cfg.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ cfg.hash.charCodeAt(i);
  return diff === 0;
}
