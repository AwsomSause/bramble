import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ErrorBox } from '../../app/ErrorBox';
import { usePageTitle } from '../../app/usePageTitle';
import { useCatalogIndex } from '../../catalog/load';
import { paginate, parseQuery } from '../../catalog/query';
import type { GameSummary } from '../../catalog/schema';
import { useFavorites } from '../../lib/stores';
import { GameGrid } from '../../ui/GameGrid';
import { Pager } from '../../ui/Pager';
import { Spinner } from '../../ui/Spinner';
import { EmptyState } from './EmptyState';
import styles from './Library.module.css';

export default function FavoritesPage() {
  usePageTitle('Favorites');
  const { status, games, retry } = useCatalogIndex();
  const { slugs } = useFavorites();
  const [params] = useSearchParams();
  const favorites = useMemo(() => {
    const bySlug = new Map(games.map((g) => [g.slug, g]));
    return slugs.map((s) => bySlug.get(s)).filter((g): g is GameSummary => g !== undefined && g.status !== 'hidden');
  }, [games, slugs]);
  const page = paginate(favorites, parseQuery(params).page);

  if (status === 'loading') return <Spinner label="Loading favorites…" />;
  if (status === 'error') return <ErrorBox message="We couldn't load the game list. Check your connection." onRetry={retry} />;

  return (
    <>
      <div className={styles.head}>
        <h1>Favorites</h1>
        <span className={styles.count}>{favorites.length} saved</span>
      </div>
      {favorites.length === 0 ? (
        <EmptyState games={games}>
          <p>Nothing saved yet. Tap the ★ on any game to keep it here.</p>
          <p>
            <Link to="/games">Browse games</Link>
          </p>
        </EmptyState>
      ) : (
        <>
          <GameGrid games={page.items} />
          <Pager page={page.page} totalPages={page.totalPages} hrefFor={(p) => (p > 1 ? `/favorites?page=${p}` : '/favorites')} />
        </>
      )}
    </>
  );
}
