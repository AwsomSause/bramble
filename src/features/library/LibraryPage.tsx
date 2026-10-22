import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ErrorBox } from '../../app/ErrorBox';
import { usePageTitle } from '../../app/usePageTitle';
import { useCatalogIndex } from '../../catalog/load';
import { filterAndSort, paginate, parseQuery, toSearchParams, type LibraryQuery } from '../../catalog/query';
import { GameGrid } from '../../ui/GameGrid';
import { Pager } from '../../ui/Pager';
import { Spinner } from '../../ui/Spinner';
import { EmptyState } from './EmptyState';
import { Filters } from './Filters';
import styles from './Library.module.css';

export default function LibraryPage() {
  usePageTitle('Games');
  const { status, games, retry } = useCatalogIndex();
  const [params, setParams] = useSearchParams();
  const query = parseQuery(params);

  const results = useMemo(() => filterAndSort(games, query), [games, query.q, query.cat, query.tag, query.collection, query.sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const page = paginate(results, query.page);
  const tags = useMemo(() => [...new Set(games.flatMap((g) => g.tags))].sort(), [games]);
  const collections = useMemo(() => [...new Set(games.map((g) => g.collection))].sort(), [games]);

  const update = (patch: Partial<LibraryQuery>) => setParams(toSearchParams({ ...query, ...patch, page: 1 }));
  const hrefFor = (p: number) => {
    const s = toSearchParams({ ...query, page: p }).toString();
    return s ? `/games?${s}` : '/games';
  };

  if (status === 'loading') return <Spinner label="Loading games…" />;
  if (status === 'error') return <ErrorBox message="We couldn't load the game list. Check your connection." onRetry={retry} />;

  return (
    <>
      <div className={styles.head}>
        <h1>Games</h1>
        <span className={styles.count} aria-live="polite">
          {results.length} {results.length === 1 ? 'game' : 'games'}
        </span>
      </div>
      {games.length === 0 ? (
        <EmptyState games={games}>
          <p>No games in the patch yet. Add one with <code>npm run add-game</code>.</p>
        </EmptyState>
      ) : (
        <>
          <Filters query={query} tags={tags} collections={collections} onChange={update} />
          {results.length === 0 ? (
            <EmptyState games={games}>
              <p>
                No games match
                {query.q ? <> “{query.q}”</> : null}
                {query.cat !== 'all' ? <> in {query.cat}</> : null}
                {query.tag ? <> tagged {query.tag}</> : null}.
              </p>
              <p>
                <Link to="/games">Clear filters</Link>
              </p>
            </EmptyState>
          ) : (
            <>
              <GameGrid games={page.items} />
              <Pager page={page.page} totalPages={page.totalPages} hrefFor={hrefFor} />
            </>
          )}
        </>
      )}
    </>
  );
}
