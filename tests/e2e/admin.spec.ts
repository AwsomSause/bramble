import { expect, test } from '@playwright/test';

test('the hidden raspberry on Orbit Hop opens the admin login', async ({ page }) => {
  await page.goto('play/orbit-hop');
  const game = page.frameLocator('iframe[title="Orbit Hop"]');
  await game.locator('#startBtn').waitFor();
  await game.locator('#berryKnock').click({ force: true });
  const dialog = page.getByRole('dialog', { name: 'Admin' });
  await expect(dialog).toBeVisible();
  // No admin password is configured in the repo, so it shows setup instructions, not a login.
  await expect(dialog.getByText(/set-admin/i)).toBeVisible();
  await page.getByRole('button', { name: 'Close admin' }).click();
  await expect(dialog).toHaveCount(0);
});

test('the admin overlay is not present until the raspberry is knocked', async ({ page }) => {
  await page.goto('play/orbit-hop');
  await expect(page.getByRole('dialog', { name: 'Admin' })).toHaveCount(0);
});
