/**
 * Pure rules for a Bramble Buddy pet. No storage, no DOM — just how a pet changes over
 * real time and in response to care, so it can all be unit-tested with explicit timestamps.
 *
 * Model: `stats` are the values as of `lastTended`. The current values are derived from how
 * much time has passed since then. Caring for the pet bakes the derived values back in and
 * resets `lastTended`. Leave a pet untended past DEATH_MS and it is gone (the owner chose
 * Tamagotchi-style stakes).
 */

const HOUR = 3600_000;
export const MAX = 100;
/** Neglect this long (3 days) ends the pet. */
export const DEATH_MS = 72 * HOUR;

export type StatName = 'hunger' | 'happiness' | 'energy' | 'cleanliness';
export type Stats = Record<StatName, number>;
export type Action = 'feed' | 'play' | 'clean' | 'sleep';
export type Mood = 'happy' | 'ok' | 'sad' | 'sick';

export type Pet = {
  id: string;
  name: string;
  imageDataUrl?: string;
  bornAt: number;
  lastTended: number;
  stats: Stats;
  alive: boolean;
  diedAt?: number;
};

/** How fast each need falls per hour with no care (empty in roughly a day or so). */
const DECAY_PER_HOUR: Stats = { hunger: 4.5, happiness: 3.5, energy: 3, cleanliness: 2.5 };

/** What an action does to the stats. */
const EFFECTS: Record<Action, Partial<Stats>> = {
  feed: { hunger: 55, happiness: 5 },
  play: { happiness: 55, energy: -15 },
  clean: { cleanliness: 70 },
  sleep: { energy: 60, happiness: 5 },
};

const clamp = (n: number): number => Math.max(0, Math.min(MAX, n));

function randomId(): string {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    return `pet-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export function makePet(name: string, now: number, imageDataUrl?: string): Pet {
  return {
    id: randomId(),
    name: name.trim() || 'Buddy',
    imageDataUrl,
    bornAt: now,
    lastTended: now,
    stats: { hunger: MAX, happiness: MAX, energy: MAX, cleanliness: MAX },
    alive: true,
  };
}

/** Current display stats + whether the pet is still alive, as of `now`. Pure (no mutation). */
export function derive(pet: Pet, now: number): { stats: Stats; alive: boolean; diedAt?: number } {
  if (!pet.alive) return { stats: pet.stats, alive: false, diedAt: pet.diedAt };
  const elapsed = Math.max(0, now - pet.lastTended);
  if (elapsed >= DEATH_MS) {
    return { stats: { hunger: 0, happiness: 0, energy: 0, cleanliness: 0 }, alive: false, diedAt: pet.lastTended + DEATH_MS };
  }
  const hours = elapsed / HOUR;
  const stats = {} as Stats;
  for (const k of Object.keys(pet.stats) as StatName[]) stats[k] = clamp(pet.stats[k] - DECAY_PER_HOUR[k] * hours);
  return { stats, alive: true };
}

/** Feed / play / clean / sleep. Applies pending decay first, then the action, and resets the clock. */
export function careFor(pet: Pet, action: Action, now: number): Pet {
  const d = derive(pet, now);
  if (!d.alive) return pet.alive ? { ...pet, alive: false, diedAt: d.diedAt, stats: d.stats } : pet;
  const stats = { ...d.stats };
  for (const [k, delta] of Object.entries(EFFECTS[action]) as [StatName, number][]) stats[k] = clamp(stats[k] + delta);
  return { ...pet, stats, lastTended: now };
}

export function mood(stats: Stats): Mood {
  const min = Math.min(stats.hunger, stats.happiness, stats.energy, stats.cleanliness);
  if (min < 10) return 'sick';
  if (min < 35) return 'sad';
  if (min < 60) return 'ok';
  return 'happy';
}

export function ageDays(pet: Pet, now: number): number {
  return Math.max(0, Math.floor((now - pet.bornAt) / (24 * HOUR)));
}

export function stage(pet: Pet, now: number): 'baby' | 'kid' | 'grown' {
  const days = ageDays(pet, now);
  if (days >= 5) return 'grown';
  if (days >= 2) return 'kid';
  return 'baby';
}

/** Reconcile a stored pet with the clock: if it has died while away, bake that in once. */
export function reconcile(pet: Pet, now: number): Pet {
  if (!pet.alive) return pet;
  const d = derive(pet, now);
  return d.alive ? pet : { ...pet, alive: false, diedAt: d.diedAt, stats: d.stats };
}
