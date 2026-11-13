/* Remote-control focus engine: geometric D-pad navigation, scopes, long-press, Magic Remote pointer. */
(function () {
  'use strict';
  var L = window.L, K = L.K;
  var N = L.nav = { cur: null, scopes: [] };

  function top() { return N.scopes[N.scopes.length - 1]; }
  function vis(el) { return el && document.body.contains(el) && el.offsetParent !== null; }
  N.top = top; N.vis = vis;

  N.push = function (sc) {
    if (N.cur) N.cur.classList.remove('focus');
    N.cur = null; N.scopes.push(sc);
  };
  N.pop = function () {
    N.scopes.pop();
    if (N.cur) { N.cur.classList.remove('focus'); N.cur = null; }
    N.restore();
  };
  N.restore = function () {
    var t = top(); if (!t) return;
    var el = vis(t.last) ? t.last : t.root.querySelector('.f');
    if (el) N.focus(el);
  };

  N.focus = function (el, quiet) {
    if (!el) return;
    var t = top(), ae = document.activeElement;
    if (ae && ae !== el && ae.tagName === 'INPUT') ae.blur();
    if (N.cur && N.cur !== el) N.cur.classList.remove('focus');
    N.cur = el; el.classList.add('focus');
    if (t) t.last = el;
    var g = el.closest('.fg'); if (g) g._last = el;
    if (el._grid) el._grid.idx = el._idx;
    if (!quiet) N.reveal(el);
    if (el._onFocus) el._onFocus();
  };

  /* keep the focused element inside its horizontal track / vertical page */
  N.reveal = function (el) {
    if (el._grid) return;
    var hs = el.closest('.hs');
    if (hs) {
      var vw = hs.parentNode.clientWidth - 160, w = el.offsetWidth, cx = hs._x || 0;
      var x = L.rtl ? hs.clientWidth - el.offsetLeft - w : el.offsetLeft;
      if (x - cx < 0) cx = x; else if (x + w - cx > vw) cx = x + w - vw;
      if (cx < 0) cx = 0;
      if (cx !== (hs._x || 0)) { hs._x = cx; hs.style.transform = 'translate3d(' + (L.rtl ? cx : -cx) + 'px,0,0)'; }
    }
    var vs = el.closest('.vs');
    if (vs) {
      var tgt = el.closest('.row,.hero') || el;
      var a = tgt.getBoundingClientRect(), b = vs.getBoundingClientRect();
      var topY = (a.top - b.top) / L.scale, hh = a.height / L.scale, vh = vs.parentNode.clientHeight;
      var mt = vs._mt == null ? 40 : vs._mt, mb = vs._mb == null ? 40 : vs._mb, y = vs._y || 0;
      if (tgt.classList.contains('hero')) y = 0;
      else if (topY - y < mt) y = topY - mt;
      else if (topY + hh - y > vh - mb) y = topY + hh - vh + mb;
      var max = Math.max(0, vs.offsetHeight - vh);
      if (y > max) y = max; if (y < 0) y = 0;
      if (y !== (vs._y || 0)) { vs._y = y; vs.style.transform = 'translate3d(0,' + (-y) + 'px,0)'; if (vs._onScroll) vs._onScroll(y); }
    }
  };

  function find(cur, dir, root) {
    var a = cur.getBoundingClientRect(), acx = a.left + a.width / 2, acy = a.top + a.height / 2;
    var els = root.querySelectorAll('.f'), best = null, bs = 1e12;
    for (var i = 0; i < els.length; i++) {
      var el = els[i]; if (el === cur || el.offsetParent === null) continue;
      var r = el.getBoundingClientRect(); if (!r.width) continue;
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2, prim, orth, off;
      if (dir === K.LEFT || dir === K.RIGHT) {
        if (dir === K.RIGHT ? cx <= acx + 1 : cx >= acx - 1) continue;
        prim = dir === K.RIGHT ? r.left - a.right : a.left - r.right;
        orth = r.bottom < a.top ? a.top - r.bottom : (r.top > a.bottom ? r.top - a.bottom : 0);
        off = Math.abs(cy - acy);
        if (orth > a.height) continue; /* sideways moves stay in their own band */
      } else {
        if (dir === K.DOWN ? cy <= acy + 1 : cy >= acy - 1) continue;
        prim = dir === K.DOWN ? r.top - a.bottom : a.top - r.bottom;
        orth = r.right < a.left ? a.left - r.right : (r.left > a.right ? r.left - a.right : 0);
        off = Math.abs(cx - acx);
      }
      if (prim < 0) prim = 0;
      var s = prim + orth * 5 + off * 0.05;
      if (s < bs) { bs = s; best = el; }
    }
    return best;
  }

  N.move = function (dir) {
    var t = top(); if (!t) return false;
    var cur = N.cur;
    if (!vis(cur)) { N.restore(); return true; }
    if (cur._grid && cur._grid.move(dir)) return true;
    var best = find(cur, dir, t.root);
    if (!best) return false;
    var g = best.closest('.fg');
    if (g && g !== cur.closest('.fg')) {
      if (g._enter) best = g._enter() || best;
      else if (vis(g._last)) best = g._last;
    }
    if (best._grid) best._grid.go(best._idx); else N.focus(best);
    return true;
  };

  N.act = function (el) { if (el && el._act) el._act(); };

  var okEl = null, okTimer = null, okLong = false;
  document.addEventListener('keydown', function (e) {
    var k = e.keyCode, t = top(); if (!t) return;
    var ae = document.activeElement, typing = ae && ae.tagName === 'INPUT';
    if (k === 27 || (k === 8 && !typing)) k = K.BACK;
    if (typing) {
      if (k === K.OK || k === K.DOWN || k === K.UP || k === K.BACK) {
        e.preventDefault(); ae.blur();
        if (k === K.UP) N.move(K.UP); else if (k !== K.BACK) N.move(K.DOWN);
      }
      return;
    }
    if (t.onKey && t.onKey(k, e)) { e.preventDefault(); return; }
    if (k >= 37 && k <= 40) { e.preventDefault(); N.move(k); return; }
    if (k === K.OK) {
      e.preventDefault(); if (e.repeat) return;
      var c = N.cur; if (!vis(c)) return;
      if (c._long) {
        okEl = c; okLong = false; clearTimeout(okTimer);
        okTimer = setTimeout(function () { okLong = true; if (N.cur === okEl) okEl._long(); }, 550);
      } else N.act(c);
      return;
    }
    if (k === K.BACK) { e.preventDefault(); if (t.onBack) t.onBack(); }
  });
  document.addEventListener('keyup', function (e) {
    if (e.keyCode !== K.OK || !okEl) return;
    clearTimeout(okTimer);
    var el = okEl; okEl = null;
    if (!okLong && N.cur === el) N.act(el);
  });

  /* Magic Remote pointer / mouse */
  var lastHover = null;
  function pick(e) {
    var t = top(); if (!t || !e.target.closest) return null;
    var el = e.target.closest('.f');
    return el && t.root.contains(el) ? el : null;
  }
  document.addEventListener('mousemove', function (e) {
    var el = pick(e);
    if (el && el !== lastHover && el !== N.cur) N.focus(el, true);
    lastHover = el;
  });
  document.addEventListener('click', function (e) {
    var t = top(); if (!t) return;
    if (t.onClick) { t.onClick(e); return; }
    var el = pick(e); if (el) { N.focus(el, true); N.act(el); }
  });
  var wheelT = 0;
  document.addEventListener('wheel', function (e) {
    var now = Date.now(); if (now - wheelT < 90) return; wheelT = now;
    var t = top(); if (t && t.onKey && t.onKey(e.deltaY > 0 ? K.DOWN : K.UP, e)) return;
    N.move(e.deltaY > 0 ? K.DOWN : K.UP);
  }, { passive: true });
})();
