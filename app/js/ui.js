/* UI building blocks: cards, virtualized grid, horizontal rows. */
(function () {
  'use strict';
  var L = window.L, h = L.h, N = L.nav, K = L.K;

  L.card = {
    make: function (kind) {
      var el = h('div', 'card f ' + (kind || '')), art = h('div', 'art'), fb = h('div', 'fb');
      var img = document.createElement('img'); img.decoding = 'async';
      img.onload = function () { img.style.visibility = 'visible'; };
      img.onerror = function () { img.style.visibility = 'hidden'; };
      var bar = h('div', 'pbar', h('i')), star = h('div', 'star', '★'), lab = h('div', 'lab');
      fb.dir = 'auto'; lab.dir = 'auto';
      art.appendChild(fb); art.appendChild(img); art.appendChild(bar); art.appendChild(star);
      el.appendChild(art); el.appendChild(lab);
      el._art = art; el._fb = fb; el._img = img; el._bar = bar; el._star = star; el._lab = lab;
      return el;
    },
    fill: function (el, it, o) {
      o = o || {};
      el._item = it;
      var live = it.t === 'live', img = el._img, src = o.img != null ? o.img : it.i;
      el.classList.toggle('logo', live);
      el._fb.textContent = o.fb || it.n; el._lab.textContent = o.label || it.n;
      if (live) el._art.style.background = '';
      else { var hu = L.hue(it.n); el._art.style.background = 'linear-gradient(160deg,hsl(' + hu + ',32%,48%),hsl(' + ((hu + 40) % 360) + ',38%,26%))'; }
      if (src && /^https?:/i.test(src)) {
        if (img.getAttribute('src') !== src) { img.style.visibility = 'hidden'; img.src = src; }
        else if (img.complete && img.naturalWidth) img.style.visibility = 'visible';
      } else { img.style.visibility = 'hidden'; img.removeAttribute('src'); }
      var p = o.pct != null ? o.pct : null;
      if (p == null && !live && !o.noProg) { var pr = L.prog.get(L.key(it)); if (pr && pr.dur) p = pr.pos / pr.dur; }
      if (p != null && p > 0) { el._bar.style.display = 'block'; el._bar.firstChild.style.width = Math.round(Math.min(1, p) * 100) + '%'; }
      else el._bar.style.display = 'none';
      el._star.style.display = !o.noStar && L.fav.has(it) ? 'block' : 'none';
    }
  };

  /* Virtualized grid: only the visible rows exist in the DOM, cards are recycled.
     Handles 50k+ items with ~30 nodes. */
  function VGrid(host, o) {
    var g = this;
    g.host = host; g.o = o; g.items = []; g.idx = 0; g.y = 0; g.map = {}; g.pool = [];
    host.classList.add('vg'); host.classList.add('fg');
    g.c = h('div', 'vg-c'); g.empty = h('div', 'vg-empty');
    host.appendChild(g.c); host.appendChild(g.empty);
    host._enter = function () { return g.items.length ? g.el(g.idx) : null; };
  }
  VGrid.prototype.set = function (items, emptyMsg) {
    var g = this;
    g.items = items || []; g.idx = 0; g.y = 0;
    for (var k in g.map) { g.map[k].style.display = 'none'; g.map[k].classList.remove('focus'); g.pool.push(g.map[k]); }
    g.map = {};
    g.c.style.transform = 'translate3d(0,0,0)';
    g.empty.textContent = g.items.length ? '' : (emptyMsg || L.t('nothing'));
    g.draw();
  };
  VGrid.prototype.draw = function () {
    var g = this, o = g.o, n = g.items.length, rowH = o.h + o.gy, vh = g.host.clientHeight || 880;
    var r0 = Math.max(0, Math.floor(g.y / rowH) - 1), r1 = Math.floor((g.y + vh) / rowH) + 1;
    var a = r0 * o.cols, b = Math.min(n, (r1 + 1) * o.cols), k, i, el;
    for (k in g.map) if (+k < a || +k >= b) { el = g.map[k]; el.style.display = 'none'; g.pool.push(el); delete g.map[k]; }
    for (i = a; i < b; i++) {
      if (g.map[i]) continue;
      el = g.pool.pop();
      if (!el) el = g.mk();
      el._idx = i;
      el.style[L.rtl ? 'right' : 'left'] = (20 + (i % o.cols) * (o.w + o.gx)) + 'px';
      el.style.top = (18 + Math.floor(i / o.cols) * rowH) + 'px';
      el.style.display = '';
      o.fill(el, g.items[i]);
      g.map[i] = el;
    }
  };
  VGrid.prototype.mk = function () {
    var g = this, o = g.o, el = L.card.make(o.kind);
    el.style.width = o.w + 'px'; el._grid = g;
    el._act = function () { o.act(g.items[el._idx], el._idx, g.items); };
    if (o.long) el._long = function () { o.long(g.items[el._idx], el); };
    g.c.appendChild(el);
    return el;
  };
  VGrid.prototype.el = function (i) { if (!this.map[i]) this.draw(); return this.map[i]; };
  VGrid.prototype.go = function (i) {
    var g = this, o = g.o, rowH = o.h + o.gy, vh = g.host.clientHeight || 880;
    var rows = Math.ceil(g.items.length / o.cols), total = rows * rowH + 36;
    var y = Math.min(Math.floor(i / o.cols) * rowH, Math.max(0, total - vh));
    g.idx = i;
    if (y !== g.y) { g.y = y; g.c.style.transform = 'translate3d(0,' + (-y) + 'px,0)'; }
    g.draw();
    N.focus(g.map[i], true);
  };
  VGrid.prototype.move = function (dir) {
    var g = this, c = g.o.cols, n = g.items.length, i = g.idx, ni;
    if (L.rtl) dir = dir === K.LEFT ? K.RIGHT : dir === K.RIGHT ? K.LEFT : dir;
    if (dir === K.LEFT) { if (i % c === 0) return false; ni = i - 1; }
    else if (dir === K.RIGHT) { if (i % c === c - 1 || i + 1 >= n) return true; ni = i + 1; }
    else if (dir === K.UP) { if (i < c) return false; ni = i - c; }
    else { ni = i + c; if (ni >= n) { if (Math.floor((n - 1) / c) > Math.floor(i / c)) ni = n - 1; else return true; } }
    g.go(ni);
    return true;
  };
  VGrid.prototype.refresh = function () { for (var k in this.map) this.o.fill(this.map[k], this.items[k]); };
  L.VGrid = VGrid;

  L.GRID = {
    poster: function (cols) { return { kind: '', cols: cols, w: 212, h: 360, gx: cols === 6 ? 28 : 35, gy: 22 }; },
    wide: function () { return { kind: 'wide', cols: 5, w: 260, h: 188, gx: 30, gy: 26 }; }
  };

  /* long-press OK: channels toggle Favorites; movies and shows open the card menu */
  L.longFav = function (it, el, refill, ctx, changed) {
    if (it && it.t !== 'live' && el) { L.cardMenu(it, el, ctx, function (big) { (refill || L.card.fill)(el, it); if (changed) changed(big); }); return; }
    var on = L.fav.toggle(it);
    L.toast(L.t(on ? 'added' : 'removed'));
    if (el) (refill || L.card.fill)(el, it);
  };

  /* ---------- glass menu beside a card ---------- */
  var menuOpen = false;
  /* Apple-style: the screen dims, the held card lifts slightly above the dim, the menu springs out beside it.
     Only opacity/transform animate (no blur: it stutters on TV chips). */
  L.menu = function (anchor, title, entries) {
    if (menuOpen) return;
    var N = L.nav, app = document.getElementById('app');
    var shade = h('div', 'cm-shade'), panel = h('div', 'cmenu glass'), ov = h('div', 'cmenu-ov', [shade]);
    if (title) { var tl = h('div', 'cm-title', title); tl.dir = 'auto'; panel.appendChild(tl); }
    entries.forEach(function (e) {
      if (e.sep) { panel.appendChild(h('div', 'cm-sep')); return; }
      var lab = h('span', '', e.label); lab.dir = 'auto';
      var it = h('div', 'cm-item f' + (e.on ? ' on' : ''), [L.icon(e.icon || 'plus'), lab]);
      it._act = function () { close(); e.fn(); };
      panel.appendChild(it);
    });
    var ar = app.getBoundingClientRect(), r = anchor.getBoundingClientRect(), sc = L.scale || 1;
    var x0 = (r.left - ar.left) / sc, x1 = (r.right - ar.left) / sc, y0 = (r.top - ar.top) / sc, vw = (r.right - r.left) / sc, vh = (r.bottom - r.top) / sc;

    /* a copy of the card sits above the dim, at exactly the same spot, then grows a little */
    var lift = anchor.cloneNode(true), w0 = anchor.offsetWidth || vw, h0 = anchor.offsetHeight || vh, s0 = vw / w0;
    lift.classList.remove('f'); lift.classList.add('focus', 'cm-lift');
    lift.style.left = Math.round(x0 + (vw - w0) / 2) + 'px'; lift.style.top = Math.round(y0 + (vh - h0) / 2) + 'px';
    lift.style.width = w0 + 'px'; lift.style.transform = 'scale(' + s0 + ')';
    ov.appendChild(lift); ov.appendChild(panel);

    function close() {
      if (!menuOpen) return; menuOpen = false;
      ov.classList.remove('on'); lift.style.transform = 'scale(' + s0 + ')';
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 220);
      N.pop();
    }
    menuOpen = true;
    app.appendChild(ov);
    /* beside the card: right side, or left when there's no room (mirrored in Arabic) */
    var w = panel.offsetWidth, hgt = panel.offsetHeight, gap = 40;
    var right = x1 + gap + w <= 1890, left = x0 - gap - w >= 30;
    var onLeft = L.rtl ? left : !right;
    var x = onLeft ? x0 - gap - w : x1 + gap;
    var y = Math.max(40, Math.min(1080 - hgt - 40, y0));
    panel.style.left = Math.round(x) + 'px'; panel.style.top = Math.round(y) + 'px';
    panel.style.transformOrigin = (onLeft ? '100% ' : '0 ') + Math.max(0, Math.min(hgt, y0 + vh / 2 - y)) + 'px';
    N.push({ root: panel, onBack: close });
    N.focus(panel.querySelector('.f'));
    void ov.offsetWidth; /* start the animation from the first frame */
    ov.classList.add('on'); lift.style.transform = 'scale(' + (s0 * 1.07) + ')';
    return close;
  };

  /* name a new list */
  L.ask = function (title, ph, ok) {
    var N = L.nav, app = document.getElementById('app');
    var inp = h('input', 'inp f'); inp.placeholder = ph; inp.type = 'text'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.dir = 'auto';
    inp._act = function () { inp.focus(); };
    var go = h('div', 'btn f', L.t('m_create')), no = h('div', 'btn f', L.t('m_cancel'));
    var box = h('div', 'cask glass fg', [h('div', 'cm-title', title), inp, h('div', 'btns', [go, no])]), ov = h('div', 'cmenu-ov', [h('div', 'cm-shade'), box]);
    function close() { ov.classList.remove('on'); setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 220); N.pop(); }
    go._act = function () { var v = inp.value.trim(); if (!v) { N.focus(inp); inp.focus(); return; } close(); ok(v); };
    no._act = close;
    inp.addEventListener('keydown', function (e) { if (e.keyCode === 13) { e.preventDefault(); go._act(); } });
    app.appendChild(ov); void ov.offsetWidth; ov.classList.add('on');
    N.push({ root: box, onBack: close });
    N.focus(inp); setTimeout(function () { inp.focus(); }, 50);
  };

  /* the menu for a movie / show / episode card. ctx: 'cw' (Continue Watching row) or {ep, play} for episodes */
  L.cardMenu = function (it, el, ctx, after) {
    var t = L.t, E = [];
    after = after || function () { };
    if (ctx && ctx.ep) {
      E.push({ label: t('m_from_start'), icon: 'back', fn: function () { ctx.play(0); } });
      L.menu(el, ctx.title || '', E); return;
    }
    var fav = L.fav.has(it);
    E.push({ label: t(fav ? 'm_rm_fav' : 'm_add_fav'), icon: fav ? 'check' : 'star', on: fav, fn: function () { L.fav.toggle(it); L.toast(t(fav ? 'removed' : 'added')); after(); } });
    L.lists.all().slice(0, 3).forEach(function (l) {
      var on = L.lists.has(l.id, it);
      E.push({ label: (on ? t('m_in') : t('m_add_to')) + l.name, icon: on ? 'check' : 'list', on: on, fn: function () {
        var now = L.lists.toggle(l.id, it); L.toast(t(now ? 'm_added_to' : 'm_removed_from') + l.name); after();
      } });
    });
    E.push({ label: t('m_new_list'), icon: 'plus', fn: function () {
      L.ask(t('m_new_list').replace('…', ''), t('m_list_name'), function (name) {
        var l = L.lists.create(name); L.lists.toggle(l.id, it); L.toast(t('m_created') + name); after();
      });
    } });
    if (ctx === 'cw') {
      E.push({ sep: 1 });
      E.push({ label: t('m_rm_cw'), icon: 'close', fn: function () { L.prog.del(L.key(it)); L.toast(t('m_rm_cw_done')); after(true); } });
    }
    L.menu(el, it.n, E);
  };

  /* horizontal row of cards (home / detail) */
  L.row = function (title, items, o) {
    o = o || {};
    var hs = h('div', 'hs fg'), row = h('div', 'row', [title ? h('h2', '', title) : null, h('div', 'rvp', hs)]);
    items.forEach(function (it, i) {
      var el = L.card.make(o.kind || (it.t === 'live' ? 'wide' : ''));
      (o.fill || L.card.fill)(el, it, o.opt);
      el._act = function () { (o.act || L.open)(it, items, i); };
      if (!o.noLong) el._long = function () { L.longFav(it, el, function () { (o.fill || L.card.fill)(el, it, o.opt); }, o.ctx, o.changed); };
      hs.appendChild(el);
    });
    row._hs = hs;
    return row;
  };
})();
