/**
 * Reads, validates and builds the game catalog.
 * Used by `npm run validate`, `npm run build:catalog` and the add-game command.
 */
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import {
  EMBED_ONLY_PERMISSIONS,
  gameSchema,
  toSummary,
  type Game,
  type GameDetails,
  type GameSummary,
} from '../../src/catalog/schema';
import { siteConfig } from '../../src/config';
import { portalOriginFromRepo } from './embed-check';

export type Issue = { level: 'error' | 'warn'; file: string; message: string };

type Loaded = { game: Game; file: string; dir: string };

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(path: string): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  try {
    return { ok: true, value: JSON.parse(await readFile(path, 'utf8')) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** True when `child` resolves to a location inside `parent`. */
function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export async function readHosts(root: string): Promise<string[]> {
  const r = await readJsonFile(join(root, 'catalog/sources.json'));
  if (!r.ok) return [];
  const hosts = (r.value as { hosts?: unknown }).hosts;
  return Array.isArray(hosts) ? hosts.filter((h): h is string => typeof h === 'string') : [];
}

export async function readEmbedStatus(root: string): Promise<Record<string, string>> {
  const p = join(root, 'catalog/embed-status.json');
  if (!(await exists(p))) return {};
  const r = await readJsonFile(p);
  return r.ok && r.value && typeof r.value === 'object' ? (r.value as Record<string, string>) : {};
}

/** Hostnames Bramble itself is served from: the github.io host from siteConfig.repoUrl,
 *  PORTAL_ORIGIN if set, and a custom domain from public/CNAME. */
export async function readPortalHosts(root: string): Promise<string[]> {
  const hosts = [new URL(portalOriginFromRepo(siteConfig.repoUrl)).hostname];
  if (process.env.PORTAL_ORIGIN) hosts.push(new URL(process.env.PORTAL_ORIGIN).hostname);
  const cname = join(root, 'public/CNAME');
  if (await exists(cname)) {
    const domain = (await readFile(cname, 'utf8')).trim().toLowerCase();
    if (domain) hosts.push(domain);
  }
  return hosts;
}

export async function loadCatalog(
  root: string,
  extraDirs: string[] = [],
  opts: { portalHosts?: string[] } = {},
): Promise<{ games: Game[]; issues: Issue[] }> {
  const issues: Issue[] = [];
  const loaded: Loaded[] = [];
  const hosts = new Set(await readHosts(root));
  const portalHosts = new Set(opts.portalHosts ?? (await readPortalHosts(root)));
  const embedStatus = await readEmbedStatus(root);

  for (const dir of [root, ...extraDirs]) {
    const gamesDir = join(dir, 'catalog/games');
    if (!(await exists(gamesDir))) continue;
    const names = (await readdir(gamesDir)).filter((n) => n.endsWith('.json')).sort();
    for (const name of names) {
      const file = relative(root, join(gamesDir, name)) || name;
      const json = await readJsonFile(join(gamesDir, name));
      if (!json.ok) {
        issues.push({ level: 'error', file, message: `invalid JSON: ${json.error}` });
        continue;
      }
      const parsed = gameSchema.safeParse(json.value);
      if (!parsed.success) {
        for (const iss of parsed.error.issues) {
          issues.push({ level: 'error', file, message: `${iss.path.join('.') || '(entry)'}: ${iss.message}` });
        }
        continue;
      }
      loaded.push({ game: parsed.data, file, dir });
    }
  }

  const seenId = new Map<string, string>();
  const seenSlug = new Map<string, string>();
  for (const { game: g, file, dir } of loaded) {
    const err = (message: string) => issues.push({ level: 'error', file, message });
    const warn = (message: string) => issues.push({ level: 'warn', file, message });

    const idOwner = seenId.get(g.id);
    if (idOwner) err(`duplicate id "${g.id}" (also in ${idOwner})`);
    else seenId.set(g.id, file);
    const slugOwner = seenSlug.get(g.slug);
    if (slugOwner) err(`duplicate slug "${g.slug}" (also in ${slugOwner})`);
    else seenSlug.set(g.slug, file);

    if (g.source.type === 'file') {
      const target = resolve(dir, g.source.path);
      const inRoot = resolve(root, g.source.path);
      if (!isInside(resolve(dir, 'games'), target)) err(`file path must be inside games/: ${g.source.path}`);
      else if (!(await exists(target)) && !(dir !== root && (await exists(inRoot)))) err(`file not found: ${g.source.path}`);
      for (const p of g.permissions) {
        if (EMBED_ONLY_PERMISSIONS.includes(p)) err(`permission "${p}" is only allowed for embed games`);
      }
    } else {
      const host = new URL(g.source.url).hostname;
      if (!hosts.has(host)) err(`embed host "${host}" is not in catalog/sources.json`);
      if (portalHosts.has(host)) {
        for (const p of g.permissions) {
          if (EMBED_ONLY_PERMISSIONS.includes(p)) {
            err(`permission "${p}" is not allowed: ${host} is the same site as Bramble, so it would bypass the sandbox`);
          }
        }
      }
      if (embedStatus[g.slug] === 'blocked') warn('embed check: this site refuses to be framed; players will get a link');
    }

    if (g.thumbnail) {
      const thumb = resolve(root, 'public', g.thumbnail);
      if (!isInside(resolve(root, 'public'), thumb) || !(await exists(thumb))) {
        err(`thumbnail not found: public/${g.thumbnail}`);
      }
    } else {
      warn('no thumbnail; a berry placeholder will be shown');
    }
    if (g.description.length < 20) warn('description is very short');
  }

  return { games: loaded.map((l) => l.game), issues };
}

export function serializeIndex(summaries: GameSummary[]): string {
  return JSON.stringify(summaries);
}

export async function buildCatalog(
  root: string,
  outDir: string,
  opts: { extraDirs?: string[] } = {},
): Promise<{ count: number }> {
  const extraDirs = opts.extraDirs ?? [];
  const { games, issues } = await loadCatalog(root, extraDirs);
  const errs = issues.filter((i) => i.level === 'error');
  if (errs.length) {
    throw new Error(`catalog has ${errs.length} error(s):\n${errs.map((e) => `  ${e.file}: ${e.message}`).join('\n')}`);
  }
  const embedStatus = await readEmbedStatus(root);
  const visible = games.filter((g) => g.status !== 'hidden').sort((a, b) => a.title.localeCompare(b.title));

  await rm(join(outDir, 'catalog'), { recursive: true, force: true });
  await rm(join(outDir, 'games'), { recursive: true, force: true });
  await mkdir(join(outDir, 'catalog/games'), { recursive: true });

  await writeFile(join(outDir, 'catalog/index.json'), serializeIndex(visible.map(toSummary)));
  const credits = visible.map((g) => ({
    slug: g.slug,
    title: g.title,
    author: g.attribution.author,
    ...(g.attribution.url ? { authorUrl: g.attribution.url } : {}),
    license: g.license.name,
    ...(g.license.url ? { licenseUrl: g.license.url } : {}),
  }));
  await writeFile(join(outDir, 'catalog/credits.json'), JSON.stringify(credits));
  for (const g of visible) {
    const details: GameDetails = { ...g, embedBlocked: embedStatus[g.slug] === 'blocked' };
    await writeFile(join(outDir, 'catalog/games', `${g.slug}.json`), JSON.stringify(details));
  }
  for (const dir of [root, ...extraDirs]) {
    if (await exists(join(dir, 'games'))) {
      await cp(join(dir, 'games'), join(outDir, 'games'), {
        recursive: true,
        filter: (src) => !src.endsWith('.test.ts'),
      });
    }
  }
  return { count: visible.length };
}
