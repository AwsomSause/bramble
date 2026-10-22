import { expect, test } from 'vitest';
import { buildCsp } from './csp';

test('buildCsp lists allowlisted frame hosts and blocks plugins', () => {
  const csp = buildCsp(['games.example.com']);
  expect(csp).toContain("frame-src 'self' https://games.example.com");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("base-uri 'self'");
  expect(csp).toContain("form-action 'none'");
});

test('buildCsp with no hosts only allows self frames', () => {
  expect(buildCsp([])).toContain("frame-src 'self';");
});

test('buildCsp rejects hosts that could smuggle directives', () => {
  expect(() => buildCsp(["x.com; script-src *"])).toThrow();
});
