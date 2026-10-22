import { beforeEach, describe, expect, test } from 'vitest';
import {
  awardPlay,
  buy,
  claimDailyIfDue,
  equip,
  getEquipped,
  getOwned,
  getWallet,
  isOwned,
  resetShopCache,
  SHOP_KEY,
} from './shopStore';
import { DAILY_BONUS, PLAY_REWARD } from './economy';

beforeEach(() => {
  localStorage.clear();
  resetShopCache();
});

const giveCoins = (n: number) => {
  localStorage.setItem(SHOP_KEY, JSON.stringify({ wallet: { coins: n, lastDaily: null, playDate: null, playedSlugs: [] }, owned: [], equipped: { cursor: 'cursor-default', accent: 'accent-default' } }));
  resetShopCache();
};

describe('buying', () => {
  test('buy deducts coins and marks the item owned', () => {
    giveCoins(200);
    expect(buy('cursor-berry')).toBe(true);
    expect(getWallet().coins).toBe(140);
    expect(isOwned('cursor-berry')).toBe(true);
  });
  test('cannot buy what you cannot afford', () => {
    giveCoins(10);
    expect(buy('cursor-berry')).toBe(false);
    expect(isOwned('cursor-berry')).toBe(false);
    expect(getWallet().coins).toBe(10);
  });
  test('buying something already owned does nothing and costs nothing', () => {
    giveCoins(200);
    buy('cursor-berry');
    expect(buy('cursor-berry')).toBe(false);
    expect(getWallet().coins).toBe(140);
  });
  test('default items are always owned', () => {
    expect(isOwned('cursor-default')).toBe(true);
    expect(isOwned('accent-default')).toBe(true);
  });
  test('an unknown item cannot be bought', () => {
    giveCoins(999);
    expect(buy('cursor-nonsense')).toBe(false);
  });
});

describe('equipping', () => {
  test('you can equip an owned item, or a default', () => {
    giveCoins(200);
    buy('accent-forest');
    expect(equip('accent-forest')).toBe(true);
    expect(getEquipped().accent).toBe('accent-forest');
    expect(equip('accent-default')).toBe(true);
    expect(getEquipped().accent).toBe('accent-default');
  });
  test('you cannot equip something you do not own', () => {
    expect(equip('cursor-star')).toBe(false);
    expect(getEquipped().cursor).toBe('cursor-default');
  });
});

describe('earning', () => {
  test('daily bonus and play rewards accrue', () => {
    claimDailyIfDue('2026-10-22');
    expect(getWallet().coins).toBe(DAILY_BONUS);
    awardPlay('orbit-hop', '2026-10-22');
    expect(getWallet().coins).toBe(DAILY_BONUS + PLAY_REWARD);
  });
});

test('corrupt storage is ignored', () => {
  localStorage.setItem(SHOP_KEY, '{nope');
  resetShopCache();
  expect(getWallet().coins).toBe(0);
  expect(getOwned()).toEqual([]);
});
