import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetStoreCaches } from '../lib/stores';
import { resetCatalogCache } from '../catalog/load';
import { resetSettingsCache } from '../features/settings/useSettings';
import { resetPetCache } from '../features/pet/petStore';
import { resetDraftCache } from '../features/admin/drafts';
import { resetShopCache } from '../features/shop/shopStore';

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetStoreCaches();
  resetCatalogCache();
  resetSettingsCache();
  resetPetCache();
  resetDraftCache();
  resetShopCache();
  vi.unstubAllGlobals();
});

// Match production, where the site lives under /bramble/.
vi.stubEnv('BASE_URL', '/bramble/');
