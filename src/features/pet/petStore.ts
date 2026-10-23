/**
 * The shelf of pets, kept in this browser only. Pets are stored as last-tended snapshots;
 * display values are derived from the clock (see pet-logic), so a pet can "die" while you're
 * away. Nothing here is uploaded, including the imported pet image.
 */
import { useSyncExternalStore } from 'react';
import { readJSON, writeJSON } from '../../lib/storage';
import { careFor, makePet, reconcile, type Action, type Pet } from './pet-logic';

export const PETS_KEY = 'bramble:v1:pets';

type PetState = { pets: Pet[]; activeId: string | null };

const isState = (v: unknown): v is PetState =>
  !!v &&
  typeof v === 'object' &&
  Array.isArray((v as PetState).pets) &&
  (v as PetState).pets.every((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && !!p.stats);

const EMPTY: PetState = { pets: [], activeId: null };

let cache: PetState | undefined;
const listeners = new Set<() => void>();
const read = (): PetState => (cache ??= readJSON(PETS_KEY, EMPTY, isState));
const write = (s: PetState) => {
  cache = s;
  writeJSON(PETS_KEY, s);
  listeners.forEach((l) => l());
};

export function resetPetCache(): void {
  cache = undefined;
  listeners.forEach((l) => l());
}

/** Pets reconciled to `now` for display (a pet that died while away shows as not alive). */
export function getPets(now: number = Date.now()): Pet[] {
  return read().pets.map((p) => reconcile(p, now));
}
export function getActive(now: number = Date.now()): Pet | undefined {
  const { activeId } = read();
  return getPets(now).find((p) => p.id === activeId);
}

export function adopt(name: string, now: number = Date.now(), imageDataUrl?: string): Pet {
  const pet = makePet(name, now, imageDataUrl);
  const { pets } = read();
  write({ pets: [...pets, pet], activeId: pet.id });
  return pet;
}

export function selectPet(id: string): void {
  if (read().pets.some((p) => p.id === id)) write({ ...read(), activeId: id });
}

export function care(id: string, action: Action, now: number = Date.now()): void {
  write({ ...read(), pets: read().pets.map((p) => (p.id === id ? careFor(p, action, now) : p)) });
}

export function removePet(id: string): void {
  const pets = read().pets.filter((p) => p.id !== id);
  const activeId = read().activeId === id ? (pets[pets.length - 1]?.id ?? null) : read().activeId;
  write({ pets, activeId });
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PETS_KEY || e.key === null) resetPetCache();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
}

/** Raw stored state (not reconciled); components derive display values with a ticking clock. */
export function usePetState(): PetState {
  return useSyncExternalStore(subscribe, read);
}
