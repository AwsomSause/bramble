import { describe, expect, test } from 'vitest';
import type { GameSummary } from './schema';
import { DEFAULT_QUERY, filterAndSort, normalize, paginate, parseQuery, toSearchParams, type LibraryQuery } from './query';

const g = (slug: string, title: string, over: Partial<GameSummary> = {}): GameSummary => ({
  id: slug,
  slug,
  title,
  category: 'arcade',
  tags: [],
  collection: 'bramble',
  thumbnail: undefined,
  mobile: 'yes',
  featured: false,
  addedAt: '2026-01-01',
  status: 'available',
  ...over,
});

const games = [
  g('orbit-hop', 'Orbit Hop', { tags: ['one-button'], addedAt: '2026-10-22' }),
  g('berry-blocks', 'Berry Blocks', { category: 'puzzle', tags: ['hop'], addedAt: '2026-05-01' }),
  g('hop-puzzle', 'Hop Puzzle', { category: 'puzzle', addedAt: '2026-03-01' }),
  g('zz-hidden', 'Hidden Hop', { status: 'hidden' }),
  g('crumble-race', 'Crumble Race', { category: 'racing', tags: ['cars'] }),
];
const q = (over: Partial<LibraryQuery> = {}) => {
  const { page: _page, ...rest } = { ...DEFAULT_QUERY, ...over };
  return rest;
};
const slugs = (list: GameSummary[]) => list.map((x) => x.slug);

describe('normalize', () => {
  test('lowercases, strips accents, collapses whitespace', () => {
    expect(normalize('  ORBÍT   Hop ')).toBe('orbit hop');
  });
});

describe('filterAndSort', () => {
  test('"orbit" finds "Orbit Hop"', () => expect(slugs(filterAndSort(games, q({ q: 'orbit' })))).toEqual(['orbit-hop']));
  test('"ORBÍT" (accented, uppercase) finds it', () =>
    expect(slugs(filterAndSort(games, q({ q: 'ORBÍT' })))).toEqual(['orbit-hop']));
  test('"hop puzzle" requires both tokens', () =>
    expect(slugs(filterAndSort(games, q({ q: 'hop puzzle' })))).toEqual(['hop-puzzle', 'berry-blocks']));
  test('title-prefix match ranks above tag-only match', () => {
    // "Hop Puzzle" starts with "hop" (rank 0); "Orbit Hop" contains it (rank 1); Berry Blocks only via tag (rank 2)
    expect(slugs(filterAndSort(games, q({ q: 'hop' })))).toEqual(['hop-puzzle', 'orbit-hop', 'berry-blocks']);
  });
  test('regex chars ".*(" do not throw and match literally', () => {
    expect(() => filterAndSort(games, q({ q: '.*(' }))).not.toThrow();
    expect(filterAndSort(games, q({ q: '.*(' }))).toEqual([]);
  });
  test('whitespace-only q returns all visible games', () =>
    expect(filterAndSort(games, q({ q: '   ' }))).toHaveLength(4));
  test('500-char q returns []', () => expect(filterAndSort(games, q({ q: 'a'.repeat(500) }))).toEqual([]));
  test('hidden games are never returned', () =>
    expect(slugs(filterAndSort(games, q()))).not.toContain('zz-hidden'));
  test('default sort is A–Z', () =>
    expect(slugs(filterAndSort(games, q()))).toEqual(['berry-blocks', 'crumble-race', 'hop-puzzle', 'orbit-hop']));
  test('cat filter', () =>
    expect(slugs(filterAndSort(games, q({ cat: 'puzzle' })))).toEqual(['berry-blocks', 'hop-puzzle']));
  test('tag filter', () => expect(slugs(filterAndSort(games, q({ tag: 'cars' })))).toEqual(['crumble-race']));
  test('collection filter', () => {
    const list = [...games, g('x', 'Xeno', { collection: 'partner' })];
    expect(slugs(filterAndSort(list, q({ collection: 'partner' })))).toEqual(['x']);
  });
  test('sort za', () =>
    expect(slugs(filterAndSort(games, q({ sort: 'za' })))).toEqual(['orbit-hop', 'hop-puzzle', 'crumble-race', 'berry-blocks']));
  test('sort new', () =>
    expect(slugs(filterAndSort(games, q({ sort: 'new' })))[0]).toBe('orbit-hop'));
});

describe('paginate', () => {
  const items = Array.from({ length: 30 }, (_, i) => i);
  test('paginate(30 items, 2) → 6 items, totalPages 2', () => {
    const p = paginate(items, 2);
    expect(p.items).toHaveLength(6);
    expect(p.totalPages).toBe(2);
    expect(p.total).toBe(30);
  });
  test('page 999 clamps to last', () => expect(paginate(items, 999).page).toBe(2));
  test('page 0 clamps to first', () => expect(paginate(items, 0).page).toBe(1));
  test('empty → page 1, totalPages 1', () => expect(paginate([], 3)).toEqual({ items: [], page: 1, totalPages: 1, total: 0 }));
});

describe('URL state', () => {
  test('parseQuery("page=abc&cat=nope&sort=zzz") equals DEFAULT_QUERY', () =>
    expect(parseQuery(new URLSearchParams('page=abc&cat=nope&sort=zzz'))).toEqual(DEFAULT_QUERY));
  test('negative and fractional pages fall back to 1', () => {
    expect(parseQuery(new URLSearchParams('page=-3')).page).toBe(1);
    expect(parseQuery(new URLSearchParams('page=2.5')).page).toBe(1);
  });
  test('toSearchParams(DEFAULT_QUERY) is empty', () => expect(toSearchParams(DEFAULT_QUERY).toString()).toBe(''));
  test('round-trip', () => {
    const full: LibraryQuery = { q: 'hop', cat: 'puzzle', tag: 'one-button', collection: 'bramble', sort: 'new', page: 3 };
    expect(parseQuery(toSearchParams(full))).toEqual(full);
  });
});
