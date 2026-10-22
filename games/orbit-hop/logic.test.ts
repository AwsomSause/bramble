import { describe, expect, test } from 'vitest';
import { loadClassicScript } from '../../src/test/loadClassicScript';

type Item = { angle: number; orbit: 0 | 1 };
type State = {
  orbit: 0 | 1;
  angle: number;
  speed: number;
  score: number;
  seeds: Item[];
  thorns: Item[];
  alive: boolean;
  paused: boolean;
};
type Logic = {
  createState(seed: number): State;
  hop(s: State): void;
  step(s: State, dt: number): State;
  collides(s: State): boolean;
  ORBITS: number[];
  SPEED_START: number;
  SPEED_MAX: number;
  HIT_TOLERANCE: number;
};

const L = loadClassicScript('games/orbit-hop/logic.js').OrbitHopLogic as Logic;

describe('Orbit Hop logic', () => {
  test('exports two orbits as fractions of the canvas', () => {
    expect(Array.from(L.ORBITS)).toEqual([0.32, 0.46]);
  });
  test('hop toggles orbit', () => {
    const s = L.createState(1);
    expect(s.orbit).toBe(0);
    L.hop(s);
    expect(s.orbit).toBe(1);
    L.hop(s);
    expect(s.orbit).toBe(0);
  });
  test('score increases with time while alive', () => {
    const s = L.createState(1);
    L.step(s, 1);
    expect(s.alive).toBe(true);
    expect(s.score).toBeGreaterThan(0);
  });
  test('speed ramps and is capped', () => {
    const s = L.createState(1);
    expect(s.speed).toBe(L.SPEED_START);
    for (let i = 0; i < 2000; i++) {
      s.thorns.length = 0;
      L.step(s, 0.1);
    }
    expect(s.speed).toBe(L.SPEED_MAX);
  });
  test('collides when a thorn shares orbit and angle within tolerance', () => {
    const s = L.createState(1);
    s.thorns = [{ angle: s.angle + L.HIT_TOLERANCE / 2, orbit: s.orbit }];
    expect(L.collides(s)).toBe(true);
    s.thorns = [{ angle: s.angle + L.HIT_TOLERANCE / 2, orbit: 1 }];
    expect(L.collides(s)).toBe(false);
    s.thorns = [{ angle: s.angle + L.HIT_TOLERANCE * 2, orbit: s.orbit }];
    expect(L.collides(s)).toBe(false);
  });
  test('hitting a thorn ends the round', () => {
    const s = L.createState(1);
    s.thorns = [{ angle: s.angle + 0.05, orbit: s.orbit }];
    L.step(s, 0.05);
    expect(s.alive).toBe(false);
  });
  test('collecting a seed adds points and removes it', () => {
    const s = L.createState(1);
    s.seeds = [{ angle: s.angle + 0.02, orbit: s.orbit }];
    const before = s.score;
    L.step(s, 0.02);
    expect(s.seeds).toHaveLength(0);
    expect(s.score).toBeGreaterThanOrEqual(before + 10);
  });
  test('step does nothing when paused or dead', () => {
    const s = L.createState(1);
    s.paused = true;
    L.step(s, 1);
    expect(s.score).toBe(0);
    s.paused = false;
    s.alive = false;
    L.step(s, 1);
    expect(s.score).toBe(0);
    L.hop(s);
    expect(s.orbit).toBe(0);
  });
  test('same seed → same thorn sequence', () => {
    const a = L.createState(42);
    const b = L.createState(42);
    for (let i = 0; i < 30; i++) {
      L.step(a, 0.1);
      L.step(b, 0.1);
    }
    expect(a.thorns.length).toBeGreaterThan(0);
    expect(JSON.stringify(a.thorns)).toBe(JSON.stringify(b.thorns));
  });
  test('never spawns thorns blocking both orbits at once', () => {
    const s = L.createState(7);
    for (let i = 0; i < 3000; i++) {
      L.step(s, 0.05);
      if (!s.alive) {
        s.alive = true;
      }
      for (const t of s.thorns) {
        const blocked = s.thorns.some((u) => u.orbit !== t.orbit && Math.abs(u.angle - t.angle) < 0.35);
        expect(blocked).toBe(false);
      }
    }
  });
});
