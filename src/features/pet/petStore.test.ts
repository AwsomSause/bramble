import { beforeEach, describe, expect, test } from 'vitest';
import { adopt, care, getActive, getPets, PETS_KEY, removePet, resetPetCache, selectPet } from './petStore';
import { DEATH_MS } from './pet-logic';

beforeEach(() => {
  localStorage.clear();
  resetPetCache();
});

describe('petStore', () => {
  test('adopt creates a pet and makes it active', () => {
    const p = adopt('Berry', 1000);
    expect(getPets().map((x) => x.name)).toEqual(['Berry']);
    expect(getActive()?.id).toBe(p.id);
    expect(JSON.parse(localStorage.getItem(PETS_KEY)!).activeId).toBe(p.id);
  });

  test('a shelf of several, switchable', () => {
    adopt('A', 1000);
    adopt('B', 2000);
    expect(getActive()?.name).toBe('B');
    const a = getPets().find((p) => p.name === 'A')!;
    selectPet(a.id);
    expect(getActive()?.name).toBe('A');
  });

  test('care updates and persists the active pet', () => {
    const p = adopt('Berry', 1000);
    const t = 1000 + 5 * 3600_000;
    care(p.id, 'clean', t);
    expect(getPets(t)[0]!.stats.cleanliness).toBe(100);
    expect(getPets(t)[0]!.lastTended).toBe(t);
  });

  test('a pet left past the death window shows as not alive and cannot be cared for', () => {
    const p = adopt('Doomed', 1000);
    const later = 1000 + DEATH_MS + 1000;
    expect(getPets(later)[0]!.alive).toBe(false);
    care(p.id, 'feed', later);
    expect(getPets(later)[0]!.alive).toBe(false); // care did not revive it
  });

  test('removing the active pet selects another, or none', () => {
    const a = adopt('A', 1000);
    const b = adopt('B', 2000);
    removePet(b.id);
    expect(getActive()?.name).toBe('A');
    removePet(a.id);
    expect(getActive()).toBeUndefined();
    expect(getPets()).toEqual([]);
  });

  test('corrupt storage is ignored', () => {
    localStorage.setItem(PETS_KEY, '{nope');
    resetPetCache();
    expect(getPets()).toEqual([]);
  });
});
