import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { renderApp, stubCatalog, summary } from '../../test/renderApp';
import { applySettings, DEFAULT_SETTINGS, getSettings, resetSettingsCache } from './useSettings';

const root = () => document.documentElement;

describe('applySettings', () => {
  test('system motion + OS prefers reduced → data-motion reduce', () => {
    applySettings({ ...DEFAULT_SETTINGS, motion: 'system' }, true);
    expect(root().dataset.motion).toBe('reduce');
    applySettings({ ...DEFAULT_SETTINGS, motion: 'system' }, false);
    expect(root().dataset.motion).toBe('full');
  });
  test('lowPerf forces reduce and static background', () => {
    applySettings({ ...DEFAULT_SETTINGS, background: 'leaves', motion: 'full', lowPerf: true }, false);
    expect(root().dataset.motion).toBe('reduce');
    expect(root().dataset.bg).toBe('plain');
    expect(root().dataset.lowperf).toBe('true');
    applySettings({ ...DEFAULT_SETTINGS, background: 'berries', lowPerf: true }, false);
    expect(root().dataset.bg).toBe('berries');
  });
  test('a console theme is applied to data-theme', () => {
    applySettings({ ...DEFAULT_SETTINGS, theme: 'blade' }, false);
    expect(root().dataset.theme).toBe('blade');
  });
  test('text scale is applied as a CSS variable', () => {
    applySettings({ ...DEFAULT_SETTINGS, textScale: 1.3 }, false);
    expect(root().style.getPropertyValue('--text-scale')).toBe('1.3');
  });
});

describe('SettingsPage', () => {
  test('changing theme persists to bramble:v1:settings and sets data-theme', async () => {
    stubCatalog([]);
    renderApp('/settings');
    await userEvent.click(await screen.findByRole('radio', { name: 'Midnight Bramble' }));
    expect(JSON.parse(localStorage.getItem('bramble:v1:settings')!).theme).toBe('midnight');
    expect(root().dataset.theme).toBe('midnight');
  });
  test('corrupted settings JSON → defaults', () => {
    localStorage.setItem('bramble:v1:settings', '{"theme":"neon","textScale":9}');
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem('bramble:v1:settings', '{bad');
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    // a valid console theme round-trips
    localStorage.setItem('bramble:v1:settings', JSON.stringify({ ...DEFAULT_SETTINGS, theme: 'checker' }));
    resetSettingsCache();
    expect(getSettings().theme).toBe('checker');
  });
  test('Clear my data asks for confirmation and then empties favorites', async () => {
    localStorage.setItem('bramble:v1:favorites', '["orbit-hop"]');
    stubCatalog([]);
    renderApp('/settings');
    await userEvent.click(await screen.findByRole('button', { name: 'Clear my data…' }));
    expect(localStorage.getItem('bramble:v1:favorites')).not.toBeNull();
    const confirm = screen.getByRole('group', { name: /are you sure/i });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Yes, clear everything' }));
    expect(localStorage.getItem('bramble:v1:favorites')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/cleared/i);
  });
});

describe('AboutPage', () => {
  test('lists credits for each game and the privacy statement', async () => {
    stubCatalog([summary('orbit-hop', 'Orbit Hop')], {}, [
      { slug: 'orbit-hop', title: 'Orbit Hop', author: 'Bramble', license: 'Original work' },
    ]);
    renderApp('/about');
    const credits = await screen.findByRole('region', { name: 'Credits' });
    expect(await within(credits).findByText(/Orbit Hop/)).toBeInTheDocument();
    expect(within(credits).getByText(/Original work/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Privacy' })).toHaveTextContent(
      'Bramble has no accounts, no analytics and no cookies.',
    );
  });
});
