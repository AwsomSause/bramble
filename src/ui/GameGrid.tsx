import type { GameSummary } from '../catalog/schema';
import { GameCard } from './GameCard';
import styles from './GameGrid.module.css';

export function GameGrid({ games }: { games: GameSummary[] }) {
  return (
    <ul className={styles.grid}>
      {games.map((g) => (
        <li key={g.slug}>
          <GameCard game={g} />
        </li>
      ))}
    </ul>
  );
}
