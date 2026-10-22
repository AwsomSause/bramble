/**
 * Draft games the owner is trying out. They live in THIS browser only (localStorage) and are
 * never visible to anyone else until the owner publishes them. A draft can hold the game's HTML
 * (for a file game) so it can be play-tested before it is committed.
 */
import { useSyncExternalStore } from 'react';
import { readJSON, writeJSON } from '../../lib/storage';
import { toSummary, type GameDetails, type GameSummary } from '../../catalog/schema';

export const DRAFTS_KEY = 'bramble:v1:drafts';

export type StoredDraft = {
  details: GameDetails;
  /** Raw HTML for a file game, so it can be played locally and committed on publish. */
  html?: string;
  /** A data: URL for the thumbnail image, shown locally and committed on publish. */
  thumbDataUrl?: string;
};

const isDraftArray = (v: unknown): v is StoredDraft[] =>
  Array.isArray(v) && v.every((d) => !!d && typeof d === 'object' && typeof (d as StoredDraft).details?.slug === 'string');

let cache: StoredDraft[] | undefined;
const listeners = new Set<() => void>();
const read = (): StoredDraft[] => (cache ??= readJSON(DRAFTS_KEY, [], isDraftArray));
const write = (drafts: StoredDraft[]) => {
  cache = drafts;
  writeJSON(DRAFTS_KEY, drafts);
  listeners.forEach((l) => l());
};

export const getDrafts = (): StoredDraft[] => read();
export const getDraftDetails = (slug: string): GameDetails | undefined => read().find((d) => d.details.slug === slug)?.details;
export const getDraft = (slug: string): StoredDraft | undefined => read().find((d) => d.details.slug === slug);

export function saveDraft(draft: StoredDraft): void {
  const cur = read();
  const idx = cur.findIndex((d) => d.details.slug === draft.details.slug);
  if (idx >= 0) {
    // Replace in place so the list order stays stable while you edit.
    const next = cur.slice();
    next[idx] = draft;
    write(next);
  } else {
    write([...cur, draft]);
  }
}

export function deleteDraft(slug: string): void {
  write(read().filter((d) => d.details.slug !== slug));
}

export function draftSummaries(): GameSummary[] {
  return read().map((d) => ({ ...toSummary(d.details), draft: true, thumbnail: d.thumbDataUrl ?? d.details.thumbnail }));
}

export function resetDraftCache(): void {
  cache = undefined;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === DRAFTS_KEY || e.key === null) resetDraftCache();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
};

export function useDrafts(): StoredDraft[] {
  return useSyncExternalStore(subscribe, read);
}
