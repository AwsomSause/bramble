/**
 * Loads the built catalog files from /bramble/catalog/. Results are cached for the
 * whole visit; failed loads are not cached, so Retry really tries again.
 */
import { useCallback, useEffect, useState } from 'react';
import type { GameDetails, GameSummary } from './schema';

class NotFound extends Error {}

const cache = new Map<string, Promise<unknown>>();

function load<T>(url: string, check: (v: unknown) => v is T): Promise<T> {
  let p = cache.get(url) as Promise<T> | undefined;
  if (!p) {
    p = fetch(url).then(async (res) => {
      if (res.status === 404) throw new NotFound(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      if (!check(data)) throw new Error('unexpected catalog format');
      return data;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

export function resetCatalogCache(): void {
  cache.clear();
}

const isArray = (v: unknown): v is GameSummary[] => Array.isArray(v);
const isDetails = (v: unknown): v is GameDetails =>
  !!v && typeof v === 'object' && typeof (v as { slug?: unknown }).slug === 'string';

type Status = 'loading' | 'ready' | 'error' | 'notfound';

function useResource<T>(url: string, check: (v: unknown) => v is T) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; status: Status; data?: T }>({ key: '', status: 'loading' });
  const key = `${url}#${attempt}`;

  useEffect(() => {
    let live = true;
    load(url, check).then(
      (data) => live && setState({ key, status: 'ready', data }),
      (e: unknown) => live && setState({ key, status: e instanceof NotFound ? 'notfound' : 'error' }),
    );
    return () => {
      live = false;
    };
  }, [url, key, check]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  // While a new url/attempt is in flight, report loading rather than a stale result.
  const current = state.key === key ? state : { status: 'loading' as Status, data: undefined };
  return { status: current.status, data: current.data, retry };
}

export function useCatalogIndex(): { status: 'loading' | 'ready' | 'error'; games: GameSummary[]; retry(): void } {
  const r = useResource(`${import.meta.env.BASE_URL}catalog/index.json`, isArray);
  return { status: r.status === 'notfound' ? 'error' : r.status, games: r.data ?? [], retry: r.retry };
}

export function useGameDetails(slug: string): {
  status: 'loading' | 'ready' | 'notfound' | 'error';
  game?: GameDetails;
  retry(): void;
} {
  const valid = /^[a-z0-9-]+$/.test(slug);
  const r = useResource(`${import.meta.env.BASE_URL}catalog/games/${valid ? slug : '_invalid_'}.json`, isDetails);
  return { status: r.status, game: r.data, retry: r.retry };
}

export type Credit = { slug: string; title: string; author: string; authorUrl?: string; license: string; licenseUrl?: string };
const isCredits = (v: unknown): v is Credit[] => Array.isArray(v);

export function useCredits(): { status: 'loading' | 'ready' | 'error'; credits: Credit[]; retry(): void } {
  const r = useResource(`${import.meta.env.BASE_URL}catalog/credits.json`, isCredits);
  return { status: r.status === 'notfound' ? 'error' : r.status, credits: r.data ?? [], retry: r.retry };
}
