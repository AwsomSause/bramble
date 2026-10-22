import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

/** Runs a plain browser <script> file in an isolated context and returns its globals. */
export function loadClassicScript(path: string): Record<string, unknown> {
  const context: Record<string, unknown> = {};
  context.globalThis = context;
  context.window = context;
  runInNewContext(readFileSync(path, 'utf8'), context, { filename: path });
  return context;
}
