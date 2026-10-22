import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import type { GameSummary } from '../catalog/schema';
import { GameCard } from './GameCard';
import { Pager } from './Pager';
import { SearchBox } from './SearchBox';
import { Thumb } from './Thumb';
import { Box } from './Box';

const game: GameSummary = {
  id: 'orbit-hop',
  slug: 'orbit-hop',
  title: 'Orbit Hop',
  category: 'arcade',
  tags: [],
  collection: 'bramble',
  thumbnail: 'thumbs/orbit-hop.svg',
  mobile: 'yes',
  featured: true,
  addedAt: '2026-10-22',
  status: 'available',
};

describe('Thumb', () => {
  test('shows fallback svg when src missing', () => {
    render(<Thumb title="Orbit Hop" />);
    expect(screen.getByTestId('thumb-fallback')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  test('swaps to fallback after img error event', () => {
    const { container } = render(<Thumb title="Orbit Hop" src="thumbs/missing.png" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/bramble/thumbs/missing.png');
    fireEvent.error(img);
    expect(screen.getByTestId('thumb-fallback')).toBeInTheDocument();
  });
});

describe('GameCard', () => {
  const renderCard = () => render(<MemoryRouter><GameCard game={game} /></MemoryRouter>);
  test('title links to /play/orbit-hop', () => {
    renderCard();
    expect(screen.getByRole('link', { name: /orbit hop/i })).toHaveAttribute('href', '/play/orbit-hop');
  });
  test('star toggles aria-pressed and persists to bramble:v1:favorites', async () => {
    renderCard();
    const star = screen.getByRole('button', { name: 'Add Orbit Hop to favorites' });
    expect(star).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(star);
    expect(screen.getByRole('button', { name: 'Remove Orbit Hop from favorites' })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('bramble:v1:favorites')).toBe('["orbit-hop"]');
  });
});

describe('Pager', () => {
  test('marks current page with aria-current and hides Prev on page 1', () => {
    render(<MemoryRouter><Pager page={1} totalPages={3} hrefFor={(p) => `/games?page=${p}`} /></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /next/i })).toHaveAttribute('href', '/games?page=2');
  });
  test('renders nothing when totalPages is 1', () => {
    const { container } = render(<MemoryRouter><Pager page={1} totalPages={1} hrefFor={() => ''} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('SearchBox', () => {
  test('has an accessible label and submits', async () => {
    const onSubmit = vi.fn();
    render(<SearchBox value="" onChange={() => {}} onSubmit={onSubmit} />);
    expect(screen.getByRole('searchbox', { name: 'Search games' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSubmit).toHaveBeenCalled();
  });
});

describe('Box', () => {
  test('renders its title as a heading', () => {
    render(<Box title="Recently played">x</Box>);
    expect(screen.getByRole('heading', { name: 'Recently played' })).toBeInTheDocument();
  });
  test('is a region named by its heading', () => {
    render(<Box title="Recently played">x</Box>);
    expect(screen.getByRole('region', { name: 'Recently played' })).toBeInTheDocument();
  });
});
