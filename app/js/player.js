/* Full-screen player. Uses the TV's native <video> pipeline (HLS / TS / MP4 / MKV on webOS).
   open({live:true, list, idx}) | open({item, start}) | open({item, eps, epIdx, start}) */
(function () {
  'use strict';
  var L = window.L, h = L.h, N = L.nav, K = L.K, D = L.data;
  var P = L.player = { on: false };
  var el, v, hud, title, sub, bar, tCur, tDur, hint, center, msg, bot;
  var o, hudT, seekT, zapT, pend = null, seekN = 0, lastSave = 0, tries = 0, fmt, watch, lastT = 0, stall = 0, epgTok = 0;

  function build() {
    el = h('div', 'layer'); el.id = 'player';
    title = h('div', 'hud-title'); sub = h('div', 'hud-sub'); title.dir = 'auto'; sub.dir = 'auto';
    bar = h('i'); tCur = h('span'); tDur = h('span'); hint = h('div', 'hud-hint');
    bot = h('div', 'hud-bot', [h('div', 'hud-bar', bar), h('div', 'hud-time', [tCur, tDur]), hint]);
    hud = h('div', 'hud', [h('div', 'hud-top', [title, sub]), bot]);
    msg = h('div'); center = h('div', 'p-center', [h('div', 'spin'), msg]);
    el.appendChild(hud); el.appendChild(center);
  }
  function mkVideo() {
    if (v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { } el.removeChild(v); }
    v = document.createElement('video'); v.autoplay = true;
    el.insertBefore(v, hud);
    v.addEventListener('loadedmetadata', function () { if (o && !o.live && o.start > 5 && isFinite(v.duration) && o.start < v.duration - 10) v.currentTime = o.start; });
    v.addEventListener('playing', function () { busy(false); tries = 0; stall = 0; });
    v.addEventListener('waiting', function () { busy(true); });
    v.addEventListener('timeupdate', tick);
    v.addEventListener('ended', ended);
    v.addEventListener('error', failed);
  }
  function busy(b, text) { center.classList.toggle('busy', !!b); msg.textContent = text || ''; }
  function cur() { return o.live ? o.list[o.idx] : o.item; }

  P.open = function (opts) {
    if (!el) build();
    o = opts; P.on = true;
    fmt = L.store.get('fmt', 'm3u8');
    L.app.cover(true);
    document.getElementById('app').appendChild(el);
    N.push({ root: el, onKey: key, onBack: P.close, onClick: function () { o.live ? showHud() : toggle(); } });
    load();
    clearInterval(watch);
    watch = setInterval(watchdog, 4000);
  };

  function load() {
    var it = cur(), ep = o.eps ? o.eps[o.epIdx] : null;
    title.textContent = it.n;
    sub.textContent = ep ? L.t('season') + ep.s + ' \u00b7 ' + L.t('episode') + ep.e + (ep.n ? ' \u00b7 ' + ep.n : '') : '';
    hint.textContent = L.t(o.live ? 'ch_hint' : 'vod_hint');
    bot.style.visibility = 'visible';
    bar.parentNode.style.visibility = tCur.parentNode.style.visibility = o.live ? 'hidden' : 'visible';
    pend = null; lastSave = 0; lastT = 0; stall = 0;
    busy(true); mkVideo();
    v.src = D.url(it, ep, fmt);
    var pr = v.play(); if (pr && pr.catch) pr.catch(function () { });
    showHud();
    if (o.live) {
      var tok = ++epgTok;
      D.epg(it).then(function (e) { if (tok === epgTok && P.on && e.length) sub.textContent = L.t('now') + e[0] + (e[1] ? '   \u00b7   ' + L.t('next') + e[1] : ''); });
    }
  }

  function tick() {
    if (o.live || !v) return;
    var t = v.currentTime, d = v.duration;
    if (hud.classList.contains('on') && pend == null) paint(t, d);
    if (t - lastSave > 10 || t < lastSave) { lastSave = t; save(); }
  }
  function paint(t, d) {
    bar.style.transform = 'scaleX(' + (d ? Math.min(1, t / d) : 0) + ')';
    tCur.textContent = L.fmt(t); tDur.textContent = isFinite(d) ? L.fmt(d) : '';
  }
  function save() {
    if (!o || o.live || !v || !isFinite(v.duration) || v.duration < 60) return;
    var t = v.currentTime, d = v.duration, ep = o.eps ? o.eps[o.epIdx] : null;
    if (t < 20) return;
    if (t > d * 0.95) {
      if (ep && o.epIdx + 1 < o.eps.length) L.prog.set(o.item, 0, d, o.eps[o.epIdx + 1]);
      else L.prog.del(L.key(o.item));
    } else L.prog.set(o.item, t, d, ep);
  }
  function ended() {
    if (o.live) { retry(); return; }
    save();
    if (o.eps && o.epIdx + 1 < o.eps.length) { o.epIdx++; o.start = 0; load(); } else P.close();
  }
  function failed() {
    if (!P.on) return;
    if (o.live && D.profile.type === 'xtream' && tries === 0) { tries++; fmt = fmt === 'ts' ? 'm3u8' : 'ts'; reload(); return; }
    if (o.live && tries < 3) { tries++; setTimeout(function () { if (P.on) reload(); }, 1500); return; }
    busy(false, L.t(o.live ? 'ch_unavail' : 'vid_fail'));
    showHud(true);
  }
  function retry() { if (tries < 3) { tries++; reload(); } else failed(); }
  function reload() {
    var keep = (!o.live && v && v.currentTime > 5) ? v.currentTime : o.start;
    o.start = keep; busy(true); mkVideo();
    v.src = D.url(cur(), o.eps ? o.eps[o.epIdx] : null, fmt);
    var pr = v.play(); if (pr && pr.catch) pr.catch(function () { });
  }
  /* live streams freeze silently on bad networks: reconnect when time stops moving */
  function watchdog() {
    if (!P.on || !o.live || !v || v.paused || msg.textContent) return;
    if (v.currentTime === lastT) { if (++stall >= 3) { stall = 0; retry(); } } else { stall = 0; lastT = v.currentTime; }
  }

  function showHud(stay) {
    hud.classList.add('on'); clearTimeout(hudT);
    if (!o.live && v) paint(pend != null ? pend : v.currentTime, v.duration);
    if (!stay) hudT = setTimeout(function () { if (v && (!v.paused || o.live)) hud.classList.remove('on'); }, 4500);
  }
  function toggle() {
    if (!v) return;
    if (v.paused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () { }); showHud(); }
    else { v.pause(); save(); showHud(true); }
  }
  /* seeks are batched: hold the key, the bar moves, one real seek fires when you stop */
  function seek(dir, big) {
    if (o.live || !v || !isFinite(v.duration)) return;
    seekN++;
    var step = big ? 60 : (seekN > 14 ? 60 : seekN > 5 ? 30 : 10);
    pend = Math.max(0, Math.min(v.duration - 3, (pend != null ? pend : v.currentTime) + dir * step));
    showHud(true); paint(pend, v.duration);
    clearTimeout(seekT);
    seekT = setTimeout(function () { if (v && pend != null) { v.currentTime = pend; } pend = null; seekN = 0; showHud(); }, 550);
  }
  function zap(d) {
    if (!o.live || o.list.length < 2) return;
    o.idx = (o.idx + d + o.list.length) % o.list.length;
    var it = cur(); title.textContent = it.n; sub.textContent = ''; tries = 0;
    busy(true); showHud(true);
    if (v) { try { v.pause(); } catch (e) { } }
    clearTimeout(zapT); zapT = setTimeout(load, 350);
  }
  function audio() {
    var a = v && v.audioTracks, i, c = 0;
    if (!a || a.length < 2) { L.toast(L.t('no_audio')); return; }
    for (i = 0; i < a.length; i++) if (a[i].enabled) c = i;
    c = (c + 1) % a.length;
    for (i = 0; i < a.length; i++) a[i].enabled = i === c;
    L.toast(L.t('audio') + (a[c].label || a[c].language || 'Track ' + (c + 1)));
  }
  function subs() {
    var s = v && v.textTracks, i, c = -1;
    if (!s || !s.length) { L.toast(L.t('no_subs')); return; }
    for (i = 0; i < s.length; i++) if (s[i].mode === 'showing') c = i;
    c = c + 1 >= s.length ? -1 : c + 1;
    for (i = 0; i < s.length; i++) s[i].mode = i === c ? 'showing' : 'hidden';
    L.toast(c < 0 ? L.t('subs_off') : L.t('subs') + (s[c].label || s[c].language || 'Track ' + (c + 1)));
  }

  function key(k) {
    switch (k) {
      case K.BACK: case K.STOP: P.close(); break;
      case K.OK: if (o.live) showHud(); else toggle(); break;
      case K.PLAY: if (v && v.paused) toggle(); else showHud(); break;
      case K.PAUSE: if (v && !v.paused && !o.live) toggle(); break;
      case K.PP: if (o.live) showHud(); else toggle(); break;
      case K.LEFT: o.live ? showHud() : seek(-1); break;
      case K.RIGHT: o.live ? showHud() : seek(1); break;
      case K.RW: seek(-1, true); break;
      case K.FF: seek(1, true); break;
      case K.UP: o.live ? zap(1) : audio(); break;
      case K.DOWN: o.live ? zap(-1) : subs(); break;
      case K.CHUP: zap(1); break;
      case K.CHDN: zap(-1); break;
      default: return false;
    }
    return true;
  }

  P.close = function () {
    if (!P.on) return;
    save(); P.on = false; epgTok++;
    clearInterval(watch); clearTimeout(hudT); clearTimeout(seekT); clearTimeout(zapT);
    if (v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { } el.removeChild(v); v = null; }
    hud.classList.remove('on'); busy(false);
    if (el.parentNode) el.parentNode.removeChild(el);
    var cb = o.onClose; o = null;
    L.app.cover(false);
    N.pop();
    if (cb) cb();
  };

  document.addEventListener('visibilitychange', function () {
    if (!P.on || !v) return;
    if (document.hidden) { if (!o.live) { v.pause(); save(); } else P.close(); }
  });
})();
