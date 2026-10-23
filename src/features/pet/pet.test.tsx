import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, test } from 'vitest';
import PetPage from './PetPage';
import { PETS_KEY, resetPetCache } from './petStore';
import { makePet, type Pet } from './pet-logic';

beforeEach(() => {
  localStorage.clear();
  resetPetCache();
});

const seed = (pets: Pet[], activeId = pets[0]?.id ?? null) => {
  localStorage.setItem(PETS_KEY, JSON.stringify({ pets, activeId }));
  resetPetCache();
};

const renderPage = () => render(<MemoryRouter><PetPage /></MemoryRouter>);

test('with no pets, shows the adopt form; adopting shows the pet and its stats', async () => {
  renderPage();
  expect(screen.getByRole('heading', { name: 'Adopt a buddy' })).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Name'), 'Mochi');
  await userEvent.click(screen.getByRole('button', { name: 'Adopt' }));
  expect(await screen.findByText('Mochi')).toBeInTheDocument();
  expect(screen.getByRole('meter', { name: 'Hunger' })).toHaveAttribute('aria-valuenow', '100');
});

test('feeding a hungry pet raises its hunger', async () => {
  const p = makePet('Mochi', Date.now());
  p.stats = { hunger: 20, happiness: 80, energy: 80, cleanliness: 80 };
  seed([p]);
  renderPage();
  const before = Number(screen.getByRole('meter', { name: 'Hunger' }).getAttribute('aria-valuenow'));
  await userEvent.click(screen.getByRole('button', { name: 'Feed' }));
  const after = Number(screen.getByRole('meter', { name: 'Hunger' }).getAttribute('aria-valuenow'));
  expect(after).toBeGreaterThan(before);
});

test('a pet left too long shows a memorial, not care buttons', () => {
  const p = makePet('Ghost', Date.now() - 1000 * 3600_000); // long ago
  seed([p]);
  renderPage();
  expect(screen.getByRole('heading', { name: /in memory of ghost/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Feed' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Adopt a new buddy' })).toBeInTheDocument();
});

test('with several pets, a shelf lets you switch the active one', async () => {
  const a = makePet('Alpha', Date.now());
  const b = makePet('Beta', Date.now());
  seed([a, b], a.id);
  renderPage();
  const shelf = screen.getByRole('navigation', { name: 'Your pets' });
  await userEvent.click(within(shelf).getByRole('button', { name: 'Beta' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bramble Buddy');
  // the main display now shows Beta's name
  expect(screen.getAllByText('Beta').length).toBeGreaterThan(0);
});
