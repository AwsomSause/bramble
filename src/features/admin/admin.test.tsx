import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import { AdminGate } from './AdminGate';
import { hashCredentials, type AdminConfig } from './credentials';
import { getDrafts, resetDraftCache } from './drafts';

let config: AdminConfig;

beforeEach(async () => {
  localStorage.clear();
  resetDraftCache();
  config = { salt: 'testsalt', hash: await hashCredentials('admin', 'hunter2', 'Elk City Elementary', 'testsalt') };
});

const renderGate = (over: Partial<Parameters<typeof AdminGate>[0]> = {}) =>
  render(
    <MemoryRouter>
      <AdminGate config={config} canPublish={false} {...over} />
    </MemoryRouter>,
  );

async function unlock() {
  await userEvent.type(screen.getByLabelText('Username'), 'admin');
  await userEvent.type(screen.getByLabelText('Password'), 'hunter2');
  await userEvent.type(screen.getByLabelText(/school/i), 'Elk City Elementary');
  await userEvent.click(screen.getByRole('button', { name: 'Unlock' }));
}

test('wrong credentials are rejected and the panel stays locked', async () => {
  renderGate();
  await userEvent.type(screen.getByLabelText('Username'), 'admin');
  await userEvent.type(screen.getByLabelText('Password'), 'wrong');
  await userEvent.type(screen.getByLabelText(/school/i), 'Elk City Elementary');
  await userEvent.click(screen.getByRole('button', { name: 'Unlock' }));
  expect(await screen.findByText(/didn.t match/i)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Add a game' })).not.toBeInTheDocument();
});

test('correct credentials open the admin panel', async () => {
  renderGate();
  await unlock();
  expect(await screen.findByRole('heading', { name: 'Add a game' })).toBeInTheDocument();
});

test('an unconfigured admin shows setup instructions, no login', () => {
  renderGate({ config: { salt: '', hash: '' } });
  expect(screen.getByText(/set-admin/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Unlock' })).not.toBeInTheDocument();
});

test('saving a valid game creates a local draft that is play-testable', async () => {
  renderGate();
  await unlock();
  await userEvent.type(screen.getByLabelText('Title'), 'My Test Game');
  await userEvent.type(screen.getByLabelText('Description'), 'A little game for testing.');
  await userEvent.type(screen.getByLabelText(/game link/i), 'https://games.example.com/mine');
  await userEvent.type(screen.getByLabelText(/who made it/i), 'Me');
  await userEvent.type(screen.getByLabelText(/permission/i), 'I made it');
  await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));

  await waitFor(() => expect(getDrafts()).toHaveLength(1));
  expect(getDrafts()[0]!.details.title).toBe('My Test Game');
  const list = await screen.findByRole('region', { name: 'Your drafts' });
  expect(within(list).getByText('My Test Game')).toBeInTheDocument();
});

test('publishing controls are hidden when not on a local dev host', async () => {
  renderGate({ canPublish: false });
  await unlock();
  await userEvent.type(screen.getByLabelText('Title'), 'G');
  await userEvent.type(screen.getByLabelText('Description'), 'A little game for testing.');
  await userEvent.type(screen.getByLabelText(/game link/i), 'https://games.example.com/mine');
  await userEvent.type(screen.getByLabelText(/who made it/i), 'Me');
  await userEvent.type(screen.getByLabelText(/permission/i), 'I made it');
  await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
  await screen.findByRole('region', { name: 'Your drafts' });
  expect(screen.queryByRole('button', { name: /^Publish/ })).not.toBeInTheDocument();
  expect(screen.getByText(/run bramble locally/i)).toBeInTheDocument();
});

test('publishing controls appear on a local dev host', async () => {
  vi.stubGlobal('location', { ...window.location, hostname: 'localhost' });
  renderGate({ canPublish: true });
  await unlock();
  await userEvent.type(screen.getByLabelText('Title'), 'G');
  await userEvent.type(screen.getByLabelText('Description'), 'A little game for testing.');
  await userEvent.type(screen.getByLabelText(/game link/i), 'https://games.example.com/mine');
  await userEvent.type(screen.getByLabelText(/who made it/i), 'Me');
  await userEvent.type(screen.getByLabelText(/permission/i), 'I made it');
  await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
  expect(await screen.findByRole('button', { name: /^Publish/ })).toBeInTheDocument();
});
