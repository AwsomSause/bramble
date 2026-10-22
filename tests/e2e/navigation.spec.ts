import { expect, test } from '@playwright/test';

test('tabs change the URL and Back/Forward restore it', async ({ page }) => {
  await page.goto('');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Games' }).click();
  await expect(page).toHaveURL(/\/bramble\/games$/);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Favorites' }).click();
  await expect(page).toHaveURL(/\/bramble\/favorites$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/bramble\/games$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Games' })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
});

test('a fresh load of a deep link works', async ({ page }) => {
  await page.goto('play/orbit-hop');
  await expect(page.getByRole('heading', { level: 1, name: 'Orbit Hop' })).toBeVisible();
});

test('404.html is the app, so GitHub Pages deep links load it', async ({ request }) => {
  const [index, notFound] = await Promise.all([request.get('index.html'), request.get('404.html')]);
  expect(await notFound.text()).toBe(await index.text());
});

test('an unknown route shows Page not found', async ({ page }) => {
  await page.goto('nowhere/at/all');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
