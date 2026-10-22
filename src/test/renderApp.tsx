import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { vi } from 'vitest';
import App from '../App';
import type { GameDetails, GameSummary } from '../catalog/schema';

export function summary(slug: string, title: string, over: Partial<GameSummary> = {}): GameSummary {
  return {
    id: slug,
    slug,
    title,
    category: 'arcade',
    tags: [],
    collection: 'bramble',
    thumbnail: undefined,
    mobile: 'yes',
    featured: false,
    addedAt: '2026-01-01',
    status: 'available',
    ...over,
  };
}

function Probe() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

/** Serves fake catalog files to the app via a stubbed fetch. */
export function stubCatalog(index: GameSummary[] | 'fail', details: Record<string, GameDetails | 'fail'> = {}) {
  const fetchMock = vi.fn((url: string) => {
    const respond = (body: unknown, status = 200) =>
      Promise.resolve(new Response(JSON.stringify(body), { status }));
    if (url.endsWith('/catalog/index.json')) {
      return index === 'fail' ? Promise.reject(new TypeError('offline')) : respond(index);
    }
    const m = /\/catalog\/games\/([a-z0-9_-]+)\.json$/.exec(url);
    const d = m ? details[m[1]!] : undefined;
    if (d === 'fail') return Promise.reject(new TypeError('offline'));
    return d ? respond(d) : respond({}, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Probe />
    </MemoryRouter>,
  );
}
