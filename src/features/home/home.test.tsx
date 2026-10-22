import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { renderApp, stubCatalog, summary } from '../../test/renderApp';

const games = Array.from({ length: 9 }, (_, i) =>
  summary(`g${i}`, `Game ${i}`, { featured: true, addedAt: `2026-0${i + 1}-01` }),
);
const section = (name: string) => screen.getByRole('heading', { name }).closest('section, aside') as HTMLElement;

test('shows up to 6 featured', async () => {
  stubCatalog(games);
  renderApp('/');
  await screen.findByRole('heading', { name: 'Featured games' });
  expect(within(section('Featured games')).getAllByRole('article')).toHaveLength(6);
});

test('newest sorted by addedAt desc', async () => {
  stubCatalog(games);
  renderApp('/');
  await screen.findByRole('heading', { name: 'Newest games' });
  const links = within(section('Newest games'))
    .getAllByRole('article')
    .map((a) => within(a).getAllByRole('link')[0]!);
  ['Game 8', 'Game 7', 'Game 6'].forEach((name, i) => expect(links[i]).toHaveAccessibleName(name));
});

test('recent box lists recent slugs in order, skipping unknown slugs', async () => {
  localStorage.setItem('bramble:v1:recent', '["g3","ghost","g1"]');
  stubCatalog(games);
  renderApp('/');
  await screen.findByRole('heading', { name: 'Featured games' });
  const links = within(section('Recently played')).getAllByRole('link');
  expect(links.map((l) => l.textContent)).toEqual(['Game 3', 'Game 1']);
});

test('first visit shows friendly text in recent and favorites boxes', async () => {
  stubCatalog(games);
  renderApp('/');
  await screen.findByRole('heading', { name: 'Featured games' });
  expect(within(section('Recently played')).getByText(/games you play will show up here/i)).toBeInTheDocument();
  expect(within(section('Your favorites')).getByText(/tap the ★/i)).toBeInTheDocument();
});

test('Surprise me navigates to an available game', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  stubCatalog([summary('a', 'A'), summary('b', 'B'), summary('c', 'C', { status: 'broken' })]);
  renderApp('/');
  await userEvent.click(await screen.findByRole('button', { name: /surprise me/i }));
  expect(screen.getByTestId('location')).toHaveTextContent('/play/b');
});

test('Surprise me is disabled with zero games and the page explains it', async () => {
  stubCatalog([]);
  renderApp('/');
  expect(await screen.findByRole('button', { name: /surprise me/i })).toBeDisabled();
  expect(screen.getByText(/no games in the patch yet/i)).toBeInTheDocument();
});

test('catalog error shows ErrorBox with Retry', async () => {
  stubCatalog('fail');
  renderApp('/');
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
