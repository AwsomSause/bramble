import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorBox } from '../../app/ErrorBox';
import { usePageTitle } from '../../app/usePageTitle';
import { useCatalogIndex } from '../../catalog/load';
import { pickRandom } from '../../catalog/random';
import type { GameSummary } from '../../catalog/schema';
import { siteConfig } from '../../config';
import { useFavorites, useRecent } from '../../lib/stores';
import { Box } from '../../ui/Box';
import { Button } from '../../ui/Button';
import { GameGrid } from '../../ui/GameGrid';
import { Icon } from '../../ui/Icon';
import { Spinner } from '../../ui/Spinner';
import styles from './Home.module.css';

const SHOW = 6;
const SIDE = 5;

function SlugList({ slugs, bySlug, empty }: { slugs: string[]; bySlug: Map<string, GameSummary>; empty: string }) {
  const items = slugs.map((s) => bySlug.get(s)).filter((g): g is GameSummary => !!g).slice(0, SIDE);
  if (!items.length) return <p className={styles.muted}>{empty}</p>;
  return (
    <ul className={styles.list}>
      {items.map((g) => (
        <li key={g.slug}>
          <Link to={`/play/${g.slug}`}>{g.title}</Link>
        </li>
      ))}
    </ul>
  );
}

export default function HomePage() {
  usePageTitle();
  const navigate = useNavigate();
  const { status, games, retry } = useCatalogIndex();
  const recent = useRecent();
  const favorites = useFavorites();

  const { featured, newest, bySlug } = useMemo(() => {
    const playable = games.filter((g) => g.status === 'available');
    const feat = playable.filter((g) => g.featured);
    return {
      featured: (feat.length ? feat : playable).slice(0, SHOW),
      newest: [...playable].sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.title.localeCompare(b.title)).slice(0, SHOW),
      bySlug: new Map(games.map((g) => [g.slug, g])),
    };
  }, [games]);

  const surprise = () => {
    const g = pickRandom(games);
    if (g) navigate(`/play/${g.slug}`);
  };

  return (
    <>
      <div className={styles.intro}>
        <h1>Welcome to {siteConfig.name}</h1>
        <p>{siteConfig.tagline} Free browser games, picked fresh from the patch.</p>
      </div>
      {status === 'error' && <ErrorBox message="We couldn't load the game list. Check your connection." onRetry={retry} />}
      {status === 'loading' && <Spinner label="Loading games…" />}
      {status === 'ready' && (
        <div className={styles.cols}>
          <div>
            {games.length === 0 ? (
              <Box title="Featured games">
                <p className={styles.muted}>No games in the patch yet. Check back soon!</p>
              </Box>
            ) : (
              <>
                <Box title="Featured games">
                  <GameGrid games={featured} />
                </Box>
                <Box title="Newest games">
                  <GameGrid games={newest} />
                  <p className={styles.more}>
                    <Link to="/games?sort=new">See all games ›</Link>
                  </p>
                </Box>
              </>
            )}
          </div>
          <aside aria-label="Your stuff">
            <Box title="Recently played">
              <SlugList slugs={recent.slugs} bySlug={bySlug} empty="Games you play will show up here." />
            </Box>
            <Box title="Your favorites">
              <SlugList slugs={favorites.slugs} bySlug={bySlug} empty="Tap the ★ on a game to save it here." />
              {favorites.slugs.length > SIDE && (
                <p className={styles.more}>
                  <Link to="/favorites">All favorites ›</Link>
                </p>
              )}
            </Box>
            <Box title="Feeling lucky?">
              <Button variant="primary" onClick={surprise} disabled={!pickRandom(games)}>
                <Icon name="dice" /> Surprise me
              </Button>
            </Box>
          </aside>
        </div>
      )}
    </>
  );
}
