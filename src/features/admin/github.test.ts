import { describe, expect, test, vi } from 'vitest';
import { buildCommitFiles, canPublishHere, publishToGitHub } from './github';
import type { StoredDraft } from './drafts';
import type { GameDetails } from '../../catalog/schema';

const details = (over: Partial<GameDetails> = {}): GameDetails => ({
  id: 'orbit-two',
  slug: 'orbit-two',
  title: 'Orbit Two',
  description: 'A second orbit game.',
  category: 'arcade',
  tags: ['one-button'],
  collection: 'bramble',
  source: { type: 'file', path: 'games/orbit-two/index.html' },
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

describe('canPublishHere', () => {
  test('only on local dev hosts', () => {
    expect(canPublishHere('localhost')).toBe(true);
    expect(canPublishHere('127.0.0.1')).toBe(true);
    expect(canPublishHere('my-app.localhost')).toBe(true);
    expect(canPublishHere('awsomsause.github.io')).toBe(false);
    expect(canPublishHere('bramble.fun')).toBe(false);
  });
});

describe('buildCommitFiles', () => {
  test('a file draft commits the entry json, html and thumbnail', () => {
    const draft: StoredDraft = {
      details: details(),
      html: '<!doctype html><title>Orbit Two</title>',
      thumbDataUrl: 'data:image/png;base64,QUJD',
    };
    const files = buildCommitFiles(draft);
    const byPath = Object.fromEntries(files.map((f) => [f.path, f]));
    expect(Object.keys(byPath).sort()).toEqual([
      'catalog/games/orbit-two.json',
      'games/orbit-two/index.html',
      'public/thumbs/orbit-two.png',
    ]);
    expect(byPath['games/orbit-two/index.html']!.text).toContain('<title>Orbit Two');
    expect(byPath['public/thumbs/orbit-two.png']!.base64).toBe('QUJD');
    const entry = JSON.parse(byPath['catalog/games/orbit-two.json']!.text!);
    expect(entry.slug).toBe('orbit-two');
    expect(entry.thumbnail).toBe('thumbs/orbit-two.png');
    expect(entry.source).toEqual({ type: 'file', path: 'games/orbit-two/index.html' });
    // never writes build-time-only or runtime fields
    expect(entry.embedBlocked).toBeUndefined();
    expect(entry.id).toBeUndefined();
  });

  test('an embed draft commits only the entry json', () => {
    const draft: StoredDraft = {
      details: details({ source: { type: 'embed', url: 'https://games.example.com/g' } }),
    };
    const files = buildCommitFiles(draft);
    expect(files.map((f) => f.path)).toEqual(['catalog/games/orbit-two.json']);
    expect(JSON.parse(files[0]!.text!).source).toEqual({ type: 'embed', url: 'https://games.example.com/g' });
  });
});

describe('publishToGitHub', () => {
  const draft: StoredDraft = { details: details(), html: '<html></html>' };
  const okJson = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

  test('creates new files (no sha) and updates existing ones (with sha)', async () => {
    const calls: { method: string; url: string; sha?: string }[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? (JSON.parse(init.body as string) as { sha?: string }) : {};
      calls.push({ method, url, sha: body.sha });
      if (method === 'GET') {
        // the json entry already exists (has a sha); the html is new (404)
        return url.includes('catalog/games/orbit-two.json') ? okJson({ sha: 'existing-sha' }) : okJson({}, 404);
      }
      return okJson({ content: { html_url: `https://github.com/x/${url}` }, commit: { sha: 'new' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await publishToGitHub({
      owner: 'AwsomSause',
      repo: 'bramble',
      branch: 'main',
      token: 'ghp_test',
      message: 'add orbit-two',
      files: buildCommitFiles(draft),
    });

    expect(res.committed.sort()).toEqual(['catalog/games/orbit-two.json', 'games/orbit-two/index.html']);
    const puts = calls.filter((c) => c.method === 'PUT');
    expect(puts.find((c) => c.url.includes('orbit-two.json'))!.sha).toBe('existing-sha');
    expect(puts.find((c) => c.url.includes('index.html'))!.sha).toBeUndefined();
    // token is sent as an Authorization header, never in the URL
    expect(calls.every((c) => !c.url.includes('ghp_test'))).toBe(true);
    const authHeader = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(authHeader.Authorization).toBe('Bearer ghp_test');
  });

  test('throws a helpful error on a 401', async () => {
    vi.stubGlobal('fetch', vi.fn(() => okJson({ message: 'Bad credentials' }, 401)));
    await expect(
      publishToGitHub({ owner: 'o', repo: 'r', branch: 'main', token: 'bad', message: 'm', files: buildCommitFiles(draft) }),
    ).rejects.toThrow(/token|credential|401/i);
  });
});
