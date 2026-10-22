// npm run validate — checks every catalog entry and prints a readable report.
import { loadCatalog } from './lib/catalog';

const { games, issues } = await loadCatalog(process.cwd());
for (const i of issues) {
  console.log(`${i.level === 'error' ? 'ERROR' : 'warn '}  ${i.file}: ${i.message}`);
}
const errors = issues.filter((i) => i.level === 'error').length;
const warns = issues.length - errors;
console.log(`\n${games.length} game(s) checked: ${errors} error(s), ${warns} warning(s).`);
process.exit(errors ? 1 : 0);
