/**
 * Pure functions behind the game library: searching, filtering, sorting, paging,
 * and reading/writing that state from the URL (?q=&cat=&tag=&collection=&sort=&page=).
 */
import { CATEGORIES, type Category, type GameSummary } from './schema';

export type SortKey = 'az' | 'za' | 'new';
export const SORTS: readonly SortKey[] = ['az', 'za', 'new'];

export type LibraryQuery = {
  q: string;
  cat: Category | 'all';
  tag: string | null;
  collection: string | null;
  sort: SortKey;
  page: number;
};

export const DEFAULT_QUERY: LibraryQuery = { q: '', cat: 'all', tag: null, collection: null, sort: 'az', page: 1 };
export const PER_PAGE = 24;

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const byTitle = (a: GameSummary, b: GameSummary) => a.title.localeCompare(b.title);
const comparators: Record<SortKey, (a: GameSummary, b: GameSummary) => number> = {
  az: byTitle,
  za: (a, b) => byTitle(b, a),
  new: (a, b) => b.addedAt.localeCompare(a.addedAt) || byTitle(a, b),
};

/** 0 = title starts with the query, 1 = title contains every word, 2 = matched via tags/category, -1 = no match. */
function rank(game: GameSummary, query: string, tokens: string[]): number {
  if (!tokens.length) return 0;
  const title = normalize(game.title);
  const others = [...game.tags.map(normalize), game.category];
  const matchesAll = tokens.every((t) => title.includes(t) || others.some((o) => o.includes(t)));
  if (!matchesAll) return -1;
  if (title.startsWith(query)) return 0;
  if (tokens.every((t) => title.includes(t))) return 1;
  return 2;
}

export function filterAndSort(games: GameSummary[], q: Omit<LibraryQuery, 'page'>): GameSummary[] {
  const query = normalize(q.q);
  const tokens = query ? query.split(' ') : [];
  const compare = comparators[q.sort];
  return games
    .filter(
      (g) =>
        g.status !== 'hidden' &&
        (q.cat === 'all' || g.category === q.cat) &&
        (!q.tag || g.tags.includes(q.tag)) &&
        (!q.collection || g.collection === q.collection),
    )
    .map((g) => ({ g, r: rank(g, query, tokens) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || compare(a.g, b.g))
    .map((x) => x.g);
}

export function paginate<T>(
  items: T[],
  page: number,
  perPage = PER_PAGE,
): { items: T[]; page: number; totalPages: number; total: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  return { items: items.slice((p - 1) * perPage, p * perPage), page: p, totalPages, total: items.length };
}

export function parseQuery(p: URLSearchParams): LibraryQuery {
  const cat = p.get('cat');
  const sort = p.get('sort');
  const pageRaw = p.get('page');
  const page = pageRaw && /^\d+$/.test(pageRaw) ? Number(pageRaw) : 1;
  return {
    q: (p.get('q') ?? '').slice(0, 500),
    cat: (CATEGORIES as readonly string[]).includes(cat ?? '') ? (cat as Category) : 'all',
    tag: p.get('tag') || null,
    collection: p.get('collection') || null,
    sort: (SORTS as readonly string[]).includes(sort ?? '') ? (sort as SortKey) : 'az',
    page: page >= 1 ? page : 1,
  };
}

export function toSearchParams(q: LibraryQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (q.q) p.set('q', q.q);
  if (q.cat !== 'all') p.set('cat', q.cat);
  if (q.tag) p.set('tag', q.tag);
  if (q.collection) p.set('collection', q.collection);
  if (q.sort !== 'az') p.set('sort', q.sort);
  if (q.page > 1) p.set('page', String(q.page));
  return p;
}
