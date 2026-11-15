/* Full-screen player. Uses the TV's native <video> pipeline (HLS / TS / MP4 / MKV on webOS).
   open({live:true, list, idx}) | open({item, start}) | open({item, eps, epIdx, start}) */
(function () {
  'use strict';
  var L = window.L, h = L.h, N = L.nav, K = L.K, D = L.data;
  var P = L.player = { on: false };
  var el, v, hud, title, sub, bar, tCur, tDur, hint, center, msg, bot, row, btns = [], sel = -1;
  var upn, upnTitle, upnFill, upnT, upnOn = false, upnOff = false, CD = 5000;
  var o, hudT, seekT, zapT, pend = null, seekN = 0, lastSave = 0, tries = 0, fmt, watch, lastT = 0, stall = 0, epgTok = 0;

  function build() {
    el = h('div', 'layer'); el.id = 'player';
    title = h('div', 'hud-title'); sub = h('div', 'hud-sub'); title.dir = 'auto'; sub.dir = 'auto';
    bar = h('i'); tCur = h('span'); tDur = h('span'); hint = h('div', 'hud-hint');
    row = h('div', 'hud-btns');
    bot = h('div', 'hud-bot', [h('div', 'hud-bar', bar), h('div', 'hud-time', [tCur, row, tDur]), hint]);
    hud = h('div', 'hud', [h('div', 'hud-top', [title, sub]), bot]);
    msg = h('div'); center = h('div', 'p-center', [h('div', 'spin'), msg]);
    /* "Next episode" card: appears when the credits start, counts down 5 s, then plays the next episode */
    upnTitle = h('div', 'upn-t'); upnTitle.dir = 'auto'; upnFill = h('i');
    upn = h('div', 'upn', [h('div', 'upn-l'), upnTitle, h('div', 'upn-b', [upnFill, h('span', '', L.t('next_ep'))])]);
    upn.firstChild.textContent = L.t('up_next');
    el.appendChild(hud); el.appendChild(upn); el.appendChild(center);
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
    hint.textContent = L.t(o.live ? 'ch_hint' : o.eps ? 'ep_hint' : 'vod_hint');
    bot.style.visibility = 'visible';
    bar.parentNode.style.visibility = tCur.parentNode.style.visibility = o.live ? 'hidden' : 'visible';
    pend = null; lastSave = 0; lastT = 0; stall = 0;
    hideUpNext(); upnOff = false; buildRow();
    busy(true); mkVideo();
    v.src = D.url(it, ep, fmt);
    var pr = v.play(); if (pr && pr.catch) pr.catch(function () { });
    showHud();
    if (o.live) {
      var tok = ++epgTok;
      D.epg(it).then(function (e) { if (tok === epgTok && P.on && e.length) sub.textContent = L.t('now') + e[0] + (e[1] ? '   \u00b7   ' + L.t('next') + e[1] : ''); });
    }
  }

  /* ---------- player buttons: ▼ opens the row, ◀ ▶ choose, OK presses, ▲ back to the timeline ---------- */
  function hasNext() { return !!(o.eps && o.epIdx + 1 < o.eps.length); }
  function hasPrev() { return !!(o.eps && o.epIdx > 0); }
  function buildRow() {
    row.textContent = ''; btns = []; sel = -1;
    if (o.live) return;
    if (!o.eps) return;
    var PREV = '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9.5 12z"/></svg>';
    var NEXT = '<svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l10.5-7z"/></svg>';
    function B(html, fn, ok) { var b = h('div', 'pbtn' + (ok ? '' : ' off')); b.innerHTML = html; b._fn = fn; b._ok = ok; row.appendChild(b); btns.push(b); }
    B(PREV + '<span>' + L.t('prev_ep') + '</span>', function () { goEp(-1); }, hasPrev());
    B('<span>' + L.t('next_ep') + '</span>' + NEXT, function () { learn(); goEp(1); }, hasNext());
    paintRow();
  }
  function paintRow() { for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('focus', i === sel); }
  function rowMove(d) {
    var i = sel;
    do { i += d; } while (i >= 0 && i < btns.length && !btns[i]._ok);
    if (i >= 0 && i < btns.length) { sel = i; paintRow(); }
  }
  function rowOpen() {
    if (!btns.length) return;
    if (sel < 0) { sel = 0; while (sel < btns.length && !btns[sel]._ok) sel++; if (hasNext()) sel = btns.length - 1; }
    paintRow(); showHud(true);
  }
  function rowClose() { sel = -1; paintRow(); showHud(); }
  function goEp(d) {
    var n = o.epIdx + d; if (!o.eps || n < 0 || n >= o.eps.length) return;
    save(); o.epIdx = n; o.start = 0;
    if (L.prog && o.item) L.prog.set(o.item, 0, 0, o.eps[n]);
    load();
  }

  /* ---------- credits ----------
     IPTV servers don't say where the credits start, so Lumen estimates: the last 4% of the episode,
     between 25 and 90 seconds. When you press Next episode yourself near the end, Lumen remembers that
     point for the show and uses it for the next episodes. */
  function credKey() { return 'cred.' + L.key(o.item); }
  function creditsAt(d) {
    var learned = L.store.get(credKey());
    if (learned && learned > 10 && learned < 400) return d - learned;
    return d - Math.max(25, Math.min(90, d * 0.04));
  }
  function learn() {
    if (!v || !isFinite(v.duration) || upnOn) return;
    var left = v.duration - v.currentTime;
    if (left > 10 && left < 400) L.store.set(credKey(), Math.round(left));
  }
  function showUpNext() {
    if (upnOn) return;
    upnOn = true;
    var ep = o.eps[o.epIdx + 1];
    upnTitle.textContent = L.t('season') + ep.s + ' \u00b7 ' + L.t('episode') + ep.e + (ep.n ? ' \u00b7 ' + ep.n : '');
    upn.classList.add('on');
    hud.classList.remove('on'); sel = -1; paintRow();
    upnFill.style.transition = 'none'; upnFill.style.transform = 'scaleX(0)';
    void upnFill.offsetWidth;
    upnFill.style.transition = 'transform ' + CD + 'ms linear'; upnFill.style.transform = 'scaleX(1)';
    clearTimeout(upnT); upnT = setTimeout(function () { if (upnOn && P.on) playNext(); }, CD);
  }
  function hideUpNext() {
    clearTimeout(upnT);
    if (!upnOn) return;
    upnOn = false; upn.classList.remove('on');
    upnFill.style.transition = 'none'; upnFill.style.transform = 'scaleX(0)';
  }
  function playNext() { hideUpNext(); goEp(1); }

  function tick() {
    if (o.live || !v) return;
    var t = v.currentTime, d = v.duration;
    if (hasNext() && isFinite(d) && d > 300 && pend == null) {
      if (t >= creditsAt(d) && t < d - 1) { if (!upnOff) showUpNext(); }
      else if (upnOn) hideUpNext();
    }
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
    if (hasNext()) playNext(); else P.close();
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
    if (!stay) hudT = setTimeout(function () { if (v && (!v.paused || o.live) && sel < 0) hud.classList.remove('on'); }, 4500);
    else if (sel >= 0) hudT = setTimeout(function () { if (v && !v.paused) { sel = -1; paintRow(); hud.classList.remove('on'); } }, 8000);
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
    if (upnOn) {
      if (k === K.OK || k === K.PP || k === K.PLAY) { playNext(); return true; }
      if (k === K.BACK) { hideUpNext(); upnOff = true; return true; } /* watch the credits */
    }
    if (sel >= 0) {
      switch (k) {
        case K.LEFT: rowMove(-1); showHud(true); return true;
        case K.RIGHT: rowMove(1); showHud(true); return true;
        case K.OK: var b = btns[sel]; if (b && b._ok) b._fn(); if (P.on && sel >= 0) showHud(true); return true;
        case K.UP: case K.BACK: rowClose(); return true;
        case K.DOWN: return true;
      }
    }
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
      case K.UP: o.live ? zap(1) : subs(); break;
      case K.DOWN: o.live ? zap(-1) : o.eps ? rowOpen() : audio(); break;
      case K.CHUP: o.eps ? goEp(1) : zap(1); break;
      case K.CHDN: o.eps ? goEp(-1) : zap(-1); break;
      default: return false;
    }
    return true;
  }

  P.close = function () {
    if (!P.on) return;
    save(); P.on = false; epgTok++;
    clearInterval(watch); clearTimeout(hudT); clearTimeout(seekT); clearTimeout(zapT); hideUpNext(); sel = -1;
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

/* Trailer window: plays the YouTube trailer in a small window in the middle of the screen.
   YouTube refuses embeds from file:// pages, so the player is docs/trailer.html on GitHub Pages.
   If it can't play here (offline, embedding blocked), the trailer opens in the TV's YouTube app instead. */
(function () {
  'use strict';
  var L = window.L, K = L.K, N = L.nav, h = L.h;
  var HOST = 'https://' + (window.LUMEN_CFG.repo || '').split('/')[0] + '.github.io';
  var PAGE = HOST + '/' + (window.LUMEN_CFG.repo || '').split('/')[1] + '/trailer.html?v=';
  var el, frame, hint, timer, id, open = false;

  function send(m, s) { try { frame.contentWindow.postMessage({ lumen: m, s: s }, HOST); } catch (e) { } }
  function close() {
    if (!open) return;
    open = false; clearTimeout(timer);
    frame.src = 'about:blank';
    el.parentNode.removeChild(el);
    N.pop();
  }
  function fallback() { var v = id; close(); L.trailerApp(v); }

  window.addEventListener('message', function (e) {
    if (!open || e.origin !== HOST || !e.data) return;
    var m = e.data.lumen;
    if (m === 'ready') clearTimeout(timer);
    else if (m === 'error') fallback();
    else if (m === 'ended') close();
    else if (m === 'muted') hint.textContent = L.t('tr_sound');
    else if (m === 'playing') hint.textContent = L.t('tr_hint');
  });

  L.trailer = function (vid) {
    if (open) return;
    if (!el) {
      el = h('div', 'trailer');
      var win = h('div', 'trwin glass');
      frame = h('iframe');
      frame.setAttribute('allow', 'autoplay; encrypted-media');
      frame.setAttribute('tabindex', '-1');
      /* a cover over the video keeps clicks and key presses in Lumen (the remote's Back must reach us) */
      win.appendChild(frame); win.appendChild(h('div', 'trcover'));
      hint = h('div', 'trhint');
      el.appendChild(win); el.appendChild(hint);
    }
    id = vid; open = true;
    hint.textContent = L.t('tr_hint');
    document.getElementById('app').appendChild(el);
    frame.src = PAGE + encodeURIComponent(vid);
    N.push({
      root: el, onBack: close,
      onClick: function () { send('toggle'); },
      onKey: function (k, e) {
        if (k === K.BACK) return false;
        if (e.repeat && k === K.OK) return true;
        if (k === K.OK || k === K.PP || k === K.PLAY || k === K.PAUSE) send('toggle');
        else if (k === K.RIGHT || k === K.FF) send('seek', 10);
        else if (k === K.LEFT || k === K.RW) send('seek', -10);
        else if (k === K.STOP) close();
        return true;
      }
    });
    timer = setTimeout(fallback, 12000); /* the player never answered: no internet or page unreachable */
  };
})();
