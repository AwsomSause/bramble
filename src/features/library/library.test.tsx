import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { renderApp, stubCatalog, summary } from '../../test/renderApp';

const thirty = Array.from({ length: 30 }, (_, i) =>
  summary(`game-${String(i).padStart(2, '0')}`, `Game ${String(i).padStart(2, '0')}`, {
    category: i < 5 ? 'puzzle' : 'arcade',
    addedAt: `2026-01-${String(i + 1).padStart(2, '0')}`,
  }),
);
const withOrbit = [...thirty, summary('orbit-hop', 'Orbit Hop', { tags: ['one-button'] })];
const where = () => screen.getByTestId('location').textContent;
const cards = async () => (await screen.findAllByRole('article')).length;

describe('LibraryPage', () => {
  test('renders 24 cards on page 1 of 30 games and pager shows 2 pages', async () => {
    stubCatalog(thirty);
    renderApp('/games');
    expect(await cards()).toBe(24);
    const pager = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(pager).getByRole('link', { name: 'Page 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Games' })).toBeInTheDocument();
    expect(screen.getByText('30 games')).toBeInTheDocument();
  });

  test('typing "orbit" updates URL q and results after the debounce', async () => {
    stubCatalog(withOrbit);
    renderApp('/games');
    await cards();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search games' }), 'orbit');
    await waitFor(() => expect(where()).toBe('/games?q=orbit'));
    await waitFor(async () => expect(await cards()).toBe(1));
    expect(screen.getByRole('link', { name: 'Orbit Hop' })).toBeInTheDocument();
  });

  test('nonsense query shows empty state with "Clear filters" link that restores all', async () => {
    stubCatalog(thirty);
    renderApp('/games?q=zzzzqqq');
    expect(await screen.findByText(/no games match/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Clear filters' }));
    expect(where()).toBe('/games');
    expect(await cards()).toBe(24);
    expect(screen.getByRole('searchbox', { name: 'Search games' })).toHaveValue('');
  });

  test('category tab sets ?cat=puzzle and page resets to 1', async () => {
    stubCatalog(thirty);
    renderApp('/games?page=2');
    await cards();
    await userEvent.click(screen.getByRole('link', { name: 'Puzzle' }));
    expect(where()).toBe('/games?cat=puzzle');
    expect(await cards()).toBe(5);
  });

  test('sort select changes order', async () => {
    stubCatalog(thirty);
    renderApp('/games');
    await cards();
    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'za');
    expect(where()).toBe('/games?sort=za');
    const first = (await screen.findAllByRole('article'))[0]!;
    expect(first).toHaveTextContent('Game 29');
  });

  test('?page=999 shows last page', async () => {
    stubCatalog(thirty);
    renderApp('/games?page=999');
    expect(await cards()).toBe(6);
  });

  test('bad URL values fall back to defaults', async () => {
    stubCatalog(thirty);
    renderApp('/games?cat=nope&sort=zzz&page=abc');
    expect(await cards()).toBe(24);
  });

  test('catalog error shows ErrorBox with Retry', async () => {
    stubCatalog('fail');
    renderApp('/games');
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load/i);
    stubCatalog(thirty);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await cards()).toBe(24);
  });

  test('zero games shows empty-catalog message', async () => {
    stubCatalog([]);
    renderApp('/games');
    expect(await screen.findByText(/no games in the patch yet/i)).toBeInTheDocument();
  });
});

describe('FavoritesPage', () => {
  test('lists only favorites present in catalog, ignoring unknown slug "ghost"', async () => {
    localStorage.setItem('bramble:v1:favorites', '["ghost","orbit-hop"]');
    stubCatalog(withOrbit);
    renderApp('/favorites');
    expect(await cards()).toBe(1);
    expect(screen.getByRole('link', { name: 'Orbit Hop' })).toBeInTheDocument();
  });

  test('empty state explains the ★', async () => {
    stubCatalog(withOrbit);
    renderApp('/favorites');
    expect(await screen.findByText(/tap the ★/i)).toBeInTheDocument();
  });

  test('unfavoriting removes the card', async () => {
    localStorage.setItem('bramble:v1:favorites', '["orbit-hop"]');
    stubCatalog(withOrbit);
    renderApp('/favorites');
    await cards();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Orbit Hop from favorites' }));
    expect(await screen.findByText(/tap the ★/i)).toBeInTheDocument();
  });
});
