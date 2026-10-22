/*
 * Bramble bridge — include in your own games with:
 *   <script src="../../bramble-bridge.js"></script>
 * then call Bramble.ready() once the game is drawn, and Bramble.score(n) when a round ends.
 * Classic script (not a module) so it works inside Bramble's sandboxed frame.
 */
(function () {
  'use strict';
  function send(msg) {
    if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*');
  }
  window.Bramble = {
    ready: function () {
      send({ type: 'bramble:ready' });
    },
    score: function (n) {
      var v = Math.floor(Number(n));
      if (isFinite(v) && v >= 0) send({ type: 'bramble:score', score: v });
    },
  };
})();
