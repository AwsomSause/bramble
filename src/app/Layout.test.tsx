import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { expect, test } from 'vitest';
import { Layout } from './Layout';

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="*" element={<Where />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

test('active tab has aria-current="page" on /games', () => {
  renderAt('/games');
  const nav = screen.getByRole('navigation', { name: 'Main' });
  expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('Games');
});

test('submitting header search navigates to /games?q=orbit', async () => {
  renderAt('/');
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search games' }), 'orbit');
  await userEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(screen.getByTestId('where')).toHaveTextContent('/games?q=orbit');
});

test('skip link targets #main', () => {
  renderAt('/');
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
});

test('header has logo link home and footer links', () => {
  renderAt('/about');
  const home = screen.getByRole('link', { name: /^Bramble\s*home$/ });
  expect(home).toHaveAttribute('href', '/');
  expect(home).not.toHaveAttribute('aria-label');
  expect(screen.getByRole('contentinfo')).toHaveTextContent('Privacy');
});
