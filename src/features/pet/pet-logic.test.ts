import { describe, expect, test } from 'vitest';
import {
  ageDays,
  careFor,
  DEATH_MS,
  derive,
  makePet,
  mood,
  stage,
  type Pet,
} from './pet-logic';

const HOUR = 3600_000;
const now0 = Date.parse('2026-10-22T12:00:00Z');

const freshPet = (over: Partial<Pet> = {}): Pet => ({ ...makePet('Berry', now0), ...over });

describe('makePet', () => {
  test('starts full, alive, with the given name and birth time', () => {
    const p = makePet('Berry', now0);
    expect(p.name).toBe('Berry');
    expect(p.alive).toBe(true);
    expect(p.bornAt).toBe(now0);
    expect(p.lastTended).toBe(now0);
    expect(p.stats).toEqual({ hunger: 100, happiness: 100, energy: 100, cleanliness: 100 });
    expect(p.id).toMatch(/.+/);
  });
});

describe('derive', () => {
  test('stats decay over time but never below 0', () => {
    const d = derive(freshPet(), now0 + 10 * HOUR);
    expect(d.stats.hunger).toBeLessThan(100);
    expect(d.stats.hunger).toBeGreaterThan(0);
    const floored = derive(freshPet(), now0 + 60 * HOUR);
    expect(floored.stats.hunger).toBe(0);
    expect(d.alive).toBe(true);
  });

  test('no time passed = no change', () => {
    expect(derive(freshPet(), now0).stats).toEqual({ hunger: 100, happiness: 100, energy: 100, cleanliness: 100 });
  });

  test('a pet neglected past the death window is no longer alive', () => {
    const d = derive(freshPet(), now0 + DEATH_MS);
    expect(d.alive).toBe(false);
    expect(d.diedAt).toBe(now0 + DEATH_MS);
  });

  test('just under the death window is still alive', () => {
    expect(derive(freshPet(), now0 + DEATH_MS - HOUR).alive).toBe(true);
  });

  test('an already-dead pet stays dead and its stats stay put', () => {
    const dead = freshPet({ alive: false, diedAt: now0, stats: { hunger: 0, happiness: 0, energy: 0, cleanliness: 0 } });
    const d = derive(dead, now0 + 1000 * HOUR);
    expect(d.alive).toBe(false);
    expect(d.diedAt).toBe(now0);
  });
});

describe('careFor', () => {
  test('feed raises hunger and resets the neglect clock', () => {
    const hungry = derive(freshPet(), now0 + 10 * HOUR);
    const fed = careFor(freshPet(), 'feed', now0 + 10 * HOUR);
    expect(fed.stats.hunger).toBeGreaterThan(hungry.stats.hunger);
    expect(fed.lastTended).toBe(now0 + 10 * HOUR);
  });

  test('each action targets its stat and clamps at 100', () => {
    expect(careFor(freshPet(), 'clean', now0).stats.cleanliness).toBe(100);
    const playful = careFor(freshPet(), 'play', now0);
    expect(playful.stats.happiness).toBe(100);
    expect(playful.stats.energy).toBeLessThanOrEqual(100); // play costs a little energy
    expect(careFor(freshPet(), 'sleep', now0 + 20 * HOUR).stats.energy).toBeGreaterThan(derive(freshPet(), now0 + 20 * HOUR).stats.energy);
  });

  test('you cannot care for a dead pet', () => {
    const dead = freshPet({ alive: false });
    expect(careFor(dead, 'feed', now0 + HOUR)).toEqual(dead);
  });

  test('caring applies pending decay first, so stats are consistent', () => {
    // 10h of decay then a feed: hunger should be (decayed + feed bump), clamped
    const fed = careFor(freshPet(), 'feed', now0 + 10 * HOUR);
    expect(fed.stats.happiness).toBeLessThan(100); // happiness decayed and wasn't the fed stat
  });
});

describe('mood', () => {
  test('reflects the worst-cared-for need', () => {
    expect(mood({ hunger: 100, happiness: 100, energy: 100, cleanliness: 100 })).toBe('happy');
    expect(mood({ hunger: 55, happiness: 60, energy: 70, cleanliness: 80 })).toBe('ok');
    expect(mood({ hunger: 20, happiness: 60, energy: 70, cleanliness: 80 })).toBe('sad');
    expect(mood({ hunger: 2, happiness: 60, energy: 70, cleanliness: 80 })).toBe('sick');
  });
});

describe('age and stage', () => {
  test('ageDays counts from birth and never goes negative', () => {
    expect(ageDays(freshPet(), now0 + 3 * 24 * HOUR)).toBe(3);
    expect(ageDays(freshPet(), now0 - 5000)).toBe(0);
  });
  test('stage grows with age', () => {
    expect(stage(freshPet(), now0)).toBe('baby');
    expect(stage(freshPet(), now0 + 2 * 24 * HOUR)).toBe('kid');
    expect(stage(freshPet(), now0 + 7 * 24 * HOUR)).toBe('grown');
  });
});
