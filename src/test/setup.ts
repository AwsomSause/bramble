import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetStoreCaches } from '../lib/stores';

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetStoreCaches();
});
