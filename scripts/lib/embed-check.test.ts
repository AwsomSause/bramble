import { describe, expect, test } from 'vitest';
import { analyzeFrameHeaders, portalOriginFromRepo } from './embed-check';

const ORIGIN = 'https://x.github.io';
const h = (init: Record<string, string>) => new Headers(init);

describe('analyzeFrameHeaders', () => {
  test('XFO DENY → blocked', () => expect(analyzeFrameHeaders(h({ 'x-frame-options': 'DENY' }), ORIGIN)).toBe('blocked'));
  test('XFO sameorigin (lowercase) → blocked', () =>
    expect(analyzeFrameHeaders(h({ 'x-frame-options': 'sameorigin' }), ORIGIN)).toBe('blocked'));
  test("frame-ancestors 'self' → blocked", () =>
    expect(analyzeFrameHeaders(h({ 'content-security-policy': "default-src *; frame-ancestors 'self'" }), ORIGIN)).toBe('blocked'));
  test("frame-ancestors 'none' → blocked", () =>
    expect(analyzeFrameHeaders(h({ 'content-security-policy': "frame-ancestors 'none'" }), ORIGIN)).toBe('blocked'));
  test('frame-ancestors listing our origin → ok', () =>
    expect(analyzeFrameHeaders(h({ 'content-security-policy': 'frame-ancestors https://x.github.io https://y.com' }), ORIGIN)).toBe('ok'));
  test('frame-ancestors wildcard host pattern matching us → ok', () =>
    expect(analyzeFrameHeaders(h({ 'content-security-policy': 'frame-ancestors https://*.github.io' }), ORIGIN)).toBe('ok'));
  test('frame-ancestors * → ok', () =>
    expect(analyzeFrameHeaders(h({ 'content-security-policy': 'frame-ancestors *' }), ORIGIN)).toBe('ok'));
  test('frame-ancestors for other sites only → blocked', () =>
    expect(analyzeFrameHeaders(h({ 'content-security-policy': 'frame-ancestors https://partner.com' }), ORIGIN)).toBe('blocked'));
  test('CSP without frame-ancestors → ok', () =>
    expect(analyzeFrameHeaders(h({ 'content-security-policy': "default-src 'self'" }), ORIGIN)).toBe('ok'));
  test('no headers → ok', () => expect(analyzeFrameHeaders(h({}), ORIGIN)).toBe('ok'));
});

describe('portalOriginFromRepo', () => {
  test('derives the GitHub Pages origin', () =>
    expect(portalOriginFromRepo('https://github.com/Jimmy/bramble')).toBe('https://jimmy.github.io'));
});
