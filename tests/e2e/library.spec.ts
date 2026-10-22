import { expect, test } from '@playwright/test';

test('search with no results shows the empty state, and Clear filters restores', async ({ page }) => {
  await page.goto('games');
  await page.getByRole('searchbox', { name: 'Search games' }).fill('zzzqqq');
  await expect(page.getByText(/no games match/i)).toBeVisible();
  await expect(page).toHaveURL(/q=zzzqqq/);
  await page.getByRole('link', { name: 'Clear filters' }).click();
  await expect(page.getByRole('article')).toHaveCount(24);
  await expect(page.getByRole('searchbox', { name: 'Search games' })).toHaveValue('');
});

test('changing the category resets to page 1', async ({ page }) => {
  await page.goto('games?page=2');
  await page.getByRole('navigation', { name: 'Categories' }).getByRole('link', { name: 'Arcade' }).click();
  await expect(page).toHaveURL(/\/games\?cat=arcade$/);
});

test('pagination goes to page 2', async ({ page }) => {
  await page.goto('games');
  await page.getByRole('navigation', { name: 'Pagination' }).getByRole('link', { name: 'Page 2' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole('link', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('article')).toHaveCount(32 - 24);
});

test('a favorite survives a reload and shows on Home and Favorites', async ({ page }) => {
  await page.goto('games?q=orbit');
  await page.getByRole('button', { name: 'Add Orbit Hop to favorites' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove Orbit Hop from favorites' })).toBeVisible();
  await page.goto('');
  await expect(page.getByRole('region', { name: 'Your favorites' }).getByRole('link', { name: 'Orbit Hop' })).toBeVisible();
  await page.goto('favorites');
  await expect(page.getByRole('article')).toHaveCount(1);
});

test('a game with no thumbnail shows the berry placeholder', async ({ page }) => {
  await page.goto('games?q=no%20thumb');
  await expect(page.getByRole('article').getByTestId('thumb-fallback')).toBeVisible();
});
