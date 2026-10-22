import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetStoreCaches } from '../lib/stores';
import { resetCatalogCache } from '../catalog/load';

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetStoreCaches();
  resetCatalogCache();
  vi.unstubAllGlobals();
});

// Match production, where the site lives under /bramble/.
vi.stubEnv('BASE_URL', '/bramble/');
