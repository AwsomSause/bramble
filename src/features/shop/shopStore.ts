/** The Patch Shop's per-browser state: your coin wallet, what you own, and what's equipped. */
import { useSyncExternalStore } from 'react';
import { readJSON, writeJSON } from '../../lib/storage';
import { claimDaily, DEFAULT_WALLET, isoDay, rewardPlay, spend, type Wallet } from './economy';
import { DEFAULT_ITEMS, isDefaultItem, itemById, type ItemType } from './catalog';

export const SHOP_KEY = 'bramble:v1:shop';

type Equipped = { cursor: string; accent: string };
type ShopState = { wallet: Wallet; owned: string[]; equipped: Equipped };

const DEFAULT_STATE: ShopState = {
  wallet: DEFAULT_WALLET,
  owned: [],
  equipped: { cursor: DEFAULT_ITEMS.cursor, accent: DEFAULT_ITEMS.accent },
};

const isState = (v: unknown): v is ShopState => {
  if (!v || typeof v !== 'object') return false;
  const s = v as ShopState;
  return (
    !!s.wallet &&
    typeof s.wallet.coins === 'number' &&
    Number.isFinite(s.wallet.coins) &&
    Array.isArray(s.owned) &&
    !!s.equipped &&
    typeof s.equipped.cursor === 'string' &&
    typeof s.equipped.accent === 'string'
  );
};

let cache: ShopState | undefined;
const listeners = new Set<() => void>();
const read = (): ShopState => (cache ??= readJSON(SHOP_KEY, DEFAULT_STATE, isState));
const write = (s: ShopState) => {
  cache = s;
  writeJSON(SHOP_KEY, s);
  listeners.forEach((l) => l());
};

export function resetShopCache(): void {
  cache = undefined;
  listeners.forEach((l) => l());
}

export const getWallet = (): Wallet => read().wallet;
export const getOwned = (): string[] => read().owned;
export const getEquipped = (): Equipped => read().equipped;
export const isOwned = (id: string): boolean => isDefaultItem(id) || read().owned.includes(id);

export function buy(itemId: string): boolean {
  const item = itemById(itemId);
  if (!item || isOwned(itemId)) return false;
  const after = spend(read().wallet, item.cost);
  if (!after) return false;
  write({ ...read(), wallet: after, owned: [...read().owned, itemId] });
  return true;
}

export function equip(itemId: string): boolean {
  const item = itemById(itemId);
  if (!item || !isOwned(itemId)) return false;
  write({ ...read(), equipped: { ...read().equipped, [item.type]: itemId } });
  return true;
}

export function unequip(type: ItemType): void {
  write({ ...read(), equipped: { ...read().equipped, [type]: DEFAULT_ITEMS[type] } });
}

export function claimDailyIfDue(today: string = isoDay(Date.now())): void {
  const wallet = claimDaily(read().wallet, today);
  if (wallet !== read().wallet) write({ ...read(), wallet });
}

export function awardPlay(slug: string, today: string = isoDay(Date.now())): void {
  const wallet = rewardPlay(read().wallet, slug, today);
  if (wallet !== read().wallet) write({ ...read(), wallet });
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SHOP_KEY || e.key === null) resetShopCache();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
}

export function useShop(): ShopState {
  return useSyncExternalStore(subscribe, read);
}
