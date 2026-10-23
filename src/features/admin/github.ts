/**
 * Publishing a draft game by committing files through the GitHub REST contents API.
 *
 * Safety: this is only wired up when Bramble runs on a local dev host (see canPublishHere),
 * so the owner's token never lives on the public site. The token is sent only to api.github.com,
 * in the Authorization header — never in a URL, never logged.
 */
import type { GameDetails } from '../../catalog/schema';
import type { StoredDraft } from './drafts';

export type CommitFile = { path: string; text?: string; base64?: string };

const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** True only on a local development host; publishing is disabled anywhere else. */
export function canPublishHere(hostname: string = window.location.hostname): boolean {
  return DEV_HOSTS.has(hostname) || hostname.endsWith('.localhost');
}

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

/** Serialize a game entry the same way the add-game command does: only hand-editable fields. */
export function draftToJson(details: GameDetails, thumbnailPath?: string): string {
  const out: Record<string, unknown> = {
    slug: details.slug,
    title: details.title,
    description: details.description,
    ...(details.instructions ? { instructions: details.instructions } : {}),
    ...(thumbnailPath ? { thumbnail: thumbnailPath } : details.thumbnail ? { thumbnail: details.thumbnail } : {}),
    category: details.category,
    ...(details.tags.length ? { tags: details.tags } : {}),
    source: details.source,
    controls: details.controls,
    fullscreen: details.fullscreen,
    mobile: details.mobile,
    ...(details.aspectRatio !== '16:9' ? { aspectRatio: details.aspectRatio } : {}),
    ...(details.collection !== 'bramble' ? { collection: details.collection } : {}),
    ...(details.permissions.length ? { permissions: details.permissions } : {}),
    attribution: details.attribution,
    license: details.license,
    ...(details.featured ? { featured: true } : {}),
    addedAt: details.addedAt,
  };
  return `${JSON.stringify(out, null, 2)}\n`;
}

export function buildCommitFiles(draft: StoredDraft): CommitFile[] {
  const { details } = draft;
  const files: CommitFile[] = [];
  let thumbnailPath: string | undefined;

  if (draft.thumbDataUrl) {
    const m = /^data:([^;]+);base64,(.*)$/.exec(draft.thumbDataUrl);
    if (m) {
      const ext = EXT_BY_MIME[m[1]!] ?? 'png';
      thumbnailPath = `thumbs/${details.slug}.${ext}`;
      files.push({ path: `public/${thumbnailPath}`, base64: m[2]! });
    }
  }

  files.push({ path: `catalog/games/${details.slug}.json`, text: draftToJson(details, thumbnailPath) });

  if (details.source.type === 'file' && draft.html !== undefined) {
    files.push({ path: `games/${details.slug}/index.html`, text: draft.html });
  }
  return files;
}

export type PublishArgs = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  message: string;
  files: CommitFile[];
};

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

const API = 'https://api.github.com';

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

async function existingSha(args: PublishArgs, path: string): Promise<string | undefined> {
  const url = `${API}/repos/${args.owner}/${args.repo}/contents/${path}?ref=${encodeURIComponent(args.branch)}`;
  const res = await fetch(url, { headers: headers(args.token) });
  if (res.status === 404) return undefined;
  if (!res.ok) throw await apiError(res);
  const body = (await res.json()) as { sha?: string };
  return body.sha;
}

async function apiError(res: Response): Promise<Error> {
  let detail = '';
  try {
    detail = ((await res.json()) as { message?: string }).message ?? '';
  } catch {
    /* ignore */
  }
  if (res.status === 401) return new Error('GitHub rejected the token (401 Bad credentials). Check or re-create it.');
  if (res.status === 403) return new Error(`GitHub refused the request (403). The token may lack "Contents: write" on this repo. ${detail}`);
  if (res.status === 404) return new Error('Repository or path not found (404). Check the token has access to this repo.');
  if (res.status === 409) return new Error('A newer version exists on GitHub (409 conflict). Reload and try again.');
  return new Error(`GitHub error ${res.status}. ${detail}`);
}

/** Commit each file (create or update). Returns the paths committed. */
export async function publishToGitHub(args: PublishArgs): Promise<{ committed: string[]; commitUrl?: string }> {
  const committed: string[] = [];
  let commitUrl: string | undefined;
  for (const file of args.files) {
    const sha = await existingSha(args, file.path);
    const content = file.base64 ?? utf8ToBase64(file.text ?? '');
    const res = await fetch(`${API}/repos/${args.owner}/${args.repo}/contents/${file.path}`, {
      method: 'PUT',
      headers: headers(args.token),
      body: JSON.stringify({ message: args.message, content, branch: args.branch, ...(sha ? { sha } : {}) }),
    });
    if (!res.ok) throw await apiError(res);
    const body = (await res.json()) as { commit?: { html_url?: string } };
    commitUrl = body.commit?.html_url ?? commitUrl;
    committed.push(file.path);
  }
  return { committed, commitUrl };
}
