import { expect, test } from '@playwright/test';

test('choosing a console theme applies and persists', async ({ page }) => {
  await page.goto('settings');
  await page.getByRole('radio', { name: 'Blade Green' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blade');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blade');
  await expect(page.getByRole('radio', { name: 'Blade Green' })).toBeChecked();
});
