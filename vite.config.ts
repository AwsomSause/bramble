import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { buildCsp } from './scripts/lib/csp';

/** Adds the Content-Security-Policy and referrer meta tags to production builds only
 *  (the dev server needs inline scripts for hot reload). */
function securityMeta(): Plugin {
  return {
    name: 'bramble-security-meta',
    apply: 'build',
    transformIndexHtml() {
      const { hosts = [] } = JSON.parse(readFileSync('catalog/sources.json', 'utf8')) as { hosts?: string[] };
      return [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: buildCsp(hosts) }, injectTo: 'head-prepend' },
        { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
      ];
    },
  };
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/bramble/',
  plugins: [react(), securityMeta()],
  build: { manifest: true },
});
