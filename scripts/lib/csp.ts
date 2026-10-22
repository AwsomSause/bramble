/**
 * Builds the Content-Security-Policy for the portal page.
 * GitHub Pages can't send headers, so this goes in a <meta> tag (see vite.config.ts).
 * frame-ancestors is not allowed in <meta>, which is a documented limitation.
 */
export function buildCsp(frameHosts: string[]): string {
  for (const h of frameHosts) {
    if (!/^[a-z0-9.-]+(:\d+)?$/i.test(h)) throw new Error(`invalid frame host: ${h}`);
  }
  const frames = ["'self'", ...frameHosts.map((h) => `https://${h}`)].join(' ');
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    `frame-src ${frames}`,
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}
