import { expect, test } from '@playwright/test';

test('Orbit Hop loads, plays, and scores', async ({ page }) => {
  await page.goto('play/orbit-hop');
  const viewport = page.getByTestId('viewport');
  await expect(viewport.getByRole('status')).toHaveCount(0, { timeout: 10_000 });
  const game = page.frameLocator('iframe[title="Orbit Hop"]');
  await game.getByRole('button', { name: 'Start', exact: true }).click();
  await game.locator('canvas').click();
  await page.waitForTimeout(1200);
  const score = Number(await game.locator('#score').textContent());
  expect(score).toBeGreaterThan(0);
});

test('Back returns to the same library view', async ({ page }) => {
  await page.goto('games?q=orbit');
  await page.getByRole('link', { name: 'Orbit Hop' }).click();
  await expect(page).toHaveURL(/play\/orbit-hop/);
  await page.getByRole('button', { name: /back to games/i }).click();
  await expect(page).toHaveURL(/\/games\?q=orbit$/);
  await expect(page.getByRole('searchbox', { name: 'Search games' })).toHaveValue('orbit');
});

test('a broken game shows the unavailable state', async ({ page }) => {
  await page.goto('play/broken-berry');
  await expect(page.getByText(/isn't working right now/i)).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('Fullscreen goes fullscreen or expands to fill the window', async ({ page }) => {
  await page.goto('play/orbit-hop');
  await page.getByRole('button', { name: 'Fullscreen' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => !!document.fullscreenElement || !!document.querySelector('[data-testid="viewport"][class*="expanded"]'),
      ),
    )
    .toBe(true);
});
