import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetStoreCaches } from '../lib/stores';

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetStoreCaches();
});

// Match production, where the site lives under /bramble/.
vi.stubEnv('BASE_URL', '/bramble/');
