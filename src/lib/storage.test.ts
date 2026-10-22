import { expect, test, vi } from 'vitest';
import { readJSON, writeJSON } from './storage';

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

test('readJSON returns fallback when localStorage.getItem throws', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('SecurityError');
  });
  expect(readJSON('k', ['fb'], isStrings)).toEqual(['fb']);
});

test('readJSON returns fallback when value is "{bad"', () => {
  localStorage.setItem('k', '{bad');
  expect(readJSON('k', [], isStrings)).toEqual([]);
});

test('readJSON returns fallback when guard fails', () => {
  localStorage.setItem('k', '{"a":1}');
  expect(readJSON('k', [], isStrings)).toEqual([]);
});

test('readJSON returns stored value when valid', () => {
  localStorage.setItem('k', '["a"]');
  expect(readJSON('k', [], isStrings)).toEqual(['a']);
});

test('writeJSON returns false when setItem throws (quota)', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError');
  });
  expect(writeJSON('k', [1])).toBe(false);
});

test('writeJSON stores JSON and returns true', () => {
  expect(writeJSON('k', ['x'])).toBe(true);
  expect(localStorage.getItem('k')).toBe('["x"]');
});
