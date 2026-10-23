import { beforeEach, describe, expect, test } from 'vitest';
import { deleteDraft, draftSummaries, getDraftDetails, getDrafts, resetDraftCache, saveDraft, type StoredDraft } from './drafts';
import type { GameDetails } from '../../catalog/schema';

const details = (slug: string, over: Partial<GameDetails> = {}): GameDetails => ({
  id: slug,
  slug,
  title: `Game ${slug}`,
  description: 'A draft game.',
  category: 'arcade',
  tags: [],
  collection: 'draft',
  source: { type: 'file', path: `games/${slug}/index.html` },
  controls: ['keyboard'],
  fullscreen: true,
  mobile: 'yes',
  aspectRatio: '16:9',
  permissions: [],
  attribution: { author: 'Me' },
  license: { name: 'Mine', permission: 'I made it' },
  status: 'available',
  featured: false,
  addedAt: '2026-10-22',
  embedBlocked: false,
  ...over,
});

const draft = (slug: string, over: Partial<StoredDraft> = {}): StoredDraft => ({
  details: details(slug),
  html: '<!doctype html><title>x</title>',
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  resetDraftCache();
});

describe('draft store', () => {
  test('save then read a draft', () => {
    saveDraft(draft('orbit-two'));
    expect(getDrafts().map((d) => d.details.slug)).toEqual(['orbit-two']);
    expect(getDraftDetails('orbit-two')?.title).toBe('Game orbit-two');
    expect(getDraftDetails('nope')).toBeUndefined();
  });

  test('saving the same slug replaces it, newest first', () => {
    saveDraft(draft('a'));
    saveDraft(draft('b'));
    saveDraft({ ...draft('a'), details: details('a', { title: 'Updated A' }) });
    expect(getDrafts().map((d) => d.details.slug)).toEqual(['a', 'b']);
    expect(getDraftDetails('a')?.title).toBe('Updated A');
  });

  test('delete removes a draft', () => {
    saveDraft(draft('a'));
    saveDraft(draft('b'));
    deleteDraft('a');
    expect(getDrafts().map((d) => d.details.slug)).toEqual(['b']);
  });

  test('draftSummaries are tagged draft and carry the thumb data url', () => {
    saveDraft(draft('a', { thumbDataUrl: 'data:image/png;base64,AAAA' }));
    const [s] = draftSummaries();
    expect(s!.draft).toBe(true);
    expect(s!.thumbnail).toBe('data:image/png;base64,AAAA');
    expect(s!.slug).toBe('a');
  });

  test('corrupt storage is ignored, not thrown', () => {
    localStorage.setItem('bramble:v1:drafts', '{not json');
    resetDraftCache();
    expect(getDrafts()).toEqual([]);
  });
});
