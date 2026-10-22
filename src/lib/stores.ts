/**
 * Favorites, recently played and best scores, kept in this browser only.
 * Each store caches its parsed value so React's useSyncExternalStore gets a stable snapshot,
 * and listens for `storage` events so other open tabs stay in sync.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { readJSON, removeKey, writeJSON } from './storage';

export const KEYS = {
  favorites: 'bramble:v1:favorites',
  recent: 'bramble:v1:recent',
  scores: 'bramble:v1:scores',
  settings: 'bramble:v1:settings',
} as const;

const RECENT_MAX = 20;
const SCORE_MAX = 1e9;

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isScoreMap = (v: unknown): v is Record<string, number> =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.values(v).every((n) => typeof n === 'number' && Number.isFinite(n));

function createStore<T>(key: string, fallback: T, guard: (v: unknown) => v is T) {
  let cache: T | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const get = (): T => (cache ??= readJSON(key, fallback, guard));
  const set = (value: T) => {
    cache = value;
    writeJSON(key, value);
    notify();
  };
  const invalidate = () => {
    cache = undefined;
    notify();
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) invalidate();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener('storage', onStorage);
    };
  };
  return { get, set, invalidate, subscribe };
}

const favoritesStore = createStore<string[]>(KEYS.favorites, [], isStringArray);
const recentStore = createStore<string[]>(KEYS.recent, [], isStringArray);
const scoresStore = createStore<Record<string, number>>(KEYS.scores, {}, isScoreMap);

export const getFavorites = () => favoritesStore.get();
export const getRecent = () => recentStore.get();
export const getScores = () => scoresStore.get();

export function useFavorites() {
  const slugs = useSyncExternalStore(favoritesStore.subscribe, favoritesStore.get);
  const isFavorite = useCallback((s: string) => slugs.includes(s), [slugs]);
  const toggle = useCallback((s: string) => {
    const cur = favoritesStore.get();
    favoritesStore.set(cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  }, []);
  return { slugs, isFavorite, toggle };
}

export function useRecent() {
  const slugs = useSyncExternalStore(recentStore.subscribe, recentStore.get);
  const push = useCallback((s: string) => {
    recentStore.set([s, ...recentStore.get().filter((x) => x !== s)].slice(0, RECENT_MAX));
  }, []);
  return { slugs, push };
}

export function useBestScore(slug: string): [number | null, (score: number) => void] {
  const scores = useSyncExternalStore(scoresStore.subscribe, scoresStore.get);
  const record = useCallback(
    (score: number) => {
      if (!Number.isInteger(score) || score < 0 || score > SCORE_MAX) return;
      const cur = scoresStore.get();
      if ((cur[slug] ?? -1) >= score) return;
      scoresStore.set({ ...cur, [slug]: score });
    },
    [slug],
  );
  return [scores[slug] ?? null, record];
}

export function clearAllData(): void {
  for (const k of Object.values(KEYS)) removeKey(k);
  favoritesStore.invalidate();
  recentStore.invalidate();
  scoresStore.invalidate();
}

/** Test helper: forget cached values (localStorage is cleared between tests). */
export function resetStoreCaches(): void {
  favoritesStore.invalidate();
  recentStore.invalidate();
  scoresStore.invalidate();
}
