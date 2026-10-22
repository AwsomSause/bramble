import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { GameDetails } from '../../catalog/schema';
import { LOAD_TIMEOUT_MS, usePlayerState } from './usePlayerState';

const game = (over: Partial<GameDetails> = {}) =>
  ({ slug: 'g', status: 'available', embedBlocked: false, ...over }) as GameDetails;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('timeout is 15 s', () => expect(LOAD_TIMEOUT_MS).toBe(15_000));
test('broken → unavailable', () => {
  expect(renderHook(() => usePlayerState(game({ status: 'broken' }))).result.current.state).toBe('unavailable');
});
test('embedBlocked → blocked', () => {
  expect(renderHook(() => usePlayerState(game({ embedBlocked: true }))).result.current.state).toBe('blocked');
});
test('ready on frame load', () => {
  const { result } = renderHook(() => usePlayerState(game()));
  expect(result.current.state).toBe('loading');
  act(() => result.current.onFrameLoad());
  expect(result.current.state).toBe('ready');
});
test('ready on bridge message', () => {
  const { result } = renderHook(() => usePlayerState(game()));
  act(() => result.current.onReadyMessage());
  expect(result.current.state).toBe('ready');
});
test('15 s without a signal → timeout', () => {
  const { result } = renderHook(() => usePlayerState(game()));
  act(() => vi.advanceTimersByTime(14_999));
  expect(result.current.state).toBe('loading');
  act(() => vi.advanceTimersByTime(1));
  expect(result.current.state).toBe('timeout');
});
test('retry returns to loading with a new frame key', () => {
  const { result } = renderHook(() => usePlayerState(game()));
  act(() => vi.advanceTimersByTime(15_000));
  const key = result.current.frameKey;
  act(() => result.current.retry());
  expect(result.current.state).toBe('loading');
  expect(result.current.frameKey).not.toBe(key);
});
test('a late load after ready does not change state; ready after timeout recovers', () => {
  const { result } = renderHook(() => usePlayerState(game()));
  act(() => vi.advanceTimersByTime(15_000));
  act(() => result.current.onReadyMessage());
  expect(result.current.state).toBe('ready');
});
