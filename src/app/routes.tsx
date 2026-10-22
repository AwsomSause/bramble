import { lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import HomePage from '../features/home/HomePage';
import NotFound from '../features/notfound/NotFound';
import { Spinner } from '../ui/Spinner';
import { Layout } from './Layout';

// Everything except Home is split into its own file and loaded on first visit.
const LibraryPage = lazy(() => import('../features/library/LibraryPage'));
const FavoritesPage = lazy(() => import('../features/library/FavoritesPage'));
const PlayerPage = lazy(() => import('../features/player/PlayerPage'));
const PetPage = lazy(() => import('../features/pet/PetPage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
const AboutPage = lazy(() => import('../features/about/AboutPage'));

const lazyPage = (node: ReactNode) => <Suspense fallback={<Spinner />}>{node}</Suspense>;

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="games" element={lazyPage(<LibraryPage />)} />
        <Route path="favorites" element={lazyPage(<FavoritesPage />)} />
        <Route path="play/:slug" element={lazyPage(<PlayerPage />)} />
        <Route path="pet" element={lazyPage(<PetPage />)} />
        <Route path="settings" element={lazyPage(<SettingsPage />)} />
        <Route path="about" element={lazyPage(<AboutPage />)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
