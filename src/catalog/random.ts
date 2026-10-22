import type { GameSummary } from './schema';

/** A random playable game, or null when there are none. */
export function pickRandom(games: GameSummary[], rand: () => number = Math.random): GameSummary | null {
  const playable = games.filter((g) => g.status === 'available');
  if (!playable.length) return null;
  return playable[Math.floor(rand() * playable.length)] ?? null;
}
