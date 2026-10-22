/** Turns "here's a game" into a catalog entry plus the files to copy. Pure apart from the deps you pass in. */
import { extname, join } from 'node:path';
import { gameSchema, type Category, type Control, type Game } from '../../src/catalog/schema';

export type AddGameInput = {
  kind: 'html' | 'folder' | 'link';
  from: string;
  title: string;
  category: Category;
  tags?: string[];
  controls?: Control[];
  description: string;
  author: string;
  authorUrl?: string;
  permission: string;
  licenseName?: string;
  thumbnail?: string;
  fullscreen?: boolean;
  mobile?: 'yes' | 'partial' | 'no';
  aspectRatio?: string;
  instructions?: string;
};

export type Copy = { kind: 'file' | 'dir'; from: string; to: string };
export type Deps = { isFile(p: string): boolean; isDir(p: string): boolean };

const THUMB_TYPES = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

export function slugify(title: string): string {
  const s = title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'game';
}

function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function planAddGame(
  input: AddGameInput,
  existingSlugs: Set<string>,
  knownHosts: string[],
  today: string,
  deps: Deps,
): { entry: Game; copies: Copy[]; newHost: string | null } {
  const slug = uniqueSlug(slugify(input.title), existingSlugs);
  const copies: Copy[] = [];
  let source: Game['source'];
  let newHost: string | null = null;

  if (input.kind === 'link') {
    let url: URL;
    try {
      url = new URL(input.from);
    } catch {
      throw new Error('link must be a full https:// address');
    }
    if (url.protocol !== 'https:') throw new Error('link must start with https://');
    source = { type: 'embed', url: url.toString() };
    if (!knownHosts.includes(url.hostname)) newHost = url.hostname;
  } else if (input.kind === 'html') {
    if (!deps.isFile(input.from)) throw new Error(`file not found: ${input.from}`);
    const to = `games/${slug}/index.html`;
    copies.push({ kind: 'file', from: input.from, to });
    source = { type: 'file', path: to };
  } else {
    if (!deps.isDir(input.from)) throw new Error(`folder not found: ${input.from}`);
    if (!deps.isFile(join(input.from, 'index.html'))) throw new Error('folder must contain index.html');
    copies.push({ kind: 'dir', from: input.from, to: `games/${slug}` });
    source = { type: 'file', path: `games/${slug}/index.html` };
  }

  let thumbnail: string | undefined;
  if (input.thumbnail) {
    const ext = extname(input.thumbnail).toLowerCase();
    if (!THUMB_TYPES.includes(ext)) throw new Error(`thumbnail must be one of ${THUMB_TYPES.join(', ')}`);
    if (!deps.isFile(input.thumbnail)) throw new Error(`thumbnail not found: ${input.thumbnail}`);
    thumbnail = `thumbs/${slug}${ext}`;
    copies.push({ kind: 'file', from: input.thumbnail, to: `public/${thumbnail}` });
  }

  const entry = gameSchema.parse({
    slug,
    title: input.title,
    description: input.description,
    ...(input.instructions ? { instructions: input.instructions } : {}),
    ...(thumbnail ? { thumbnail } : {}),
    category: input.category,
    tags: (input.tags ?? []).map((t) => slugify(t)).slice(0, 8),
    source,
    controls: input.controls?.length ? input.controls : ['keyboard', 'mouse'],
    fullscreen: input.fullscreen ?? true,
    mobile: input.mobile ?? 'partial',
    ...(input.aspectRatio ? { aspectRatio: input.aspectRatio } : {}),
    attribution: { author: input.author, ...(input.authorUrl ? { url: input.authorUrl } : {}) },
    license: { name: input.licenseName ?? 'Used with permission', permission: input.permission },
    addedAt: today,
  });
  return { entry, copies, newHost };
}

/** The JSON we write for a new game: only the fields worth editing by hand, in a friendly order. */
export function entryToJson(e: Game): string {
  const { id: _id, collection, permissions, status, featured, aspectRatio, ...rest } = e;
  const out: Record<string, unknown> = { ...rest };
  if (aspectRatio !== '16:9') out.aspectRatio = aspectRatio;
  if (collection !== 'bramble') out.collection = collection;
  if (permissions.length) out.permissions = permissions;
  if (status !== 'available') out.status = status;
  if (featured) out.featured = featured;
  return `${JSON.stringify(out, null, 2)}\n`;
}
