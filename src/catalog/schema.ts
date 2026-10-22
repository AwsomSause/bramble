import { z } from 'zod';

/** Game categories. Keep in sync with catalog/categories.json. */
export const CATEGORIES = ['action', 'puzzle', 'arcade', 'racing', 'sports', 'strategy', 'platformer', 'casual'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CONTROLS = ['keyboard', 'mouse', 'touch', 'gamepad'] as const;
export type Control = (typeof CONTROLS)[number];

/**
 * Extra capabilities a game may ask for. Everything not listed here is denied.
 * See src/catalog/frame.ts for how each maps to iframe sandbox/allow tokens.
 */
export const PERMISSIONS = [
  'pointer-lock',
  'forms',
  'modals',
  'orientation-lock',
  'fullscreen',
  'gamepad',
  'autoplay',
  'storage',
  'popups',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Only safe for games served from another site's origin. */
export const EMBED_ONLY_PERMISSIONS: readonly Permission[] = ['storage', 'popups'];

const slug = z.string().regex(/^[a-z0-9-]+$/, 'use lowercase letters, numbers and dashes');

const source = z.discriminatedUnion('type', [
  z.object({ type: z.literal('file'), path: z.string().min(1) }),
  z.object({
    type: z.literal('embed'),
    url: z.url({ protocol: /^https$/, error: 'embed url must start with https://' }),
  }),
]);

export const gameSchema = z
  .object({
    id: z.string().min(1).optional(),
    slug,
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(300),
    instructions: z.string().max(1000).optional(),
    thumbnail: z.string().min(1).optional(),
    category: z.enum(CATEGORIES),
    tags: z
      .array(z.string().regex(/^[a-z0-9-]+$/, 'tags are lowercase'))
      .max(8)
      .default([]),
    collection: slug.default('bramble'),
    source,
    controls: z.array(z.enum(CONTROLS)).min(1),
    fullscreen: z.boolean(),
    mobile: z.enum(['yes', 'partial', 'no']),
    aspectRatio: z
      .string()
      .regex(/^[1-9]\d*:[1-9]\d*$/, 'use two whole numbers above zero, like 16:9')
      .default('16:9'),
    permissions: z.array(z.enum(PERMISSIONS)).default([]),
    attribution: z.object({ author: z.string().min(1), url: z.url().optional() }),
    license: z.object({ name: z.string().min(1), url: z.url().optional(), permission: z.string().min(1) }),
    status: z.enum(['available', 'broken', 'hidden']).default('available'),
    featured: z.boolean().default(false),
    addedAt: z.iso.date(),
  })
  .strict()
  .transform((g) => ({ ...g, id: g.id ?? g.slug }));

export type Game = z.output<typeof gameSchema>;

export type GameSummary = Pick<
  Game,
  'id' | 'slug' | 'title' | 'category' | 'tags' | 'collection' | 'thumbnail' | 'mobile' | 'featured' | 'addedAt' | 'status'
>;

export type GameDetails = Game & { embedBlocked: boolean };

export function toSummary(g: Game): GameSummary {
  return {
    id: g.id,
    slug: g.slug,
    title: g.title,
    category: g.category,
    tags: g.tags,
    collection: g.collection,
    thumbnail: g.thumbnail,
    mobile: g.mobile,
    featured: g.featured,
    addedAt: g.addedAt,
    status: g.status,
  };
}

/** "16:9" → 1.777… */
export function parseAspectRatio(s: string): number {
  const m = /^(\d+):(\d+)$/.exec(s);
  if (!m) throw new Error(`bad aspect ratio: ${s}`);
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) throw new Error(`bad aspect ratio: ${s}`);
  return w / h;
}
