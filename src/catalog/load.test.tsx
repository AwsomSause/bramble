import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useCatalogIndex, useGameDetails } from './load';

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

test('useCatalogIndex: fetch rejects → status error; retry → ready', async () => {
  const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('network')).mockImplementation(() => ok([{ slug: 'a' }]));
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useCatalogIndex());
  await waitFor(() => expect(result.current.status).toBe('error'));
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.games).toHaveLength(1);
  expect(fetchMock).toHaveBeenCalledWith('/bramble/catalog/index.json');
});

test('useCatalogIndex: non-array JSON → error', async () => {
  vi.stubGlobal('fetch', vi.fn(() => ok({ nope: true })));
  const { result } = renderHook(() => useCatalogIndex());
  await waitFor(() => expect(result.current.status).toBe('error'));
});

test('useGameDetails: 404 → notfound', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 404 }))));
  const { result } = renderHook(() => useGameDetails('ghost'));
  await waitFor(() => expect(result.current.status).toBe('notfound'));
});

test('useGameDetails: 500 → error, retry → ready', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 500 }))
    .mockImplementation(() => ok({ slug: 'orbit-hop', title: 'Orbit Hop' }));
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useGameDetails('orbit-hop'));
  await waitFor(() => expect(result.current.status).toBe('error'));
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.game?.title).toBe('Orbit Hop');
  expect(fetchMock).toHaveBeenLastCalledWith('/bramble/catalog/games/orbit-hop.json');
});
