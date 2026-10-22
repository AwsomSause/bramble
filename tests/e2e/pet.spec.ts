import { expect, test } from '@playwright/test';

test('adopt a buddy, feed it, and it survives a reload', async ({ page }) => {
  await page.goto('pet');
  await page.getByLabel('Name').fill('Mochi');
  await page.getByRole('button', { name: 'Adopt' }).click();
  await expect(page.getByTestId('pet-name')).toHaveText(/Mochi/);
  for (const stat of ['Hunger', 'Happiness', 'Energy', 'Cleanliness']) {
    await expect(page.getByRole('meter', { name: stat })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Clean' }).click();
  await page.reload();
  await expect(page.getByTestId('pet-name')).toHaveText(/Mochi/); // persisted in this browser
});

test('the Pet tab is reachable from the nav', async ({ page }) => {
  await page.goto('');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Pet' }).click();
  await expect(page).toHaveURL(/\/bramble\/pet$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Bramble Buddy' })).toBeVisible();
});

test('a buddy neglected past the limit shows a memorial', async ({ page }) => {
  // Seed a pet last tended long ago, before the app loads.
  await page.addInitScript(() => {
    const old = Date.now() - 1000 * 3600 * 1000;
    localStorage.setItem(
      'bramble:v1:pets',
      JSON.stringify({
        pets: [{ id: 'p1', name: 'Pixel', bornAt: old, lastTended: old, alive: true, stats: { hunger: 100, happiness: 100, energy: 100, cleanliness: 100 } }],
        activeId: 'p1',
      }),
    );
  });
  await page.goto('pet');
  await expect(page.getByRole('heading', { name: /in memory of pixel/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Feed' })).toHaveCount(0);
});
