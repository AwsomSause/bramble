import { useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorBox } from '../../app/ErrorBox';
import { usePageTitle } from '../../app/usePageTitle';
import { buildFrameAttrs, parseGameMessage, reportIssueUrl } from '../../catalog/frame';
import { useGameDetails } from '../../catalog/load';
import { parseAspectRatio, type GameDetails } from '../../catalog/schema';
import { useBestScore, useFavorites, useRecent } from '../../lib/stores';
import { Box } from '../../ui/Box';
import { Button, buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Spinner } from '../../ui/Spinner';
import NotFound from '../notfound/NotFound';
import { useFullscreen } from './useFullscreen';
import { usePlayerState } from './usePlayerState';
import styles from './Player.module.css';

const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

function Player({ game }: { game: GameDetails }) {
  usePageTitle(game.title);
  const navigate = useNavigate();
  const { push } = useRecent();
  const { isFavorite, toggle } = useFavorites();
  const [best, recordBest] = useBestScore(game.slug);
  const { state, frameKey, onFrameLoad, onReadyMessage, retry } = usePlayerState(game);
  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const fs = useFullscreen(viewportRef);
  const attrs = buildFrameAttrs(game, import.meta.env.BASE_URL);
  const fav = isFavorite(game.slug);

  useEffect(() => push(game.slug), [game.slug, push]);

  // Only trust messages that really come from this game's frame, and only our two message shapes.
  const onMessage = useCallback(
    (e: MessageEvent) => {
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return;
      const msg = parseGameMessage(e.data);
      if (msg?.type === 'bramble:ready') onReadyMessage();
      if (msg?.type === 'bramble:score') recordBest(msg.score);
    },
    [onReadyMessage, recordBest],
  );
  useEffect(() => {
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onMessage]);

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/games');
  };

  const reportHref = reportIssueUrl(game, navigator.userAgent);
  const playable = state !== 'unavailable' && state !== 'blocked';
  const ratio = parseAspectRatio(game.aspectRatio);

  return (
    <>
      <nav aria-label="Breadcrumb" className={styles.crumbs}>
        <ol>
          <li>
            <Link to="/games">Games</Link>
          </li>
          <li>
            <Link to={`/games?cat=${game.category}`}>{cap(game.category)}</Link>
          </li>
          <li aria-current="page">{game.title}</li>
        </ol>
      </nav>
      <h1 className={styles.title}>{game.title}</h1>
      <div className={styles.layout}>
        <div className={styles.stage}>
          <div
            ref={viewportRef}
            data-testid="viewport"
            className={`${styles.viewport} ${fs.expanded ? styles.expanded : ''}`}
            style={playable ? { aspectRatio: String(ratio), maxWidth: `calc((100vh - 220px) * ${ratio})` } : undefined}
          >
            {state === 'unavailable' && (
              <div className={styles.notice}>
                <div>
                  <p>Sorry — {game.title} isn't working right now.</p>
                  <p>
                    <Link to="/games">Find another game</Link>
                  </p>
                </div>
              </div>
            )}
            {state === 'blocked' && game.source.type === 'embed' && (
              <div className={styles.notice}>
                <div>
                  <p>This game opens on its own site.</p>
                  <a className={buttonClass('primary')} href={game.source.url} target="_blank" rel="noopener noreferrer">
                    Open {game.title} on its own site
                  </a>
                </div>
              </div>
            )}
            {playable && (
              <iframe
                key={frameKey}
                ref={frameRef}
                src={attrs.src}
                title={attrs.title}
                sandbox={attrs.sandbox}
                allow={attrs.allow || undefined}
                referrerPolicy={attrs.referrerPolicy}
                onLoad={onFrameLoad}
              />
            )}
            {state === 'loading' && (
              <div className={styles.overlay}>
                <Spinner label={`Loading ${game.title}…`} />
              </div>
            )}
            {state === 'timeout' && (
              <div className={styles.overlay} role="alert">
                <div>
                  <p>This game is taking a long time to load.</p>
                  <p>
                    <Button onClick={retry}>Try again</Button>{' '}
                    <a href={reportHref} target="_blank" rel="noopener noreferrer">
                      Report a problem
                    </a>
                  </p>
                </div>
              </div>
            )}
            {fs.expanded && (
              <Button className={styles.closeExpanded} onClick={fs.toggle}>
                Exit full window (Esc)
              </Button>
            )}
          </div>
          <div className={styles.actions}>
            <Button onClick={goBack}>
              <Icon name="back" /> Back to games
            </Button>
            <Button aria-pressed={fav} onClick={() => toggle(game.slug)}>
              <Icon name="star" /> {fav ? 'Favorited' : 'Favorite'}
            </Button>
            {game.fullscreen && playable && (
              <Button onClick={fs.toggle}>
                <Icon name="expand" /> Fullscreen
              </Button>
            )}
            {playable && (
              <Button onClick={retry}>
                <Icon name="reload" /> Reload
              </Button>
            )}
            <a className={buttonClass()} href={reportHref} target="_blank" rel="noopener noreferrer">
              <Icon name="flag" /> Report a problem
            </a>
          </div>
        </div>
        <Box title="About this game" as="aside">
          <p style={{ marginTop: 0 }}>{game.description}</p>
          {game.instructions && (
            <p>
              <strong>How to play:</strong> {game.instructions}
            </p>
          )}
          <dl className={styles.facts}>
            <dt>Controls</dt>
            <dd>{game.controls.map(cap).join(', ')}</dd>
            <dt>Your best</dt>
            <dd>Best score: {best ?? '—'}</dd>
            <dt>Made by</dt>
            <dd>
              {game.attribution.url ? (
                <a href={game.attribution.url} target="_blank" rel="noopener noreferrer">
                  {game.attribution.author}
                </a>
              ) : (
                game.attribution.author
              )}
            </dd>
            <dt>License</dt>
            <dd>
              {game.license.url ? (
                <a href={game.license.url} target="_blank" rel="noopener noreferrer">
                  {game.license.name}
                </a>
              ) : (
                game.license.name
              )}
            </dd>
          </dl>
        </Box>
      </div>
    </>
  );
}

export default function PlayerPage() {
  const { slug = '' } = useParams();
  const { status, game, retry } = useGameDetails(slug);
  if (status === 'loading') return <Spinner label="Loading game…" />;
  if (status === 'notfound') return <NotFound what="game" />;
  if (status === 'error' || !game) {
    return <ErrorBox message="We couldn't load this game's details. Check your connection." onRetry={retry} />;
  }
  return <Player key={game.slug} game={game} />;
}
