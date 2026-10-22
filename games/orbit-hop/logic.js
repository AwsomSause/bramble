/*
 * Orbit Hop — game rules (no drawing here, so they can be unit-tested).
 * A berry circles the center. Hop between the inner and outer orbit to dodge
 * thorns and grab seeds. The berry speeds up over time.
 */
(function (root) {
  'use strict';

  var ORBITS = [0.32, 0.46]; // ring radius as a fraction of the canvas' smaller side
  var SPEED_START = 1.6; // radians per second
  var SPEED_MAX = 4.0;
  var SPEED_RAMP = 0.04; // added per second
  var HIT_TOLERANCE = 0.12; // radians
  var SPAWN_EVERY = 0.8; // seconds
  var SAFE_GAP = 0.35; // never block both orbits within this angle
  var SEED_POINTS = 10;

  // Small seeded random number generator (mulberry32) so a seed always plays the same.
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createState(seed) {
    return {
      orbit: 0,
      angle: 0,
      speed: SPEED_START,
      score: 0,
      points: 0, // fractional time points
      seeds: [],
      thorns: [],
      alive: true,
      paused: false,
      spawnTimer: 0,
      random: rng(seed),
    };
  }

  function hop(s) {
    if (!s.alive || s.paused) return;
    s.orbit = s.orbit === 0 ? 1 : 0;
  }

  function near(a, b, tol) {
    return Math.abs(a - b) < tol;
  }

  function collides(s) {
    for (var i = 0; i < s.thorns.length; i++) {
      var t = s.thorns[i];
      if (t.orbit === s.orbit && near(t.angle, s.angle, HIT_TOLERANCE)) return true;
    }
    return false;
  }

  function spawn(s) {
    var angle = s.angle + Math.PI * 0.9 + s.random() * 0.6;
    var orbit = s.random() < 0.5 ? 0 : 1;
    var isSeed = s.random() < 0.25;
    if (isSeed) {
      s.seeds.push({ angle: angle, orbit: orbit });
      return;
    }
    var other = orbit === 0 ? 1 : 0;
    for (var i = 0; i < s.thorns.length; i++) {
      var t = s.thorns[i];
      if (t.orbit === other && near(t.angle, angle, SAFE_GAP)) {
        orbit = other; // put it beside the existing thorn instead of across from it
        break;
      }
    }
    s.thorns.push({ angle: angle, orbit: orbit });
  }

  function step(s, dt) {
    if (!s.alive || s.paused) return s;
    s.angle += s.speed * dt;
    s.speed = Math.min(SPEED_MAX, s.speed + SPEED_RAMP * dt);
    s.points += dt * 10;

    s.spawnTimer += dt;
    while (s.spawnTimer >= SPAWN_EVERY) {
      s.spawnTimer -= SPAWN_EVERY;
      spawn(s);
    }

    var kept = [];
    for (var i = 0; i < s.seeds.length; i++) {
      var seed = s.seeds[i];
      if (seed.orbit === s.orbit && near(seed.angle, s.angle, HIT_TOLERANCE)) s.points += SEED_POINTS;
      else if (seed.angle > s.angle - 1) kept.push(seed);
    }
    s.seeds = kept;
    s.thorns = s.thorns.filter(function (t) {
      return t.angle > s.angle - 1;
    });

    s.score = Math.floor(s.points);
    if (collides(s)) s.alive = false;
    return s;
  }

  root.OrbitHopLogic = {
    ORBITS: ORBITS,
    SPEED_START: SPEED_START,
    SPEED_MAX: SPEED_MAX,
    HIT_TOLERANCE: HIT_TOLERANCE,
    createState: createState,
    hop: hop,
    step: step,
    collides: collides,
  };
})(typeof window !== 'undefined' ? window : globalThis);
