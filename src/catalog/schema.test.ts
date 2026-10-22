import { describe, expect, test } from 'vitest';
import { gameSchema, parseAspectRatio, toSummary } from './schema';

const base = {
  slug: 'orbit-hop',
  title: 'Orbit Hop',
  description: 'Hop between orbits.',
  category: 'arcade',
  source: { type: 'file', path: 'games/orbit-hop/index.html' },
  controls: ['keyboard'],
  fullscreen: true,
  mobile: 'yes',
  attribution: { author: 'Bramble' },
  license: { name: 'Original work', permission: 'Made for Bramble' },
  addedAt: '2026-10-22',
};

describe('gameSchema', () => {
  test('accepts a minimal valid file game and applies defaults', () => {
    const g = gameSchema.parse(base);
    expect(g.id).toBe('orbit-hop');
    expect(g.collection).toBe('bramble');
    expect(g.aspectRatio).toBe('16:9');
    expect(g.permissions).toEqual([]);
    expect(g.tags).toEqual([]);
    expect(g.status).toBe('available');
    expect(g.featured).toBe(false);
  });
  test('rejects slug "Bad Slug"', () => {
    expect(gameSchema.safeParse({ ...base, slug: 'Bad Slug' }).success).toBe(false);
  });
  test('rejects title longer than 80 chars', () => {
    expect(gameSchema.safeParse({ ...base, title: 'x'.repeat(81) }).success).toBe(false);
  });
  test('rejects description longer than 300 chars', () => {
    expect(gameSchema.safeParse({ ...base, description: 'x'.repeat(301) }).success).toBe(false);
  });
  test('rejects unknown category "shooter"', () => {
    expect(gameSchema.safeParse({ ...base, category: 'shooter' }).success).toBe(false);
  });
  test('rejects more than 8 tags and uppercase tags', () => {
    expect(gameSchema.safeParse({ ...base, tags: Array.from({ length: 9 }, (_, i) => `t${i}`) }).success).toBe(false);
    expect(gameSchema.safeParse({ ...base, tags: ['Puzzle'] }).success).toBe(false);
  });
  test('rejects embed url that is not https', () => {
    expect(gameSchema.safeParse({ ...base, source: { type: 'embed', url: 'http://x.com' } }).success).toBe(false);
    expect(gameSchema.safeParse({ ...base, source: { type: 'embed', url: 'https://x.com/g' } }).success).toBe(true);
  });
  test('rejects permission "camera"', () => {
    expect(gameSchema.safeParse({ ...base, permissions: ['camera'] }).success).toBe(false);
  });
  test('requires attribution.author and license.permission', () => {
    expect(gameSchema.safeParse({ ...base, attribution: {} }).success).toBe(false);
    expect(gameSchema.safeParse({ ...base, license: { name: 'x' } }).success).toBe(false);
  });
  test('toSummary keeps only card fields', () => {
    const s = toSummary(gameSchema.parse(base));
    expect(Object.keys(s).sort()).toEqual(
      ['addedAt', 'category', 'collection', 'featured', 'id', 'mobile', 'slug', 'status', 'tags', 'thumbnail', 'title'].sort(),
    );
  });
});

describe('parseAspectRatio', () => {
  test('parses "4:3"', () => expect(parseAspectRatio('4:3')).toBeCloseTo(1.3333, 3));
  test('throws on "x"', () => expect(() => parseAspectRatio('x')).toThrow());
});
