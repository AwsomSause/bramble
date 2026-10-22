import { describe, expect, test } from 'vitest';
import { gameSchema, PERMISSIONS, type Game } from './schema';
import { buildFrameAttrs, parseGameMessage, reportIssueUrl } from './frame';

const make = (over: Record<string, unknown> = {}): Game =>
  gameSchema.parse({
    slug: 'orbit-hop',
    title: 'Orbit Hop',
    description: 'Hop between orbits.',
    category: 'arcade',
    source: { type: 'file', path: 'games/orbit-hop/index.html' },
    controls: ['keyboard'],
    fullscreen: true,
    mobile: 'yes',
    attribution: { author: 'Bramble' },
    license: { name: 'Original', permission: 'Mine' },
    addedAt: '2026-10-22',
    ...over,
  });
const embed = (permissions: string[]) => make({ source: { type: 'embed', url: 'https://games.example.com/g' }, permissions });

describe('buildFrameAttrs', () => {
  test('file game: sandbox is exactly "allow-scripts"', () => {
    expect(buildFrameAttrs(make(), '/bramble/').sandbox).toBe('allow-scripts');
  });
  test('file game never gets allow-same-origin even if permissions include storage', () => {
    // bypass the validator on purpose: defense in depth
    const g = { ...make(), permissions: ['storage', 'popups'] } as Game;
    const s = buildFrameAttrs(g, '/bramble/').sandbox;
    expect(s).not.toContain('allow-same-origin');
    expect(s).not.toContain('allow-popups');
  });
  test('embed with storage+popups → contains allow-same-origin and allow-popups', () => {
    const s = buildFrameAttrs(embed(['storage', 'popups']), '/bramble/').sandbox.split(' ');
    expect(s).toEqual(expect.arrayContaining(['allow-scripts', 'allow-same-origin', 'allow-popups']));
  });
  test('never emits allow-top-navigation or allow-popups-to-escape-sandbox', () => {
    const s = buildFrameAttrs(embed([...PERMISSIONS]), '/bramble/').sandbox;
    expect(s).not.toMatch(/allow-top-navigation|allow-popups-to-escape-sandbox/);
  });
  test('maps every approved sandbox token', () => {
    const s = buildFrameAttrs(make({ permissions: ['pointer-lock', 'forms', 'modals', 'orientation-lock'] }), '/b/').sandbox;
    expect(s).toBe('allow-scripts allow-pointer-lock allow-forms allow-modals allow-orientation-lock');
  });
  test('allow is "" when no fullscreen/gamepad/autoplay', () => {
    expect(buildFrameAttrs(make(), '/bramble/').allow).toBe('');
  });
  test('allow lists "fullscreen; gamepad"', () => {
    expect(buildFrameAttrs(make({ permissions: ['fullscreen', 'gamepad'] }), '/bramble/').allow).toBe('fullscreen; gamepad');
  });
  test('src for file game is "/bramble/games/orbit-hop/index.html"', () => {
    const a = buildFrameAttrs(make(), '/bramble/');
    expect(a.src).toBe('/bramble/games/orbit-hop/index.html');
    expect(a.title).toBe('Orbit Hop');
    expect(a.referrerPolicy).toBe('no-referrer');
  });
  test('src for embed is the url', () => {
    expect(buildFrameAttrs(embed([]), '/bramble/').src).toBe('https://games.example.com/g');
  });
});

describe('parseGameMessage', () => {
  test('accepts ready', () => expect(parseGameMessage({ type: 'bramble:ready' })).toEqual({ type: 'bramble:ready' }));
  test('accepts integer score', () =>
    expect(parseGameMessage({ type: 'bramble:score', score: 42 })).toEqual({ type: 'bramble:score', score: 42 }));
  test('rejects bad payloads', () => {
    for (const bad of [
      { type: 'bramble:score', score: '9' },
      { type: 'bramble:score', score: NaN },
      { type: 'bramble:score', score: 1.5 },
      { type: 'bramble:other' },
      null,
      'bramble:ready',
      42,
    ]) {
      expect(parseGameMessage(bad)).toBeNull();
    }
  });
});

describe('reportIssueUrl', () => {
  test('encodes title and contains slug', () => {
    const u = new URL(reportIssueUrl({ slug: 'orbit-hop', title: 'Orbit & Hop' }, 'TestAgent/1'));
    expect(u.pathname.endsWith('/issues/new')).toBe(true);
    expect(u.searchParams.get('title')).toBe('Broken game: Orbit & Hop');
    expect(u.searchParams.get('body')).toContain('orbit-hop');
    expect(u.searchParams.get('body')).toContain('TestAgent/1');
  });
});
