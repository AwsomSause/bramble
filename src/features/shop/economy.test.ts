import { describe, expect, test } from 'vitest';
import {
  canAfford,
  claimDaily,
  DAILY_BONUS,
  DEFAULT_WALLET,
  isoDay,
  PLAY_CAP,
  PLAY_REWARD,
  rewardPlay,
  spend,
  type Wallet,
} from './economy';

const w = (over: Partial<Wallet> = {}): Wallet => ({ ...DEFAULT_WALLET, ...over });

describe('claimDaily', () => {
  test('grants the bonus once per day', () => {
    const a = claimDaily(w(), '2026-10-22');
    expect(a.coins).toBe(DAILY_BONUS);
    expect(a.lastDaily).toBe('2026-10-22');
    const again = claimDaily(a, '2026-10-22');
    expect(again.coins).toBe(DAILY_BONUS); // no double-dip
    const nextDay = claimDaily(a, '2026-10-23');
    expect(nextDay.coins).toBe(DAILY_BONUS * 2);
  });
});

describe('rewardPlay', () => {
  test('pays for each new game once per day, up to the cap', () => {
    let wallet = w();
    wallet = rewardPlay(wallet, 'orbit-hop', '2026-10-22');
    expect(wallet.coins).toBe(PLAY_REWARD);
    wallet = rewardPlay(wallet, 'orbit-hop', '2026-10-22'); // same game again, no pay
    expect(wallet.coins).toBe(PLAY_REWARD);
    wallet = rewardPlay(wallet, 'berry-blocks', '2026-10-22');
    expect(wallet.coins).toBe(PLAY_REWARD * 2);
  });

  test('resets the per-day list on a new day', () => {
    let wallet = rewardPlay(w(), 'orbit-hop', '2026-10-22');
    wallet = rewardPlay(wallet, 'orbit-hop', '2026-10-23');
    expect(wallet.coins).toBe(PLAY_REWARD * 2);
  });

  test('stops paying after the daily cap', () => {
    let wallet = w();
    for (let i = 0; i < PLAY_CAP + 5; i++) wallet = rewardPlay(wallet, `game-${i}`, '2026-10-22');
    expect(wallet.coins).toBe(PLAY_REWARD * PLAY_CAP);
  });
});

describe('spend / canAfford', () => {
  test('canAfford checks the balance', () => {
    expect(canAfford(w({ coins: 50 }), 50)).toBe(true);
    expect(canAfford(w({ coins: 49 }), 50)).toBe(false);
  });
  test('spend deducts, or returns null when too poor', () => {
    expect(spend(w({ coins: 100 }), 30)?.coins).toBe(70);
    expect(spend(w({ coins: 10 }), 30)).toBeNull();
  });
});

describe('isoDay', () => {
  test('is a YYYY-MM-DD string', () => {
    expect(isoDay(Date.parse('2026-10-22T23:30:00Z'))).toBe('2026-10-22');
  });
});
