// npm run size — fails if the JavaScript needed for the first page load is over budget.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET = 150 * 1024; // bytes, gzipped
type Chunk = { file: string; isEntry?: boolean; imports?: string[] };
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8')) as Record<string, Chunk>;
const entryKey = Object.keys(manifest).find((k) => manifest[k]!.isEntry);
if (!entryKey) throw new Error('no entry chunk in manifest; run npm run build first');

const seen = new Set<string>();
const visit = (key: string) => {
  if (seen.has(key)) return;
  seen.add(key);
  for (const i of manifest[key]?.imports ?? []) visit(i);
};
visit(entryKey);

let total = 0;
for (const key of seen) {
  const file = manifest[key]!.file;
  const size = gzipSync(readFileSync(join('dist', file))).length;
  total += size;
  console.log(`${(size / 1024).toFixed(1).padStart(7)} KB  ${file}`);
}
console.log(`${(total / 1024).toFixed(1).padStart(7)} KB  total initial JS (budget ${BUDGET / 1024} KB gzipped)`);
if (total > BUDGET) {
  console.error('Over budget!');
  process.exit(1);
}
