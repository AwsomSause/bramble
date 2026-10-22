import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['', 'games', 'favorites', 'play/orbit-hop', 'settings', 'about'];

for (const theme of ['classic', 'midnight'] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => {
        localStorage.setItem(
          'bramble:v1:settings',
          JSON.stringify({ theme: t, background: 'plain', motion: 'system', lowPerf: false, textScale: 1 }),
        );
        localStorage.setItem('bramble:v1:favorites', '["orbit-hop"]');
        localStorage.setItem('bramble:v1:recent', '["orbit-hop"]');
      }, theme);
    });
    for (const route of routes) {
      test(`no serious accessibility problems on /${route}`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        const results = await new AxeBuilder({ page }).exclude('iframe').analyze();
        const bad = results.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
        expect(bad).toEqual([]);
      });
    }
  });
}

test('keyboard users can reach a game card with a visible focus ring', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard test runs on desktop');
  await page.goto('');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(() => (document.activeElement as HTMLAnchorElement | null)?.href?.includes('/play/') ?? false);
  }
  expect(reached).toBe(true);
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineWidth);
  expect(parseFloat(outline)).toBeGreaterThan(0);
});
