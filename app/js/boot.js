/* Loader. Runs the newest code available: an over-the-air update saved on the TV, or the built-in copy.
   If an update fails to start, it is thrown away and the built-in copy runs instead. */
(function () {
  'use strict';
  var base = window.LUMEN_BUILD || { build: 0, version: '0' }, up = null;
  try { up = JSON.parse(localStorage.getItem('lm.update') || 'null'); } catch (e) { up = null; }
  try {
    if (up && (!(up.build > base.build) || localStorage.getItem('lm.booting') === '1')) { localStorage.removeItem('lm.update'); up = null; }
    localStorage.removeItem('lm.booting');
  } catch (e) { up = null; }

  function builtin() {
    window.LUMEN = base;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/app.css'; document.head.appendChild(l);
    ['core', 'api', 'nav', 'ui', 'player', 'screens'].forEach(function (n) {
      var s = document.createElement('script'); s.src = 'js/' + n + '.js'; s.async = false; document.body.appendChild(s);
    });
  }
  if (!up) { builtin(); return; }
  try {
    localStorage.setItem('lm.booting', '1');
    window.LUMEN = { build: up.build, version: up.version };
    var st = document.createElement('style'); st.textContent = up.css; document.head.appendChild(st);
    (0, eval)(up.js);
  } catch (e) {
    try { localStorage.removeItem('lm.update'); localStorage.removeItem('lm.booting'); } catch (x) { }
    location.reload();
  }
})();
