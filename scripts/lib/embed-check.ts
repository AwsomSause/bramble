/** Works out from HTTP headers whether a site lets Bramble show it inside a frame. */
export type EmbedStatus = 'ok' | 'blocked' | 'unknown';

export function portalOriginFromRepo(repoUrl: string): string {
  const owner = new URL(repoUrl).pathname.split('/').filter(Boolean)[0] ?? 'owner';
  return `https://${owner.toLowerCase()}.github.io`;
}

function sourceMatches(source: string, origin: string): boolean {
  if (source === '*') return true;
  const o = new URL(origin);
  const m = /^(https?:\/\/)?(\*\.)?([^/:]+)(:\d+)?\/?$/i.exec(source);
  if (!m) return false;
  const [, scheme, wildcard, host] = m;
  if (scheme && scheme.toLowerCase() !== `${o.protocol}//`) return false;
  const h = host!.toLowerCase();
  return wildcard ? o.hostname.endsWith(`.${h}`) : o.hostname === h;
}

export function analyzeFrameHeaders(headers: Headers, portalOrigin: string): 'ok' | 'blocked' {
  const xfo = headers.get('x-frame-options')?.trim().toLowerCase();
  if (xfo === 'deny' || xfo === 'sameorigin') return 'blocked';
  const csp = headers.get('content-security-policy');
  if (csp) {
    const directive = csp
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .find((parts) => parts[0]?.toLowerCase() === 'frame-ancestors');
    if (directive) {
      const sources = directive.slice(1);
      if (!sources.some((s) => sourceMatches(s, portalOrigin))) return 'blocked';
    }
  }
  return 'ok';
}

/** Full verdict for a fetched embed: the final (post-redirect) host must be allowlisted too,
 *  otherwise Bramble's CSP will refuse the frame. */
export function classifyResponse(
  finalUrl: string,
  headers: Headers,
  allowedHosts: string[],
  portalOrigin: string,
): { status: 'ok' | 'blocked'; note?: string } {
  const host = new URL(finalUrl).hostname;
  if (!allowedHosts.includes(host)) {
    return {
      status: 'blocked',
      note: `redirects to ${host}, which isn't in catalog/sources.json — use the final address as the link, or allow that host`,
    };
  }
  return { status: analyzeFrameHeaders(headers, portalOrigin) };
}
