import { expect, test } from 'vitest';
import { resolveAnswer } from './prompt';

test('typed answer wins', () => expect(resolveAnswer('tags', 'x')).toBe('tags'));
test('empty answer uses the fallback, even an empty-string fallback (optional prompts)', () => {
  expect(resolveAnswer('', 'casual')).toBe('casual');
  expect(resolveAnswer('', '')).toBe('');
});
test('empty answer with no fallback means ask again', () => expect(resolveAnswer('', undefined)).toBeNull());
