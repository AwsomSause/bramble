import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { buildCatalog, loadCatalog, serializeIndex } from './catalog';
import { gameSchema, toSummary } from '../../src/catalog/schema';

type Tree = Record<string, string>;

function makeRepo(tree: Tree): string {
  const root = mkdtempSync(join(tmpdir(), 'bramble-cat-'));
  const files: Tree = { 'catalog/sources.json': '{"hosts":["games.example.com"]}', ...tree };
  for (const [p, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), content);
  }
  return root;
}

function entry(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    slug: 'orbit-hop',
    title: 'Orbit Hop',
    description: 'Hop between two orbits and dodge thorns.',
    category: 'arcade',
    source: { type: 'file', path: 'games/orbit-hop/index.html' },
    controls: ['keyboard'],
    fullscreen: true,
    mobile: 'yes',
    thumbnail: 'thumbs/orbit-hop.svg',
    attribution: { author: 'Bramble' },
    license: { name: 'Original work', permission: 'Made for Bramble' },
    addedAt: '2026-10-22',
    ...over,
  });
}

const validTree: Tree = {
  'catalog/games/orbit-hop.json': entry(),
  'games/orbit-hop/index.html': '<!doctype html>',
  'public/thumbs/orbit-hop.svg': '<svg/>',
};

const errors = (issues: { level: string; message: string; file: string }[]) =>
  issues.filter((i) => i.level === 'error');

