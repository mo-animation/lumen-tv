/* Screens + app shell. Tab screens are built once and kept, so switching tabs is instant.
   Nothing opens on focus/hover: tabs, categories and seasons all need OK / click. */
(function () {
  'use strict';
  var L = window.L, h = L.h, N = L.nav, K = L.K, D = L.data, t = L.t;
  var app = document.getElementById('app');
  var A = L.app = { layers: [], tabs: {}, tab: null, mode: null };
  var main, view, nav, launch, btn = {}, rootScope;
  var MODE = { home: 'vod', movies: 'vod', series: 'vod', library: 'vod', live: 'live' };

  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    if (Math.abs(s - 1) < 0.01) s = 1;
    L.scale = s;
    app.style.transform = s === 1 ? '' : 'scale(' + s + ')';
    app.style.left = Math.max(0, (window.innerWidth - 1920 * s) / 2) + 'px';
    app.style.top = Math.max(0, (window.innerHeight - 1080 * s) / 2) + 'px';
  }
  window.addEventListener('resize', fit); fit();
  var toast = h('div'); toast.id = 'toast'; app.appendChild(toast);
  function noop() { }
  function brand() { return h('div', 'brand', [h('i'), h('span', '', 'lumen')]); }

  function topLayer() { return A.layers[A.layers.length - 1]; }
  function onShow() { if (topLayer() === main && A.mode && A.tabs[A.tab] && A.tabs[A.tab].show) A.tabs[A.tab].show(); }
  A.cover = function (b) { var l = topLayer(); if (l) l.style.display = b ? 'none' : ''; if (!b) onShow(); };
  A.push = function (scr) {
    topLayer().style.display = 'none';
    A.layers.push(scr.el); app.appendChild(scr.el);
    N.push({ root: scr.el, onBack: scr.onBack || A.pop, onKey: scr.onKey });
  };
  A.pop = function () {
    var el = A.layers.pop(); if (el.parentNode) el.parentNode.removeChild(el);
    topLayer().style.display = ''; onShow(); N.pop();
  };
  function mainActive() { return N.top() === rootScope && main.style.display !== 'none'; }

  L.open = function (it, list) {
    if (it.t === 'live') {
      var ls = (list || [it]).filter(function (x) { return x.t === 'live'; }), i = ls.indexOf(it);
      if (i < 0) { ls = [it]; i = 0; }
      L.player.open({ live: true, list: ls, idx: i });
    } else L.detail(it);
  };
  function playVod(it, restart, onClose) {
    var pr = L.prog.get(L.key(it));
    L.player.open({ item: it, start: !restart && pr ? pr.pos : 0, onClose: onClose });
  }

  /* ================= shell + launcher ================= */
  var BUILD = {};
  function shell() {
    main = h('div', 'layer'); main.id = 'main';
    view = h('div', 'layer'); nav = h('div', 'fg'); nav.id = 'nav';
    var tabs = h('div', 'tabs glass'), right = h('div', 'navr');
    function mk(name, cls, label, icon) {
      var b = h('div', cls + ' f', label); if (icon) b.appendChild(L.icon(icon));
      b._act = function () { A.show(name); };
      btn[name] = b; return b;
    }
    [['home', 'home'], ['live', 'live'], ['movies', 'movies'], ['series', 'series'], ['library', 'mylist']].forEach(function (x) { tabs.appendChild(mk(x[0], 'tab', t(x[1]))); });
    right.appendChild(mk('search', 'ibtn', null, 'search')); right.appendChild(mk('settings', 'ibtn', null, 'gear'));
    nav.appendChild(brand()); nav.appendChild(tabs); nav.appendChild(right);

    /* launcher: the first thing you see */
    function big(icon, title, sub, fn) { var c = h('div', 'lcard glass f', [L.icon(icon), h('b', '', title), h('span', '', sub)]); c._act = fn; return c; }
    var cLive = big('tv', t('live'), t('l_live_sub'), function () { A.enter('live', 'live'); });
    var cVod = big('film', t('l_vod'), t('l_vod_sub'), function () { A.enter('vod', 'home'); });
    var bSet = h('div', 'btn f', [L.icon('gear'), h('span', '', t('settings'))]);
    bSet._act = function () { A.enter(A.lastMode || 'vod', 'settings'); };
    launch = h('div', 'layer', [h('div', 'l-brand', brand()), h('div', 'l-title', t('choose')), h('div', 'l-cards fg', [cLive, cVod]), h('div', 'l-foot', bSet)]);
    launch._first = cLive;

    main.appendChild(view); main.appendChild(nav); main.appendChild(launch); app.appendChild(main);
    A.layers = [main];
    var exitT = 0;
    rootScope = {
      root: main, onBack: function () {
        if (!A.mode) {
          if (Date.now() - exitT < 2500) window.close();
          else { exitT = Date.now(); L.toast(t('exit_again')); }
        } else if (!nav.contains(N.cur)) { var s = A.tabs[A.tab]; if (s.back && s.back()) return; N.focus(btn[A.tab]); }
        else A.home();
      }
    };
    N.scopes = [rootScope];
  }
  A.home = function () {
    A.mode = null; view.style.display = 'none'; nav.style.display = 'none'; launch.style.display = '';
    N.focus(N.vis(launch._last) ? launch._last : launch._first);
  };
  A.enter = function (mode, tab) {
    launch._last = N.cur && launch.contains(N.cur) ? N.cur : launch._first;
    A.mode = A.lastMode = mode;
    for (var k in MODE) btn[k].style.display = MODE[k] === mode ? '' : 'none';
    launch.style.display = 'none'; view.style.display = ''; nav.style.display = '';
    A.show(tab, true);
    var s = A.tabs[tab], f = s.first && s.first();
    if (f) { if (f._grid) f._grid.go(f._idx); else N.focus(f); } else N.focus(btn[tab]);
  };
  A.show = function (name, force) {
    if (A.tab === name && !force) return;
    var old = A.tabs[A.tab]; if (old) { old.el.style.display = 'none'; btn[A.tab].classList.remove('on'); }
    var s = A.tabs[name];
    if (!s) { s = A.tabs[name] = BUILD[name](); view.appendChild(s.el); }
    s.el.style.display = ''; A.tab = name; btn[name].classList.add('on');
    if (s.show) s.show();
  };

  /* ================= home (movies & shows) ================= */
  BUILD.home = function () {
    var el = h('div', 'screen home'), vs = h('div', 'vs'), fade = h('div', 'topfade');
    var himg = h('img', 'hero-img'), hpos = h('img', 'hero-poster'), kick = h('div', 'hero-kicker'), ttl = h('div', 'hero-title'), meta = h('div', 'hero-meta'), plot = h('div', 'hero-plot');
    var bPlay = h('div', 'btn f', [L.icon('play'), h('span', '', t('play'))]), bInfo = h('div', 'btn f', t('more_info'));
    var btns = h('div', 'btns fg', [bPlay, bInfo]), dots = h('div', 'dots');
    var hero = h('div', 'hero', [himg, h('div', 'hero-shade'), hpos, h('div', 'hero-info', [kick, ttl, meta, plot, btns]), dots]);
    var rows = h('div'), load = h('div', 'loading', [h('div', 'spin'), h('div', '', t('loading_lib'))]);
    ttl.dir = 'auto'; plot.dir = 'auto';
    vs._mt = 150; vs._mb = 24; vs._onScroll = function (y) { fade.classList.toggle('on', y > 0); };
    vs.appendChild(hero); vs.appendChild(rows); el.appendChild(vs); el.appendChild(fade); el.appendChild(load);
    hero.style.display = 'none';
    var feats = [], fi = 0, built = false;
    himg.onload = function () { himg.style.opacity = 1; hpos.style.opacity = 0; };
    hpos.onload = function () { hpos.style.opacity = 1; };
    himg.onerror = function () { himg.style.opacity = 0; };

    function playLabel(it) { return it.t === 'vod' ? t(L.prog.get(L.key(it)) ? 'resume' : 'play') : t('episodes'); }
    function setHero(i) {
      var it = feats[i]; if (!it) return; fi = i;
      ttl.textContent = it.n; kick.textContent = t(it.t === 'vod' ? 'new_movies' : 'new_series');
      meta.textContent = ''; plot.textContent = '';
      bPlay.lastChild.textContent = playLabel(it);
      for (var d = 0; d < dots.childNodes.length; d++) dots.childNodes[d].className = d === i ? 'on' : '';
      D.info(it).then(function (inf) {
        if (feats[fi] !== it) return;
        meta.textContent = [inf.year, inf.dur, inf.genre, inf.rating ? '★ ' + inf.rating : ''].filter(Boolean).join('  ·  ');
        plot.textContent = inf.plot;
        if (inf.bd) himg.src = inf.bd; else poster(inf.tm && inf.poster);
      }, function () { poster(); });
      function poster(src) { if (feats[fi] !== it) return; himg.style.opacity = 0; src = src || it.i; if (src) hpos.src = src; else hpos.style.opacity = 0; }
    }
    bPlay._act = function () { var it = feats[fi]; if (it.t === 'vod') playVod(it); else L.detail(it); };
    bInfo._act = function () { L.detail(feats[fi]); };
    setInterval(function () {
      if (A.tab !== 'home' || !A.mode || !mainActive() || feats.length < 2 || btns.contains(N.cur) || (vs._y || 0) > 0) return;
      himg.style.opacity = 0; hpos.style.opacity = 0;
      setTimeout(function () { setHero((fi + 1) % feats.length); }, 350);
    }, 10000);

    function first() { return hero.style.display === 'none' ? rows.querySelector('.f') : bPlay; }
    function build() {
      var wasCard = N.cur && rows.contains(N.cur);
      rows.textContent = '';
      var cw = L.prog.list(), fm = L.fav.list(false), f;
      if (cw.length) rows.appendChild(L.row(t('cw'), cw, { act: function (it) { if (it.t === 'vod') playVod(it); else L.detail(it); } }));
      if (fm.length) rows.appendChild(L.row(t('mylist'), fm));
      if ((f = D.full.vod) && f.items.length) rows.appendChild(L.row(t('recent_movies'), f.items.slice(0, 24)));
      if ((f = D.full.series) && f.items.length) rows.appendChild(L.row(t('recent_series'), f.items.slice(0, 24)));
      if (!feats.length) {
        var src = (D.full.vod && D.full.vod.items.length ? D.full.vod.items : (D.full.series ? D.full.series.items : []));
        feats = src.slice(0, 5);
        if (feats.length) { hero.style.display = ''; feats.forEach(function () { dots.appendChild(h('i')); }); setHero(0); }
      }
      built = true; L.dirty = false;
      if (rows.firstChild || feats.length) load.style.display = 'none';
      if (A.tab === 'home' && A.mode && (!N.vis(rootScope.last) || wasCard)) {
        var x = (wasCard && rows.querySelector('.f')) || first();
        rootScope.last = x;
        if (x && mainActive() && !nav.contains(N.cur)) N.focus(x);
      }
    }
    D.all('vod').catch(noop).then(function () { build(); return D.all('series'); }).catch(noop).then(function () {
      build();
      if (!rows.firstChild && !feats.length) { load.firstChild.style.display = 'none'; load.lastChild.textContent = t('lib_fail'); }
    });
    return {
      el: el, first: first,
      show: function () { if (built && L.dirty) build(); if (feats.length) bPlay.lastChild.textContent = playLabel(feats[fi]); }
    };
  };

  /* ================= browse: sidebar + virtual grid ================= */
  function Browse(c) {
    var el = h('div', 'screen'), side = h('div', 'vs side fg'), title = h('div', 'b-title'), count = h('div', 'b-count'), host = h('div', 'b-grid');
    var load = h('div', 'b-load', [h('div', 'spin'), h('div', '', t('loading'))]);
    el.appendChild(h('div', 'side-vp', side)); el.appendChild(title); el.appendChild(count); el.appendChild(host); el.appendChild(load);
    title.dir = 'auto'; side._mt = 60; side._mb = 60;
    var cfg = c.kind === 'wide' ? L.GRID.wide() : L.GRID.poster(6);
    cfg.fill = function (e, it) { L.card.fill(e, it); };
    cfg.act = function (it, i, items) { L.open(it, items); };
    cfg.long = function (it, e) { L.longFav(it, e); };
    var grid = new L.VGrid(host, cfg), tok = 0, sel = null, selEl = null;

    function pick(cat, b) {
      if (sel === cat) return;
      sel = cat; if (selEl) selEl.classList.remove('on'); selEl = b; b.classList.add('on');
      title.textContent = cat.name; count.textContent = '';
      var my = ++tok; grid.set([], ' '); load.style.display = 'block';
      c.load(cat.id).then(function (items) {
        if (my !== tok) return;
        load.style.display = 'none'; grid.set(items, c.empty || t('nothing'));
        count.textContent = items.length ? items.length + t(c.kind === 'wide' ? 'n_channels' : 'n_titles') : '';
      }, function (e) {
        if (my !== tok) return;
        load.style.display = 'none'; sel = null; grid.set([], (e && e.message || t('load_fail')) + t('retry_cat'));
      });
    }
    function add(cat) {
      var b = h('div', 'cat f', cat.name); b.dir = 'auto';
      b._act = function () { pick(cat, b); };
      side.appendChild(b); return b;
    }
    c.sections.forEach(function (s, i) { var b = add(s); if (!i) pick(s, b); });
    if (c.cats) c.cats().then(function (list) { list.forEach(add); }, noop);
    return {
      el: el,
      first: function () { return host._enter() || selEl; },
      back: function () { if (host.contains(N.cur)) { N.focus(selEl); return true; } },
      show: function () {
        if (!c.reload) { grid.refresh(); return; }
        var had = host.contains(N.cur), cat = sel, b = selEl;
        sel = null; if (cat) pick(cat, b);
        if (had) { rootScope.last = b; if (mainActive()) N.focus(b); }
      }
    };
  }
  BUILD.live = function () {
    return Browse({ kind: 'wide', sections: [{ id: null, name: t('all_channels') }, { id: '__fav', name: t('favorites') }], empty: t('hold_ch'),
      cats: function () { return D.cats('live'); }, load: function (id) { return id === '__fav' ? Promise.resolve(L.fav.list(true)) : D.list('live', id); } });
  };
  BUILD.movies = function () {
    return Browse({ sections: [{ id: null, name: t('all_movies') }], cats: function () { return D.cats('vod'); }, load: function (id) { return D.list('vod', id); } });
  };
  BUILD.series = function () {
    return Browse({ sections: [{ id: null, name: t('all_series') }], cats: function () { return D.cats('series'); }, load: function (id) { return D.list('series', id); } });
  };
  BUILD.library = function () {
    var s = Browse({ reload: true, sections: [{ id: 'list', name: t('mylist') }, { id: 'cw', name: t('cw') }], empty: t('hold_any'),
      load: function (id) { return Promise.resolve(id === 'list' ? L.fav.list(false) : L.prog.list()); } });
    var show = s.show, n = 0;
    s.show = function () { if (n++ === 0) return; show(); };
    return s;
  };

  /* ================= search ================= */
  BUILD.search = function () {
    var el = h('div', 'screen'), qEl = h('div', 's-q ph', t('search_ph')), kb = h('div', 'kb fg'), host = h('div', 's-grid'), ttl = h('div', 's-title', t('results'));
    el.appendChild(h('div', 's-panel glass', [qEl, kb])); el.appendChild(ttl); el.appendChild(host);
    qEl.dir = 'auto';
    var cfg = L.GRID.poster(5);
    cfg.fill = function (e, it) { L.card.fill(e, it); };
    cfg.act = function (it, i, items) { L.open(it, items); };
    cfg.long = function (it, e) { L.longFav(it, e); };
    var grid = new L.VGrid(host, cfg), q = '', ar = L.rtl, lastMode = null;
    var EN = 'abcdefghijklmnopqrstuvwxyz0123456789', AR = 'ابتثجحخدذرزسشصضطظعغفقكلمنهويءةىئؤأإآ';
    function norm(s, a) {
      s = s.toLowerCase();
      return a ? s.replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي') : s;
    }
    function types() { return A.mode === 'live' ? ['live'] : ['vod', 'series']; }
    function search() {
      var s = q.trim(), a = /[؀-ۿ]/.test(s); s = norm(s, a);
      if (s.length < 2) { grid.set([], t('type2')); return; }
      var out = [], rest = [];
      types().forEach(function (ty) {
        var f = D.full[ty]; if (!f) return;
        for (var i = 0, l = f.items, p; i < l.length && out.length + rest.length < 400; i++) {
          p = norm(l[i].n, a).indexOf(s);
          if (p === 0) out.push(l[i]); else if (p > 0) rest.push(l[i]);
        }
      });
      grid.set(out.concat(rest).slice(0, 200), t('no_results') + '“' + q.trim() + '”');
    }
    var run = L.debounce(search, 260);
    function upd() { qEl.textContent = q || t('search_ph'); qEl.classList.toggle('ph', !q); run(); }
    function key(label, cls, fn) { var k = h('div', 'key f ' + (cls || ''), label); k._act = fn; kb.appendChild(k); return k; }
    function layout() {
      kb.textContent = '';
      (ar ? AR : EN).split('').forEach(function (ch) { key(ch, '', function () { q += ch; upd(); }); });
      key(t('space'), 'w2', function () { if (q && q.slice(-1) !== ' ') { q += ' '; upd(); } });
      key(t('del'), 'w2', function () { q = q.slice(0, -1); upd(); });
      key(t('clear'), 'w2', function () { q = ''; upd(); });
      key(ar ? 'English' : 'عربي', 'w2', function () { ar = !ar; layout(); N.focus(kb.lastChild); });
    }
    layout(); grid.set([], t('type2'));
    return {
      el: el, first: function () { return kb.firstChild; },
      back: function () { if (host.contains(N.cur)) { N.focus(N.vis(kb._last) ? kb._last : kb.firstChild); return true; } },
      show: function () {
        types().forEach(function (ty) { D.all(ty).then(function () { if (q) run(); }, noop); });
        if (lastMode !== A.mode) { lastMode = A.mode; search(); } else grid.refresh();
      }
    };
  };

  /* ================= updates (over the air, from the GitHub repo) ================= */
  function updUrl(file) {
    var c = window.LUMEN_CFG || {}; if (!c.repo) return null;
    return 'https://raw.githubusercontent.com/' + c.repo + '/' + (c.branch || 'main') + '/update/' + file + '?t=' + Date.now();
  }
  function running() { return (window.LUMEN && window.LUMEN.build) || 0; }
  function checkUpdate(v) {
    var u = updUrl('bundle.json'); if (!u) { v.textContent = t('upd_none'); return; }
    v.textContent = t('checking');
    fetch(u).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (b) {
      if (!b || !b.js || !b.css || !(b.build > running())) { v.textContent = t('uptodate'); return; }
      localStorage.setItem('lm.update', JSON.stringify(b));
      v.textContent = t('installing'); setTimeout(function () { location.reload(); }, 700);
    }).catch(function () { v.textContent = t('upd_fail'); });
  }
  function hintUpdate() {
    var u = updUrl('version.json'); if (!u) return;
    fetch(u).then(function (r) { return r.ok ? r.json() : null; }).then(function (b) { if (b && b.build > running()) L.toast(t('upd_avail')); }).catch(noop);
  }

  /* ================= settings ================= */
  BUILD.settings = function () {
    var el = h('div', 'screen'), list = h('div', 'set-wrap glass fg'), p = D.profile, cfg = window.LUMEN_CFG || {};
    el.appendChild(h('div', 'set-h', [h('div', 'gear glass', L.icon('gear')), h('b', '', t('settings'))])); el.appendChild(h('div', 'set-vp', list));
    function row(label, val, fn) { var v = h('span', '', val || ''), r = h('div', 'srow f', [h('div', '', label), v]); v.dir = 'auto'; r._act = function () { if (fn) fn(v); }; list.appendChild(r); return r; }
    var host = p.url ? p.url.replace(/^https?:\/\//, '').split('/')[0] : '';
    row(t('account'), p.type === 'demo' ? t('demo_lib') : (p.user ? p.user + ' @ ' : '') + host);
    row(t('language'), L.rtl ? 'العربية' : 'English', function () { L.store.set('lang', L.rtl ? 'en' : 'ar'); location.reload(); });
    row(t('appearance'), t(L.store.get('theme', 'light')), function (v) { var n = L.store.get('theme', 'light') === 'dark' ? 'light' : 'dark'; L.setTheme(n); v.textContent = t(n); });
    var inp = null;
    var tm = row(t('tmdb'), t(L.tmdb.key() ? 'tmdb_on' : 'tmdb_off'), function (v) {
      if (cfg.tmdb) return;
      if (!inp) {
        inp = h('input', 'inp f'); inp.type = 'text'; inp.placeholder = t('tmdb_ph'); inp.autocomplete = 'off'; inp.spellcheck = false; inp.value = L.store.get('tmdb', '');
        inp._act = function () { inp.focus(); };
        inp.addEventListener('change', function () {
          var k = inp.value.trim();
          if (!k) { L.store.del('tmdb'); D.forgetInfo(); v.textContent = t('tmdb_off'); return; }
          v.textContent = t('checking');
          L.tmdb.test(k).then(function () { L.store.set('tmdb', k); D.forgetInfo(); v.textContent = t('tmdb_on'); L.toast(t('tmdb_saved')); },
            function () { v.textContent = t('tmdb_off'); L.toast(t('tmdb_bad')); });
        });
        list.insertBefore(inp, tm.nextSibling);
      }
      N.focus(inp); inp.focus();
    });
    row(t('live_fmt'), L.store.get('fmt', 'm3u8') === 'ts' ? 'MPEG-TS' : 'HLS', function (v) {
      var n = L.store.get('fmt', 'm3u8') === 'ts' ? 'm3u8' : 'ts'; L.store.set('fmt', n); v.textContent = n === 'ts' ? 'MPEG-TS' : 'HLS';
    });
    row(t('update'), (window.LUMEN && window.LUMEN.version) || '', checkUpdate);
    row(t('refresh'), t('refresh_sub'), function (v) { v.textContent = t('refreshing'); L.cache.clear().then(function () { location.reload(); }); });
    row(t('clear_hist'), '', function (v) { L.prog.clear(); v.textContent = t('cleared'); });
    row(t('signout'), t('signout_sub'), function () {
      L.store.del('profile'); L.store.del('fav'); L.store.del('prog');
      L.cache.clear().then(function () { location.reload(); });
    });
    return { el: el, first: function () { return list.firstChild; } };
  };

  /* ================= detail ================= */
  L.detail = function (item) {
    var el = h('div', 'layer detail'), bd = h('img', 'd-bd'), shade = h('div', 'd-shade'), poster = h('img', 'd-poster');
    var ttl = h('div', 'd-title', item.n), meta = h('div', 'd-meta'), plot = h('div', 'd-plot'), cast = h('div', 'd-cast'), btns = h('div', 'btns fg'), extra = h('div', 'd-extra');
    ttl.dir = 'auto'; plot.dir = 'auto'; cast.dir = 'auto';
    el.appendChild(bd); el.appendChild(shade); el.appendChild(poster);
    el.appendChild(h('div', 'd-info', [ttl, meta, plot, cast, btns])); el.appendChild(extra);
    bd.onload = function () { bd.style.opacity = 1; shade.style.opacity = 1; poster.style.display = 'none'; };
    poster.onload = function () { poster.style.visibility = 'visible'; };
    var info = null, sIdx = 0, epRow = null, pills = null;

    function B(label, icon, fn) { var b = h('div', 'btn f', [icon ? L.icon(icon) : null, h('span', '', label)]); b._act = fn; btns.appendChild(b); return b; }
    function resumeEp() {
      var pr = L.prog.get(L.key(item)), s = 0, e = 0, start = 0;
      if (pr && pr.ep && info) info.seasons.forEach(function (se, si) { se.eps.forEach(function (ep, ei) { if (String(ep.id) === String(pr.ep.id)) { s = si; e = ei; start = pr.pos; } }); });
      return { s: s, e: e, start: start, has: !!(pr && pr.ep) };
    }
    function playEp(s, e, start) { L.player.open({ item: item, eps: info.seasons[s].eps, epIdx: e, start: start || 0, onClose: refresh }); }
    function buttons() {
      btns.textContent = '';
      var pr = L.prog.get(L.key(item));
      if (item.t === 'vod') {
        if (pr && pr.pos > 30) {
          B(t('resume_from') + L.fmt(pr.pos), 'play', function () { playVod(item, false, refresh); });
          B(t('start_over'), 'back', function () { playVod(item, true, refresh); });
        } else B(t('play'), 'play', function () { playVod(item, true, refresh); });
      } else if (info && info.seasons && info.seasons.length) {
        var r = resumeEp(), ep = info.seasons[r.s].eps[r.e];
        B(t(r.has ? 'resume' : 'play') + ' S' + ep.s + ' · E' + ep.e, 'play', function () { playEp(r.s, r.e, r.start); });
      }
      if (info && info.trailer) B(t('trailer'), 'film', function () { L.trailer(info.trailer); });
      var on = L.fav.has(item);
      B(t(on ? 'in_list' : 'mylist'), on ? 'check' : 'plus', function () { L.fav.toggle(item); buttons(); N.focus(btns.lastChild); });
    }
    function season(i) {
      sIdx = i;
      for (var k = 0; k < pills.childNodes.length; k++) pills.childNodes[k].classList.toggle('on', k === i);
      if (epRow) extra.removeChild(epRow);
      var pr = L.prog.get(L.key(item)), eps = info.seasons[i].eps;
      epRow = L.row('', eps, {
        kind: 'wide', noLong: true,
        fill: function (c, ep) {
          var cur = pr && pr.ep && String(pr.ep.id) === String(ep.id), nm = ep.n || t('episode') + ep.e;
          L.card.fill(c, { t: 'ep', id: ep.id, n: nm, i: ep.img }, { label: ep.e + '. ' + nm, fb: 'E' + ep.e, noStar: true, noProg: true, pct: cur && pr.dur ? pr.pos / pr.dur : 0 });
        },
        act: function (ep, list, idx) { var cur = pr && pr.ep && String(pr.ep.id) === String(ep.id); playEp(i, idx, cur ? pr.pos : 0); }
      });
      extra.appendChild(epRow);
    }
    function refresh() {
      var inRow = epRow && epRow.contains(N.cur);
      var keep = inRow ? Array.prototype.indexOf.call(epRow._hs.childNodes, N.cur) : -1;
      buttons();
      if (pills) { season(sIdx); if (keep >= 0) { N.focus(epRow._hs.childNodes[keep]); return; } }
      N.focus(btns.firstChild);
    }

    buttons();
    A.push({ el: el });
    N.focus(btns.firstChild);
    if (item.i && /^https?:/i.test(item.i)) poster.src = item.i;
    D.info(item).then(function (inf) {
      if (A.layers.indexOf(el) < 0) return;
      info = inf;
      meta.textContent = [inf.year, inf.dur, inf.genre, inf.rating ? '★ ' + inf.rating : ''].filter(Boolean).join('  ·  ');
      plot.textContent = inf.plot || ''; cast.textContent = inf.cast ? t('cast') + inf.cast : '';
      if (inf.poster && (inf.tm || !item.i)) poster.src = inf.poster;
      if (inf.bd) bd.src = inf.bd;
      var onBtns = btns.contains(N.cur);
      buttons(); if (onBtns) N.focus(btns.firstChild);
      if (item.t === 'series') {
        if (!inf.seasons || !inf.seasons.length) { extra.appendChild(h('div', 'row', h('h2', '', t('no_eps')))); return; }
        pills = h('div', 'hs pills fg');
        inf.seasons.forEach(function (se, i) {
          var p = h('div', 'pill f', t('season') + se.s);
          p._act = function () { if (sIdx !== i) season(i); };
          pills.appendChild(p);
        });
        extra.appendChild(h('div', 'rvp', pills));
        var r = resumeEp(); sIdx = r.s; season(r.s);
        pills._last = pills.childNodes[r.s];
      }
    }, function (e) { plot.textContent = (e && e.message) || t('load_fail'); });
  };

  /* ================= setup ================= */
  function setup() {
    var el = h('div', 'layer'), msg = h('div', 'setup-msg');
    function inp(ph) { var i = h('input', 'inp f'); i.placeholder = ph; i.type = 'text'; i.autocomplete = 'off'; i.spellcheck = false; i._act = function () { i.focus(); }; return i; }
    var url = inp(t('s_url')), user = inp(t('s_user')), pass = inp(t('s_pass'));
    var go1 = h('div', 'btn f', t('connect')), demo = h('div', 'btn f', t('demo')), lang = h('div', 'btn f', L.rtl ? 'English' : 'العربية');
    el.appendChild(h('div', 'setup-card glass fg', [brand(), h('h1', '', t('s_title')), h('p', '', t('s_text')), url, user, pass, h('div', 'btns', [go1, demo, lang]), msg]));
    function start(p) {
      msg.textContent = t('connecting');
      D.init(p);
      D.prov.login().then(function () { L.store.set('profile', p); app.removeChild(el); boot(p); },
        function (e) { msg.textContent = (e && e.message) || t('conn_fail'); });
    }
    go1._act = function () {
      var u = url.value.trim(), us = user.value.trim(), pw = pass.value.trim();
      if (!u) { msg.textContent = t('need_url'); return; }
      if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
      var m = u.match(/^(https?:\/\/[^\/?#]+)\/.*[?&]username=([^&]+)&password=([^&]+)/i);
      if (m) start({ type: 'xtream', url: m[1], user: decodeURIComponent(m[2]), pass: decodeURIComponent(m[3]) });
      else if (us && pw) start({ type: 'xtream', url: u.match(/^https?:\/\/[^\/?#]+/i)[0], user: us, pass: pw });
      else start({ type: 'm3u', url: u });
    };
    demo._act = function () { start({ type: 'demo' }); };
    lang._act = function () { L.store.set('lang', L.rtl ? 'en' : 'ar'); location.reload(); };
    app.appendChild(el); A.layers = [el];
    N.scopes = [{ root: el, onBack: function () { } }];
    N.focus(url);
  }

  function boot(p) {
    D.init(p); shell(); A.home();
    setTimeout(hintUpdate, 4000);
  }
  var prof = L.store.get('profile', null);
  if (prof) boot(prof); else setup();
  try { localStorage.removeItem('lm.booting'); } catch (e) { }
})();
