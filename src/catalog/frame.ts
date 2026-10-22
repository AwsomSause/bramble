/**
 * The one place that decides what a game's <iframe> may do.
 *
 * Why: `sandbox` turns off everything by default (scripts, forms, popups, storage, navigation…)
 * and we add back only what a game declares. `allow-same-origin` would let a game served from
 * our own site read our data, so file games never get it — only embeds that live on another site.
 */
import { siteConfig } from '../config';
import { EMBED_ONLY_PERMISSIONS, type Game, type Permission } from './schema';

export type FrameAttrs = {
  src: string;
  sandbox: string;
  allow: string;
  referrerPolicy: 'no-referrer';
  title: string;
};

const SANDBOX_TOKENS: Partial<Record<Permission, string>> = {
  'pointer-lock': 'allow-pointer-lock',
  forms: 'allow-forms',
  modals: 'allow-modals',
  'orientation-lock': 'allow-orientation-lock',
  storage: 'allow-same-origin',
  popups: 'allow-popups',
};
const ALLOW_FEATURES: Partial<Record<Permission, string>> = {
  fullscreen: 'fullscreen',
  gamepad: 'gamepad',
  autoplay: 'autoplay',
};

/**
 * `portalOrigin` is Bramble's own origin. An embed served from that same origin (e.g. another
 * repo under the same github.io account) is treated like a file game: it must never get
 * allow-same-origin, because that would let it reach into Bramble.
 */
export function buildFrameAttrs(game: Game, baseUrl: string, portalOrigin: string = window.location.origin): FrameAttrs {
  const isFile = game.source.type === 'file' || new URL(game.source.url).origin === portalOrigin;
  const sandbox = ['allow-scripts'];
  const allow: string[] = [];
  for (const p of game.permissions) {
    if (isFile && EMBED_ONLY_PERMISSIONS.includes(p)) continue;
    const token = SANDBOX_TOKENS[p];
    if (token && !sandbox.includes(token)) sandbox.push(token);
    const feature = ALLOW_FEATURES[p];
    if (feature && !allow.includes(feature)) allow.push(feature);
  }
  const src = game.source.type === 'file' ? `${baseUrl}${game.source.path}` : game.source.url;
  return { src, sandbox: sandbox.join(' '), allow: allow.join('; '), referrerPolicy: 'no-referrer', title: game.title };
}

export type GameMessage = { type: 'bramble:ready' } | { type: 'bramble:score'; score: number };

/** Accepts only the two message shapes our bridge sends; anything else is ignored. */
export function parseGameMessage(data: unknown): GameMessage | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as { type?: unknown; score?: unknown };
  if (d.type === 'bramble:ready') return { type: 'bramble:ready' };
  if (d.type === 'bramble:score' && typeof d.score === 'number' && Number.isInteger(d.score)) {
    return { type: 'bramble:score', score: d.score };
  }
  return null;
}

export function reportIssueUrl(game: Pick<Game, 'slug' | 'title'>, userAgent: string): string {
  const u = new URL(`${siteConfig.repoUrl}/issues/new`);
  u.searchParams.set('title', `Broken game: ${game.title}`);
  u.searchParams.set(
    'body',
    `Game: ${game.slug}\nBrowser: ${userAgent}\n\nWhat happened?\n\n(Describe the problem here.)`,
  );
  return u.toString();
}
