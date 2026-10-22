import { expect, test } from '@playwright/test';

test('the Orbit Hop frame is sandboxed with scripts only', async ({ page }) => {
  await page.goto('play/orbit-hop');
  await expect(page.locator('iframe[title="Orbit Hop"]')).toHaveAttribute('sandbox', 'allow-scripts');
});

test('the page ships a Content-Security-Policy', async ({ page }) => {
  await page.goto('');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("script-src 'self'");
});

test("a game can't read the portal's storage", async ({ page }) => {
  await page.goto('play/orbit-hop');
  await page.evaluate(() => localStorage.setItem('bramble:v1:favorites', '["secret"]'));
  const frame = page.frameLocator('iframe[title="Orbit Hop"]');
  await frame.locator('canvas').waitFor();
  const gameFrame = page.frames().find((f) => f.url().includes('/games/orbit-hop/'))!;
  const result = await gameFrame.evaluate(() => {
    try {
      return window.localStorage.getItem('bramble:v1:favorites') ?? 'empty';
    } catch {
      return 'blocked';
    }
  });
  expect(result).toBe('blocked');
  expect(await gameFrame.evaluate(() => window.origin)).toBe('null');
});

test('no CSP violations or script errors on main pages', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(e.message));
  for (const path of ['', 'games', 'play/orbit-hop', 'settings', 'about']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
  expect(problems).toEqual([]);
});
