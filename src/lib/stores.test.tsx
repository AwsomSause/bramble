import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import { clearAllData, getFavorites, getRecent, getScores, useBestScore, useFavorites, useRecent } from './stores';

test('toggle adds then removes a slug and persists under bramble:v1:favorites', () => {
  const { result } = renderHook(() => useFavorites());
  act(() => result.current.toggle('orbit-hop'));
  expect(result.current.isFavorite('orbit-hop')).toBe(true);
  expect(JSON.parse(localStorage.getItem('bramble:v1:favorites')!)).toEqual(['orbit-hop']);
  act(() => result.current.toggle('orbit-hop'));
  expect(result.current.slugs).toEqual([]);
});

test('favorites stored as an object are ignored', () => {
  localStorage.setItem('bramble:v1:favorites', '{"a":1}');
  expect(getFavorites()).toEqual([]);
});

test('recent dedupes, newest first, caps at 20', () => {
  const { result } = renderHook(() => useRecent());
  act(() => {
    for (let i = 0; i < 25; i++) result.current.push(`g${i}`);
    result.current.push('g10');
  });
  expect(result.current.slugs[0]).toBe('g10');
  expect(result.current.slugs).toHaveLength(20);
  expect(new Set(result.current.slugs).size).toBe(20);
  expect(getRecent()).toEqual(result.current.slugs);
});

test('best score keeps max and rejects NaN, -1, 1.5, 2e9', () => {
  const { result } = renderHook(() => useBestScore('orbit-hop'));
  expect(result.current[0]).toBeNull();
  act(() => result.current[1](10));
  act(() => result.current[1](5));
  for (const bad of [NaN, -1, 1.5, 2e9]) act(() => result.current[1](bad));
  expect(result.current[0]).toBe(10);
  expect(getScores()).toEqual({ 'orbit-hop': 10 });
});

test('scores with non-numeric values are ignored', () => {
  localStorage.setItem('bramble:v1:scores', '{"a":"9"}');
  expect(getScores()).toEqual({});
});

test('clearAllData removes all four keys', () => {
  for (const k of ['favorites', 'recent', 'scores', 'settings']) localStorage.setItem(`bramble:v1:${k}`, '[]');
  localStorage.setItem('other', 'keep');
  clearAllData();
  expect(Object.keys(localStorage)).toEqual(['other']);
});

test('hooks update when another tab changes storage', () => {
  const { result } = renderHook(() => useFavorites());
  act(() => {
    localStorage.setItem('bramble:v1:favorites', '["from-other-tab"]');
    window.dispatchEvent(new StorageEvent('storage', { key: 'bramble:v1:favorites' }));
  });
  expect(result.current.slugs).toEqual(['from-other-tab']);
});
