import { expect, test } from '@playwright/test';

test('playing a game earns coins shown in the header', async ({ page }) => {
  await page.goto('');
  await page.goto('play/orbit-hop');
  await page.getByRole('heading', { level: 1, name: 'Orbit Hop' }).waitFor();
  // daily bonus (on first load) + play reward
  await expect(page.getByRole('link', { name: /patch shop/i })).toContainText(/[1-9]/);
});

test('buy and equip a cursor from the shop', async ({ page }) => {
  // Seed once; addInitScript re-runs on reload, so guard it or the purchase would be wiped.
  await page.addInitScript(() => {
    if (!localStorage.getItem('bramble:v1:shop')) {
      localStorage.setItem(
        'bramble:v1:shop',
        JSON.stringify({ wallet: { coins: 300, lastDaily: '2099-01-01', playDate: null, playedSlugs: [] }, owned: [], equipped: { cursor: 'cursor-default', accent: 'accent-default' } }),
      );
    }
  });
  await page.goto('shop');
  await page.getByRole('button', { name: /buy berry cursor/i }).click();
  await page.getByRole('button', { name: 'Use' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('data-cursor', 'cursor-berry');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-cursor', 'cursor-berry'); // persists
});

test('the Shop tab is in the nav', async ({ page }) => {
  await page.goto('');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Shop' }).click();
  await expect(page).toHaveURL(/\/bramble\/shop$/);
  await expect(page.getByRole('heading', { level: 1, name: 'The Patch Shop' })).toBeVisible();
});
