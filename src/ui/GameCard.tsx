import { Link } from 'react-router';
import type { GameSummary } from '../catalog/schema';
import { useFavorites } from '../lib/stores';
import { Icon } from './Icon';
import { Thumb } from './Thumb';
import styles from './GameCard.module.css';

const MOBILE_LABEL = { yes: 'Works on phones', partial: 'Phones: partly', no: 'Desktop only' } as const;

export function GameCard({ game }: { game: GameSummary }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(game.slug);
  return (
    <article className={styles.card}>
      <Link to={`/play/${game.slug}`} className={styles.link}>
        <Thumb src={game.thumbnail} title={game.title} />
        <span className={styles.title}>{game.title}</span>
      </Link>
      {game.draft && <span className={styles.draftBadge}>Draft</span>}
      <p className={styles.meta}>
        <span style={{ textTransform: 'capitalize' }}>{game.category}</span> · {MOBILE_LABEL[game.mobile]}
      </p>
      <button
        type="button"
        className={styles.star}
        aria-pressed={fav}
        aria-label={`${fav ? 'Remove' : 'Add'} ${game.title} ${fav ? 'from' : 'to'} favorites`}
        onClick={() => toggle(game.slug)}
      >
        <Icon name="star" size={16} />
      </button>
    </article>
  );
}
