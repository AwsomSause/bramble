// npm run build:catalog — validates the catalog and writes public/catalog + public/games.
// Pass --extra <dir> (repeatable) to merge extra catalog folders, e.g. test fixtures.
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { buildCatalog } from './lib/catalog';

const { values } = parseArgs({ options: { extra: { type: 'string', multiple: true, default: [] } } });
try {
  const { count } = await buildCatalog(process.cwd(), resolve('public'), {
    extraDirs: (values.extra ?? []).map((d) => resolve(d)),
  });
  console.log(`catalog built: ${count} game(s)`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
