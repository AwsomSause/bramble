import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, test } from 'vitest';
import ShopPage from './ShopPage';
import { getEquipped, isOwned, resetShopCache, SHOP_KEY } from './shopStore';

beforeEach(() => {
  localStorage.clear();
  resetShopCache();
});

const seedCoins = (n: number) => {
  localStorage.setItem(
    SHOP_KEY,
    JSON.stringify({ wallet: { coins: n, lastDaily: '2099-01-01', playDate: null, playedSlugs: [] }, owned: [], equipped: { cursor: 'cursor-default', accent: 'accent-default' } }),
  );
  resetShopCache();
};

const renderShop = () => render(<MemoryRouter><ShopPage /></MemoryRouter>);

test('shows the coin balance', () => {
  seedCoins(140);
  renderShop();
  expect(screen.getByText('140')).toBeInTheDocument();
});

test('buying an affordable item spends coins and lets you use it', async () => {
  seedCoins(200);
  renderShop();
  await userEvent.click(screen.getByRole('button', { name: /buy berry cursor for 60 coins/i }));
  expect(isOwned('cursor-berry')).toBe(true);
  expect(screen.getAllByText(/coins/i)[0]).toHaveTextContent('140');
  await userEvent.click(screen.getByRole('button', { name: 'Use' }));
  expect(getEquipped().cursor).toBe('cursor-berry');
});

test('an item you cannot afford stays unbought', async () => {
  seedCoins(10);
  renderShop();
  await userEvent.click(screen.getByRole('button', { name: /buy berry cursor/i }));
  expect(isOwned('cursor-berry')).toBe(false);
  expect(screen.getAllByText(/coins/i)[0]).toHaveTextContent('10');
});

test('default items show as in use and are not for sale', () => {
  seedCoins(0);
  renderShop();
  expect(screen.getAllByText('In use').length).toBeGreaterThanOrEqual(2); // default cursor + accent
});
