import { describe, expect, test } from 'vitest';
import { gameSchema } from '../../src/catalog/schema';
import { planAddGame, slugify, type AddGameInput } from './add-game-core';

const deps = (files: string[] = [], dirs: string[] = []) => ({
  isFile: (p: string) => files.includes(p),
  isDir: (p: string) => dirs.includes(p),
});
const base: AddGameInput = {
  kind: 'html',
  from: 'downloads/hello.html',
  title: 'Hello Berry',
  category: 'casual',
  description: 'A tiny test game.',
  author: 'Me',
  permission: 'I made it',
};
const plan = (over: Partial<AddGameInput> = {}, d = deps(['downloads/hello.html']), slugs: string[] = [], hosts: string[] = []) =>
  planAddGame({ ...base, ...over }, new Set(slugs), hosts, '2026-10-22', d);

describe('slugify', () => {
  test('"Bloons: TD 5!" → "bloons-td-5"', () => expect(slugify('Bloons: TD 5!')).toBe('bloons-td-5'));
  test('accents and spaces', () => expect(slugify('  Crème  Brûlée ')).toBe('creme-brulee'));
  test('empty-ish titles still give a slug', () => expect(slugify('!!!')).toBe('game'));
});

describe('planAddGame', () => {
  test('duplicate slug gets "-2" suffix', () => {
    expect(plan({}, undefined, ['hello-berry']).entry.slug).toBe('hello-berry-2');
    expect(plan({}, undefined, ['hello-berry', 'hello-berry-2']).entry.slug).toBe('hello-berry-3');
  });
  test('html kind copies file to games/<slug>/index.html', () => {
    const p = plan();
    expect(p.copies).toEqual([{ kind: 'file', from: 'downloads/hello.html', to: 'games/hello-berry/index.html' }]);
    expect(p.entry.source).toEqual({ type: 'file', path: 'games/hello-berry/index.html' });
    expect(p.newHost).toBeNull();
  });
  test('html kind requires the file to exist', () => {
    expect(() => plan({}, deps())).toThrow('file not found: downloads/hello.html');
  });
  test('folder kind requires index.html inside', () => {
    expect(() => plan({ kind: 'folder', from: 'dl/game' }, deps([], ['dl/game']))).toThrow(
      'folder must contain index.html',
    );
    const p = plan({ kind: 'folder', from: 'dl/game' }, deps(['dl/game/index.html'], ['dl/game']));
    expect(p.copies).toEqual([{ kind: 'dir', from: 'dl/game', to: 'games/hello-berry' }]);
  });
  test('link kind returns newHost when host unknown, null when known', () => {
    const link = { kind: 'link' as const, from: 'https://play.example.com/g/1' };
    expect(plan(link).newHost).toBe('play.example.com');
    expect(plan(link, undefined, [], ['play.example.com']).newHost).toBeNull();
    expect(plan(link).entry.source).toEqual({ type: 'embed', url: 'https://play.example.com/g/1' });
    expect(plan(link).copies).toEqual([]);
  });
  test('link must be https', () => {
    expect(() => plan({ kind: 'link', from: 'http://play.example.com' })).toThrow(/https/);
    expect(() => plan({ kind: 'link', from: 'not a url' })).toThrow(/https/);
  });
  test('entry passes gameSchema with sensible defaults', () => {
    const e = plan().entry;
    expect(gameSchema.safeParse(e).success).toBe(true);
    expect(e.controls).toEqual(['keyboard', 'mouse']);
    expect(e.mobile).toBe('partial');
    expect(e.fullscreen).toBe(true);
    expect(e.addedAt).toBe('2026-10-22');
    expect(e.license).toEqual({ name: 'Used with permission', permission: 'I made it' });
  });
  test('thumbnail copied to public/thumbs/<slug>.<ext>', () => {
    const p = plan({ thumbnail: 'pics/Shot.PNG' }, deps(['downloads/hello.html', 'pics/Shot.PNG']));
    expect(p.copies).toContainEqual({ kind: 'file', from: 'pics/Shot.PNG', to: 'public/thumbs/hello-berry.png' });
    expect(p.entry.thumbnail).toBe('thumbs/hello-berry.png');
  });
  test('rejects unsupported thumbnail types', () => {
    expect(() => plan({ thumbnail: 'x.exe' }, deps(['downloads/hello.html', 'x.exe']))).toThrow(/thumbnail/);
  });
});
