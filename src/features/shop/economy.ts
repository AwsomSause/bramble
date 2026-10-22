/**
 * Pure coin economy for the Patch Shop. Coins are PLAY MONEY — earned by playing and by
 * visiting daily, spent on cosmetics. There are no real purchases and no real-world value.
 * All per-browser; pure functions so earning/spending is easy to test.
 */
export type Wallet = {
  coins: number;
  lastDaily: string | null; // ISO day the daily bonus was last claimed
  playDate: string | null; // ISO day the play list below applies to
  playedSlugs: string[]; // games already rewarded today
};

export const DEFAULT_WALLET: Wallet = { coins: 0, lastDaily: null, playDate: null, playedSlugs: [] };

export const DAILY_BONUS = 25;
export const PLAY_REWARD = 5;
export const PLAY_CAP = 10; // most games rewarded per day

export function isoDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function claimDaily(wallet: Wallet, today: string): Wallet {
  if (wallet.lastDaily === today) return wallet;
  return { ...wallet, coins: wallet.coins + DAILY_BONUS, lastDaily: today };
}

export function rewardPlay(wallet: Wallet, slug: string, today: string): Wallet {
  const played = wallet.playDate === today ? wallet.playedSlugs : [];
  if (played.includes(slug) || played.length >= PLAY_CAP) {
    return { ...wallet, playDate: today, playedSlugs: played };
  }
  return { ...wallet, coins: wallet.coins + PLAY_REWARD, playDate: today, playedSlugs: [...played, slug] };
}

export function canAfford(wallet: Wallet, cost: number): boolean {
  return wallet.coins >= cost;
}

export function spend(wallet: Wallet, cost: number): Wallet | null {
  if (wallet.coins < cost) return null;
  return { ...wallet, coins: wallet.coins - cost };
}
