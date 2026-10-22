import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import type { GameDetails } from '../../catalog/schema';
import { renderApp, stubCatalog, summary } from '../../test/renderApp';

const orbit: GameDetails = {
  id: 'orbit-hop',
  slug: 'orbit-hop',
  title: 'Orbit Hop',
  description: 'Hop between orbits and dodge thorns.',
  instructions: 'Press Space to hop.',
  category: 'arcade',
  tags: [],
  collection: 'bramble',
  source: { type: 'file', path: 'games/orbit-hop/index.html' },
  controls: ['keyboard', 'touch'],
  fullscreen: true,
  mobile: 'yes',
  aspectRatio: '1:1',
  permissions: [],
  attribution: { author: 'Bramble' },
  license: { name: 'Original work', permission: 'Made for Bramble' },
  status: 'available',
  featured: true,
  addedAt: '2026-10-22',
  embedBlocked: false,
};
const index = [summary('orbit-hop', 'Orbit Hop')];
const frame = () => screen.getByTitle('Orbit Hop') as HTMLIFrameElement;

describe('PlayerPage', () => {
  test('renders iframe with sandbox "allow-scripts" for orbit-hop', async () => {
    stubCatalog(index, { 'orbit-hop': orbit });
    renderApp('/play/orbit-hop');
    expect(await screen.findByRole('heading', { level: 1, name: 'Orbit Hop' })).toBeInTheDocument();
    expect(frame()).toHaveAttribute('sandbox', 'allow-scripts');
    expect(frame()).toHaveAttribute('src', '/bramble/games/orbit-hop/index.html');
    expect(frame()).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    fireEvent.load(frame());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('ignores message events whose source is not the iframe window', async () => {
    stubCatalog(index, { 'orbit-hop': orbit });
    renderApp('/play/orbit-hop');
    await screen.findByTitle('Orbit Hop');
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'bramble:score', score: 99 }, source: window }));
    });
    expect(screen.getByText(/best score: —/i)).toBeInTheDocument();
    expect(localStorage.getItem('bramble:v1:scores')).toBeNull();
  });

  test('score message from the game updates best score display', async () => {
    stubCatalog(index, { 'orbit-hop': orbit });
    renderApp('/play/orbit-hop');
    await screen.findByTitle('Orbit Hop');
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { type: 'bramble:score', score: 42 }, source: frame().contentWindow }),
      );
    });
    expect(screen.getByText(/best score: 42/i)).toBeInTheDocument();
  });

  test('blocked state shows external link with rel="noopener noreferrer"', async () => {
    const embed = { ...orbit, slug: 'e', title: 'Elsewhere', source: { type: 'embed', url: 'https://games.example.com/g' }, embedBlocked: true } as GameDetails;
    stubCatalog([summary('e', 'Elsewhere')], { e: embed });
    renderApp('/play/e');
    const link = await screen.findByRole('link', { name: /open elsewhere on its own site/i });
    expect(link).toHaveAttribute('href', 'https://games.example.com/g');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByTitle('Elsewhere')).not.toBeInTheDocument();
  });

  test('broken game shows the unavailable state and no frame', async () => {
    stubCatalog(index, { 'orbit-hop': { ...orbit, status: 'broken' } });
    renderApp('/play/orbit-hop');
    expect(await screen.findByText(/isn't working right now/i)).toBeInTheDocument();
    expect(screen.queryByTitle('Orbit Hop')).not.toBeInTheDocument();
  });

  test('unknown slug shows not-found card with link to /games', async () => {
    stubCatalog(index, {});
    renderApp('/play/ghost');
    expect(await screen.findByRole('heading', { name: 'Game not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all games' })).toHaveAttribute('href', '/games');
  });

  test('opening a game pushes it to recent', async () => {
    stubCatalog(index, { 'orbit-hop': orbit });
    renderApp('/play/orbit-hop');
    await screen.findByTitle('Orbit Hop');
    expect(JSON.parse(localStorage.getItem('bramble:v1:recent')!)).toEqual(['orbit-hop']);
  });

  test('details fetch error shows ErrorBox with Retry', async () => {
    stubCatalog(index, { 'orbit-hop': 'fail' });
    renderApp('/play/orbit-hop');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    stubCatalog(index, { 'orbit-hop': orbit });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTitle('Orbit Hop')).toBeInTheDocument();
  });

  test('fullscreen falls back to expanded when requestFullscreen is unavailable', async () => {
    stubCatalog(index, { 'orbit-hop': orbit });
    renderApp('/play/orbit-hop');
    await screen.findByTitle('Orbit Hop');
    await userEvent.click(screen.getByRole('button', { name: 'Fullscreen' }));
    expect(screen.getByTestId('viewport')).toHaveClass(/expanded/);
    await userEvent.keyboard('{Escape}');
    expect(screen.getByTestId('viewport')).not.toHaveClass(/expanded/);
  });

  test('report link points at a prefilled GitHub issue', async () => {
    stubCatalog(index, { 'orbit-hop': orbit });
    renderApp('/play/orbit-hop');
    await screen.findByTitle('Orbit Hop');
    const link = within(screen.getByRole('main')).getByRole('link', { name: /report a problem/i });
    expect(link.getAttribute('href')).toContain('/issues/new?title=Broken+game%3A+Orbit+Hop');
  });

  test('back link goes to the games list when there is no history', async () => {
    stubCatalog(index, { 'orbit-hop': orbit });
    renderApp('/play/orbit-hop');
    await userEvent.click(await screen.findByRole('button', { name: /back to games/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/games'));
  });
});
