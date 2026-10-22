import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { pickRandom } from '../../catalog/random';
import type { GameSummary } from '../../catalog/schema';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import styles from './Library.module.css';

export function EmptyState({ children, games }: { children: ReactNode; games: GameSummary[] }) {
  const navigate = useNavigate();
  const pick = pickRandom(games);
  return (
    <div className={styles.empty}>
      {children}
      {pick && (
        <Button onClick={() => navigate(`/play/${pick.slug}`)}>
          <Icon name="dice" /> Surprise me
        </Button>
      )}
    </div>
  );
}
