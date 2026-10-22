// npm run check-embeds [-- --write]
// For every linked (embed) game, asks its website whether it may be shown inside Bramble.
// With --write, saves results to catalog/embed-status.json; the build uses that to show
// an "open on its own site" button instead of a broken frame. Never fails the build.
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { siteConfig } from '../src/config';
import { analyzeFrameHeaders, portalOriginFromRepo, type EmbedStatus } from './lib/embed-check';
import { loadCatalog } from './lib/catalog';

const { values } = parseArgs({ options: { write: { type: 'boolean', default: false } } });
const portalOrigin = process.env.PORTAL_ORIGIN ?? portalOriginFromRepo(siteConfig.repoUrl);
const { games } = await loadCatalog(process.cwd());
const embeds = games.filter((g) => g.source.type === 'embed');
const results: Record<string, EmbedStatus> = {};

console.log(`Checking ${embeds.length} linked game(s) as ${portalOrigin}\n`);
for (const g of embeds) {
  if (g.source.type !== 'embed') continue;
  let status: EmbedStatus = 'unknown';
  try {
    const res = await fetch(g.source.url, { redirect: 'follow', signal: AbortSignal.timeout(10_000) });
    status = analyzeFrameHeaders(res.headers, portalOrigin);
  } catch (e) {
    console.log(`  (could not reach ${g.source.url}: ${e instanceof Error ? e.message : e})`);
  }
  results[g.slug] = status;
  console.log(`${status.padEnd(8)} ${g.slug}  ${g.source.url}`);
}
if (values.write) {
  writeFileSync('catalog/embed-status.json', `${JSON.stringify(results, null, 2)}\n`);
  console.log('\nSaved catalog/embed-status.json');
}
