import { useCallback, useEffect, useState } from 'react';
import type { GameDetails } from '../../catalog/schema';

export const LOAD_TIMEOUT_MS = 15_000;
export type PlayerState = 'loading' | 'ready' | 'timeout' | 'unavailable' | 'blocked';

/**
 * Tracks whether the game frame is loading, ready, stuck, or can't be shown at all.
 * "Ready" is whichever comes first: the frame's load event or the game's bramble:ready message.
 */
export function usePlayerState(game: GameDetails) {
  const fixed: PlayerState | null =
    game.status === 'broken' ? 'unavailable' : game.embedBlocked ? 'blocked' : null;
  const [frameKey, setFrameKey] = useState(0);
  const [live, setLive] = useState<{ key: number; state: PlayerState }>({ key: 0, state: 'loading' });
  const state: PlayerState = fixed ?? (live.key === frameKey ? live.state : 'loading');

  useEffect(() => {
    if (fixed) return;
    const t = window.setTimeout(
      () => setLive((s) => (s.key === frameKey && s.state === 'ready' ? s : { key: frameKey, state: 'timeout' })),
      LOAD_TIMEOUT_MS,
    );
    return () => window.clearTimeout(t);
  }, [fixed, frameKey]);

  const markReady = useCallback(() => setLive({ key: frameKey, state: 'ready' }), [frameKey]);
  const retry = useCallback(() => setFrameKey((k) => k + 1), []);

  return { state, frameKey, onFrameLoad: markReady, onReadyMessage: markReady, retry };
}