describe('loadCatalog', () => {
  test('valid fixture yields 0 errors', async () => {
    const { games, issues } = await loadCatalog(makeRepo(validTree));
    expect(errors(issues)).toEqual([]);
    expect(games).toHaveLength(1);
  });

  test('duplicate id → error mentioning both files', async () => {
    const root = makeRepo({
      ...validTree,
      'catalog/games/other.json': entry({ slug: 'other', id: 'orbit-hop' }),
    });
    const errs = errors((await loadCatalog(root)).issues);
    expect(errs.some((e) => /duplicate id "orbit-hop"/.test(e.message) && /orbit-hop\.json/.test(e.message))).toBe(
      true,
    );
  });

  test('duplicate slug → error', async () => {
    const root = makeRepo({ ...validTree, 'catalog/games/copy.json': entry({ id: 'copy' }) });
    expect(errors((await loadCatalog(root)).issues).some((e) => /duplicate slug/.test(e.message))).toBe(true);
  });

  test('file source path missing → error', async () => {
    const root = makeRepo({ ...validTree, 'catalog/games/x.json': entry({ slug: 'x', source: { type: 'file', path: 'games/x/index.html' } }) });
    expect(errors((await loadCatalog(root)).issues).map((e) => e.message)).toContain(
      'file not found: games/x/index.html',
    );
  });

  test('file path escaping the games folder → error', async () => {
    const root = makeRepo({
      ...validTree,
      'catalog/games/x.json': entry({ slug: 'x', source: { type: 'file', path: 'games/../package.json' } }),
      'package.json': '{}',
    });
    expect(errors((await loadCatalog(root)).issues).some((e) => /must be inside games\//.test(e.message))).toBe(true);
  });

  test('embed host not in sources.json → error', async () => {
    const root = makeRepo({
      ...validTree,
      'catalog/games/e.json': entry({ slug: 'e', source: { type: 'embed', url: 'https://evil.example.net/g' } }),
    });
    expect(errors((await loadCatalog(root)).issues).some((e) => /evil\.example\.net/.test(e.message))).toBe(true);
  });

  test('allowlisted embed host → ok', async () => {
    const root = makeRepo({
      ...validTree,
      'catalog/games/e.json': entry({ slug: 'e', source: { type: 'embed', url: 'https://games.example.com/g' } }),
    });
    expect(errors((await loadCatalog(root)).issues)).toEqual([]);
  });

  test('storage permission on file game → error', async () => {
    const root = makeRepo({ ...validTree, 'catalog/games/orbit-hop.json': entry({ permissions: ['storage'] }) });
    expect(errors((await loadCatalog(root)).issues).some((e) => /"storage" is only allowed for embed/.test(e.message))).toBe(
      true,
    );
  });

  test('thumbnail set but missing → error', async () => {
    const root = makeRepo({ ...validTree, 'catalog/games/orbit-hop.json': entry({ thumbnail: 'thumbs/nope.png' }) });
    expect(errors((await loadCatalog(root)).issues).map((e) => e.message)).toContain(
      'thumbnail not found: public/thumbs/nope.png',
    );
  });

  test('thumbnail absent → warn only', async () => {
    const root = makeRepo({ ...validTree, 'catalog/games/orbit-hop.json': entry({ thumbnail: undefined }) });
    const { issues } = await loadCatalog(root);
    expect(errors(issues)).toEqual([]);
    expect(issues.some((i) => i.level === 'warn' && /no thumbnail/.test(i.message))).toBe(true);
  });

  test('malformed JSON file → error naming the file, other games still load', async () => {
    const root = makeRepo({ ...validTree, 'catalog/games/broken.json': '{ "slug": ' });
    const { games, issues } = await loadCatalog(root);
    expect(errors(issues).some((e) => e.file.endsWith('broken.json') && /invalid JSON/.test(e.message))).toBe(true);
    expect(games.map((g) => g.slug)).toEqual(['orbit-hop']);
  });

  test('schema error is reported with the field path', async () => {
    const root = makeRepo({ ...validTree, 'catalog/games/orbit-hop.json': entry({ category: 'shooter' }) });
    expect(errors((await loadCatalog(root)).issues).some((e) => /category/.test(e.message))).toBe(true);
  });

  test('extra dirs contribute games and their files', async () => {
    const root = makeRepo(validTree);
    const extra = makeRepo({
      'catalog/games/fx.json': entry({ slug: 'fx', thumbnail: undefined, source: { type: 'file', path: 'games/fx/index.html' } }),
      'games/fx/index.html': 'x',
    });
    const { games, issues } = await loadCatalog(root, [extra]);
    expect(errors(issues)).toEqual([]);
    expect(games.map((g) => g.slug).sort()).toEqual(['fx', 'orbit-hop']);
  });
});

describe('buildCatalog', () => {
  test('excludes hidden games and writes details with embedBlocked from embed-status.json', async () => {
    const root = makeRepo({
      ...validTree,
      'catalog/games/h.json': entry({ slug: 'h', status: 'hidden' }),
      'catalog/games/e.json': entry({ slug: 'e', title: 'Alpha', source: { type: 'embed', url: 'https://games.example.com/g' } }),
      'catalog/embed-status.json': '{"e":"blocked"}',
    });
    const out = join(root, 'out');
    const { count } = await buildCatalog(root, out);
    expect(count).toBe(2);
    const index = JSON.parse(readFileSync(join(out, 'catalog/index.json'), 'utf8'));
    expect(index.map((g: { slug: string }) => g.slug)).toEqual(['e', 'orbit-hop']);
    const details = JSON.parse(readFileSync(join(out, 'catalog/games/e.json'), 'utf8'));
    expect(details.embedBlocked).toBe(true);
    expect(JSON.parse(readFileSync(join(out, 'catalog/games/orbit-hop.json'), 'utf8')).embedBlocked).toBe(false);
    expect(existsSync(join(out, 'catalog/games/h.json'))).toBe(false);
    expect(existsSync(join(out, 'games/orbit-hop/index.html'))).toBe(true);
  });

  test('throws when the catalog has errors', async () => {
    const root = makeRepo({ ...validTree, 'catalog/games/bad.json': '{' });
    await expect(buildCatalog(root, join(root, 'out'))).rejects.toThrow(/bad\.json/);
  });

  test('index.json for 3000 generated summaries gzips ≤ 300 KB', () => {
    const summaries = Array.from({ length: 3000 }, (_, i) =>
      toSummary(
        gameSchema.parse({
          ...JSON.parse(entry()),
          slug: `berry-game-number-${i}`,
          title: `Berry Game Number ${i} Deluxe Edition`,
          tags: ['berries', 'one-button', 'arcade', 'classic'],
          thumbnail: `thumbs/berry-game-number-${i}.webp`,
        }),
      ),
    );
    const bytes = gzipSync(serializeIndex(summaries)).length;
    expect(bytes).toBeLessThanOrEqual(300 * 1024);
  });
});
