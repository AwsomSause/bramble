/* Orbit Hop — drawing, input and screens. Rules live in logic.js. */
(function () {
  'use strict';
  var L = window.OrbitHopLogic;
  var Bridge = window.Bramble || { ready: function () {}, score: function () {} };

  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');
  var $ = function (id) {
    return document.getElementById(id);
  };
  var scoreEl = $('score');
  var bestEl = $('best');
  var panels = { start: $('startPanel'), pause: $('pausePanel'), over: $('overPanel') };

  var state = L.createState(Date.now() & 0xffff);
  var mode = 'start'; // start | play | pause | over
  var best = 0;
  var drawnRadius = 0; // eased ring radius for a smooth hop
  var size = { w: 0, h: 0, dpr: 1 };
  var last = 0;
  var announcedReady = false;

  function show(name) {
    Object.keys(panels).forEach(function (k) {
      panels[k].classList.toggle('hidden', k !== name);
    });
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    size = { w: w, h: h, dpr: dpr };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function start() {
    state = L.createState(Date.now() & 0xffff);
    drawnRadius = 0;
    mode = 'play';
    show(null);
    canvas.focus();
  }

  function pause() {
    if (mode !== 'play') return;
    state.paused = true;
    mode = 'pause';
    show('pause');
    $('resumeBtn').focus();
  }

  function resume() {
    if (mode !== 'pause') return;
    state.paused = false;
    mode = 'play';
    show(null);
    last = 0;
  }

  function hop() {
    if (mode === 'start' || mode === 'over') return start();
    if (mode === 'pause') return resume();
    L.hop(state);
  }

  function gameOver() {
    mode = 'over';
    best = Math.max(best, state.score);
    bestEl.textContent = String(best);
    $('finalScore').textContent = String(state.score);
    show('over');
    $('againBtn').focus();
    Bridge.score(state.score);
  }

  // ---------- drawing ----------
  function polar(cx, cy, r, a) {
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  }

  function drawThorn(x, y, r, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = '#7fbf4a';
    ctx.strokeStyle = '#2f5d17';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rr = i % 2 ? r * 0.45 : r;
      var ang = (i / 10) * Math.PI * 2;
      ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawBerry(x, y, r) {
    var offsets = [[-0.4, -0.35], [0.1, -0.5], [0.5, -0.2], [-0.5, 0.15], [0, 0], [0.45, 0.3], [-0.2, 0.5], [0.2, 0.55]];
    offsets.forEach(function (o) {
      var g = ctx.createRadialGradient(x + o[0] * r - r * 0.12, y + o[1] * r - r * 0.12, 1, x + o[0] * r, y + o[1] * r, r * 0.42);
      g.addColorStop(0, '#d9a6ef');
      g.addColorStop(0.4, '#6b2d8b');
      g.addColorStop(1, '#2a1238');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + o[0] * r, y + o[1] * r, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#4f8a2b';
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.95, r * 0.45, r * 0.18, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    var w = size.w;
    var h = size.h;
    if (!w || !h) return;
    var cx = w / 2;
    var cy = h / 2 + 12;
    var unit = Math.min(w, h - 24);

    var bg = ctx.createRadialGradient(cx, cy, unit * 0.05, cx, cy, unit * 0.7);
    bg.addColorStop(0, '#3b1d4f');
    bg.addColorStop(1, '#170c1e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // the bush in the middle
    ctx.fillStyle = '#2f5d17';
    ctx.beginPath();
    ctx.arc(cx, cy, unit * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4f8a2b';
    for (var k = 0; k < 6; k++) {
      var p = polar(cx, cy, unit * 0.08, k + state.angle * 0.05);
      ctx.beginPath();
      ctx.arc(p[0], p[1], unit * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }

    // rings
    ctx.setLineDash([4, 8]);
    ctx.lineWidth = 2;
    L.ORBITS.forEach(function (f) {
      ctx.strokeStyle = 'rgba(233, 198, 245, 0.35)';
      ctx.beginPath();
      ctx.arc(cx, cy, unit * f, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    var itemR = unit * 0.035;
    state.seeds.forEach(function (s) {
      var p = polar(cx, cy, unit * L.ORBITS[s.orbit], s.angle);
      ctx.fillStyle = '#f5c542';
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], itemR * 0.7, itemR * 0.45, s.angle, 0, Math.PI * 2);
      ctx.fill();
    });
    state.thorns.forEach(function (t) {
      var p = polar(cx, cy, unit * L.ORBITS[t.orbit], t.angle);
      drawThorn(p[0], p[1], itemR * 1.1, t.angle);
    });

    var target = unit * L.ORBITS[state.orbit];
    drawnRadius = drawnRadius ? drawnRadius + (target - drawnRadius) * 0.35 : target;
    var pb = polar(cx, cy, drawnRadius, state.angle);
    drawBerry(pb[0], pb[1], unit * 0.045);

    scoreEl.textContent = String(state.score);
  }

  function frame(t) {
    var dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    if (mode === 'play') {
      L.step(state, dt);
      if (!state.alive) gameOver();
    }
    draw();
    if (!announcedReady) {
      announcedReady = true;
      Bridge.ready();
    }
    window.requestAnimationFrame(frame);
  }

  // ---------- input ----------
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      if (e.target && e.target.tagName === 'BUTTON' && mode !== 'play') return; // let buttons click
      e.preventDefault();
      hop();
    } else if (e.code === 'KeyP') {
      if (mode === 'play') pause();
      else resume();
    } else if (e.code === 'KeyR') {
      start();
    }
  });
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    hop();
  });
  $('startBtn').addEventListener('click', start);
  var knock = $('berryKnock');
  if (knock) knock.addEventListener('click', function () {
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'bramble:knock' }, '*');
  });
  $('againBtn').addEventListener('click', start);
  $('resumeBtn').addEventListener('click', resume);
  $('restartBtn').addEventListener('click', start);
  $('pauseBtn').addEventListener('click', function () {
    if (mode === 'play') pause();
    else resume();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
  });
  window.addEventListener('blur', pause);

  canvas.tabIndex = 0;
  if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  resize();
  show('start');
  window.requestAnimationFrame(frame);
})();
