// npm run add-game — add a game from an HTML file, a folder, or a link.
// Run with no flags to be asked questions, or pass flags (see docs/adding-games.md).
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { CATEGORIES, CONTROLS, type Category, type Control } from '../src/catalog/schema';
import { entryToJson, planAddGame, type AddGameInput } from './lib/add-game-core';
import { loadCatalog, readHosts } from './lib/catalog';
import { resolveAnswer } from './lib/prompt';

const { values } = parseArgs({
  options: {
    html: { type: 'string' },
    folder: { type: 'string' },
    link: { type: 'string' },
    title: { type: 'string' },
    category: { type: 'string' },
    tags: { type: 'string' },
    controls: { type: 'string' },
    description: { type: 'string' },
    instructions: { type: 'string' },
    author: { type: 'string' },
    'author-url': { type: 'string' },
    permission: { type: 'string' },
    license: { type: 'string' },
    thumb: { type: 'string' },
    mobile: { type: 'string' },
    aspect: { type: 'string' },
    yes: { type: 'boolean', default: false },
  },
});

const root = process.cwd();
const interactive = process.stdin.isTTY && !values.yes;
const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;

async function ask(question: string, current?: string, fallback?: string): Promise<string> {
  if (current) return current;
  if (!rl) {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing --${question.split(' ')[0]!.toLowerCase()} (run without --yes to be asked)`);
  }
  const hint = fallback ? ` [${fallback}]` : '';
  const answer = (await rl.question(`${question}${hint}: `)).trim();
  return resolveAnswer(answer, fallback) ?? ask(question, undefined, fallback);
}

async function main() {
  let kind: AddGameInput['kind'];
  let from: string;
  if (values.html) [kind, from] = ['html', values.html];
  else if (values.folder) [kind, from] = ['folder', values.folder];
  else if (values.link) [kind, from] = ['link', values.link];
  else {
    const k = await ask('Kind (html / folder / link)', undefined, 'html');
    kind = (['html', 'folder', 'link'].includes(k) ? k : 'html') as AddGameInput['kind'];
    from = await ask(kind === 'link' ? 'Game link (https://…)' : `Path to the ${kind}`);
  }
  const guessTitle = kind === 'link' ? undefined : basename(from).replace(/\.html?$/i, '').replace(/[-_]+/g, ' ');
  const title = await ask('Title', values.title, guessTitle);
  const categoryRaw = await ask(`Category (${CATEGORIES.join(', ')})`, values.category, 'casual');
  if (!(CATEGORIES as readonly string[]).includes(categoryRaw)) throw new Error(`unknown category "${categoryRaw}"`);
  const description = await ask('One-line description', values.description, `Play ${title} on Bramble.`);
  const author = await ask('Who made it', values.author);
  const permission = await ask('Where your permission comes from (e.g. "Creator emailed me 2026-10-20")', values.permission);
  const tags = (await ask('Tags, comma separated (optional)', values.tags, '')).split(',').map((t) => t.trim()).filter(Boolean);
  const controls = (await ask(`Controls (${CONTROLS.join(', ')})`, values.controls, 'keyboard,mouse'))
    .split(',')
    .map((c) => c.trim())
    .filter((c): c is Control => (CONTROLS as readonly string[]).includes(c));
  const thumb = await ask('Thumbnail image path (optional)', values.thumb, '');

  const { games } = await loadCatalog(root);
  const hosts = await readHosts(root);
  const today = new Date().toISOString().slice(0, 10);
  const plan = planAddGame(
    {
      kind,
      from,
      title,
      category: categoryRaw as Category,
      tags,
      controls,
      description,
      instructions: values.instructions,
      author,
      authorUrl: values['author-url'],
      permission,
      licenseName: values.license,
      thumbnail: thumb || undefined,
      mobile: values.mobile as AddGameInput['mobile'],
      aspectRatio: values.aspect,
    },
    new Set(games.map((g) => g.slug)),
    hosts,
    today,
    {
      isFile: (p) => existsSync(p) && statSync(p).isFile(),
      isDir: (p) => existsSync(p) && statSync(p).isDirectory(),
    },
  );

  if (plan.newHost) {
    const ok = values.yes || (await ask(`Allow games from ${plan.newHost}? (y/n)`, undefined, 'y')).toLowerCase().startsWith('y');
    if (!ok) throw new Error('cancelled: host not allowed');
    const sources = JSON.parse(readFileSync(join(root, 'catalog/sources.json'), 'utf8')) as { hosts: string[] };
    sources.hosts = [...new Set([...sources.hosts, plan.newHost])].sort();
    writeFileSync(join(root, 'catalog/sources.json'), `${JSON.stringify(sources, null, 2)}\n`);
    console.log(`+ allowed host ${plan.newHost} in catalog/sources.json`);
  }
  for (const c of plan.copies) {
    mkdirSync(dirname(join(root, c.to)), { recursive: true });
    cpSync(c.from, join(root, c.to), { recursive: c.kind === 'dir' });
    console.log(`+ copied ${c.from} -> ${c.to}${c.kind === 'dir' ? ` (${readdirSync(join(root, c.to)).length} items)` : ''}`);
  }
  const file = join('catalog/games', `${plan.entry.slug}.json`);
  writeFileSync(join(root, file), entryToJson(plan.entry));
  console.log(`+ wrote ${file}`);

  const { issues } = await loadCatalog(root);
  const mine = issues.filter((i) => i.file.endsWith(`${plan.entry.slug}.json`));
  for (const i of mine) console.log(`${i.level === 'error' ? 'ERROR' : 'warn '}  ${i.message}`);
  if (mine.some((i) => i.level === 'error')) process.exitCode = 1;
  console.log(`\nDone! Try it: npm run dev, then open http://localhost:5173/bramble/play/${plan.entry.slug}`);
}

main()
  .catch((e: unknown) => {
    console.error(`add-game: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  })
  .finally(() => rl?.close());
