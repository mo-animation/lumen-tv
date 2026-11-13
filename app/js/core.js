/* Lumen core: helpers, storage, cache. Plain ES2017 — runs on webOS 22 (Chromium 87). */
(function () {
  'use strict';
  var L = window.L = {};

  L.K = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 461, PLAY: 415, PAUSE: 19, PP: 10252, STOP: 413, FF: 417, RW: 412, CHUP: 33, CHDN: 34 };
  L.scale = 1;

  L.h = function (tag, cls, kids) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (kids != null) {
      if (typeof kids === 'string') e.textContent = kids;
      else if (kids.nodeType) e.appendChild(kids);
      else for (var i = 0; i < kids.length; i++) if (kids[i]) e.appendChild(kids[i]);
    }
    return e;
  };

  L.icons = {
    search: '<svg viewBox="0 0 24 24"><path d="M10 2a8 8 0 105 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><path d="M19.4 13a7.5 7.5 0 000-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 00-1.7-1L15 3h-4l-.4 2.9a7.6 7.6 0 00-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 000 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1L11 21h4l.4-2.9c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5L19.4 13zM13 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M6 3l15 9-15 9z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M9 16.2l-4.2-4.2-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
    tv: '<svg viewBox="0 0 24 24"><path d="M3 4h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1zm1 2v10h16V6H4zm4 13h8v2H8z"/></svg>',
    film: '<svg viewBox="0 0 24 24"><path d="M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zm1 2v2h2V6H5zm0 4v4h2v-4H5zm0 6v2h2v-2H5zm12-10v2h2V6h-2zm0 4v4h2v-4h-2zm0 6v2h2v-2h-2zM9 6v12h6V6H9z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M12 5V1L6 6l6 5V7a6 6 0 11-6 6H4a8 8 0 108-8z"/></svg>'
  };
  L.icon = function (name) { var s = document.createElement('span'); s.innerHTML = L.icons[name]; return s.firstChild; };

  L.hue = function (s) { var x = 0; s = String(s); for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return Math.abs(x) % 360; };
  L.fmt = function (s) {
    if (!isFinite(s) || s < 0) s = 0; s = Math.floor(s);
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x;
  };
  L.key = function (it) { return it.t + ':' + it.id; };
  L.debounce = function (fn, ms) { var t; return function () { var a = arguments, me = this; clearTimeout(t); t = setTimeout(function () { fn.apply(me, a); }, ms); }; };

  var toastT;
  L.toast = function (msg) {
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on'); clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('on'); }, 2400);
  };

  /* ---- localStorage (small things only) ---- */
  var S = L.store = {
    get: function (k, d) { try { var v = localStorage.getItem('lm.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('lm.' + k, JSON.stringify(v)); } catch (e) { } },
    del: function (k) { try { localStorage.removeItem('lm.' + k); } catch (e) { } }
  };

  function slim(it) { return { t: it.t, id: it.id, n: it.n, i: it.i, c: it.c, e: it.e, u: it.u, eps: it.t === 'series' ? it.eps : undefined, tmid: it.tmid }; }

  var favs = null;
  L.fav = {
    all: function () { return favs || (favs = S.get('fav', {})); },
    has: function (it) { return !!L.fav.all()[L.key(it)]; },
    toggle: function (it) {
      var m = L.fav.all(), k = L.key(it), on = !m[k];
      if (on) { m[k] = slim(it); m[k].ts = Date.now(); } else delete m[k];
      S.set('fav', m); L.dirty = true; return on;
    },
    list: function (live) {
      var m = L.fav.all(), out = [];
      for (var k in m) if ((m[k].t === 'live') === !!live) out.push(m[k]);
      return out.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    }
  };

  var prog = null;
  L.prog = {
    all: function () { return prog || (prog = S.get('prog', {})); },
    get: function (k) { return L.prog.all()[k]; },
    set: function (it, pos, dur, ep) {
      var m = L.prog.all(), k = L.key(it);
      m[k] = { pos: pos, dur: dur, ts: Date.now(), item: slim(it), ep: ep ? { id: ep.id, s: ep.s, e: ep.e } : undefined };
      var keys = Object.keys(m);
      if (keys.length > 40) { keys.sort(function (a, b) { return m[a].ts - m[b].ts; }); delete m[keys[0]]; }
      S.set('prog', m); L.dirty = true;
    },
    del: function (k) { var m = L.prog.all(); if (m[k]) { delete m[k]; S.set('prog', m); L.dirty = true; } },
    list: function () {
      var m = L.prog.all(), out = [];
      for (var k in m) out.push(m[k]);
      out.sort(function (a, b) { return b.ts - a.ts; });
      return out.map(function (p) { return p.item; });
    },
    clear: function () { prog = {}; S.set('prog', prog); L.dirty = true; }
  };

  /* ---- IndexedDB cache for big lists (instant relaunch) ---- */
  var dbp;
  function db() {
    if (!dbp) dbp = new Promise(function (res, rej) {
      try {
        var r = indexedDB.open('lumen', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      } catch (e) { rej(e); }
    });
    return dbp;
  }
  L.cache = {
    get: function (k) {
      return db().then(function (d) {
        return new Promise(function (res) {
          var q = d.transaction('kv').objectStore('kv').get(k);
          q.onsuccess = function () { res(q.result || null); };
          q.onerror = function () { res(null); };
        });
      }).catch(function () { return null; });
    },
    set: function (k, v) {
      return db().then(function (d) { try { d.transaction('kv', 'readwrite').objectStore('kv').put({ v: v, ts: Date.now() }, k); } catch (e) { } }).catch(function () { });
    },
    clear: function () {
      return db().then(function (d) {
        return new Promise(function (res) { var tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').clear(); tx.oncomplete = res; tx.onerror = res; });
      }).catch(function () { });
    }
  };

  /* ---- language, theme, platform ---- */
  var app = document.getElementById('app');
  L.lang = S.get('lang', 'en'); L.rtl = L.lang === 'ar';
  app.classList.toggle('rtl', L.rtl);
  document.documentElement.lang = L.lang;
  L.setTheme = function (t) { S.set('theme', t); app.classList.toggle('dark', t === 'dark'); };
  app.classList.toggle('dark', S.get('theme', 'light') === 'dark');

  var T = {
    en: {
      home: 'Home', live: 'Live TV', movies: 'Movies', series: 'TV Shows', mylist: 'My List', settings: 'Settings',
      choose: 'What would you like to watch?', l_live_sub: 'Channels, news and sports', l_vod: 'Movies & TV Shows', l_vod_sub: 'Your on-demand library',
      play: 'Play', resume: 'Resume', episodes: 'Episodes', more_info: 'More Info', new_movies: 'New in Movies', new_series: 'New in TV Shows',
      loading_lib: 'Loading your library…', lib_fail: 'Could not load your library. Check the connection in Settings.',
      tm_trending: 'Trending This Week', tm_popular: 'Popular', tm_top_rated: 'Top Rated', tm_now_playing: 'Now Playing', tm_on_the_air: 'On the Air', tm_none: 'None of these titles are on your server', tm_loading: 'Matching TMDB with your server…',
      cw: 'Continue Watching', recent_movies: 'Recently Added Movies', recent_series: 'Recently Added TV Shows',
      all_channels: 'All Channels', favorites: '★ Favorites', all_movies: 'All Movies', all_series: 'All TV Shows',
      nothing: 'Nothing here yet', hold_ch: 'No channels here. Hold OK on a channel to add it to Favorites.', hold_any: 'Nothing here yet. Hold OK on any title to add it.',
      n_channels: ' channels', n_titles: ' titles', retry_cat: ' — select the category again to retry', load_fail: 'Could not load', loading: 'Loading…',
      search_ph: 'Search', results: 'Results', type2: 'Type at least 2 letters', no_results: 'No results for ', space: 'Space', del: '⌫ Delete', clear: 'Clear',
      account: 'Account', demo_lib: 'Demo library', language: 'Language', appearance: 'Appearance', light: 'Light', dark: 'Dark',
      tmdb: 'TMDB details and trailers', tmdb_on: 'Connected', tmdb_off: 'Not set — press OK to enter API key', tmdb_ph: 'TMDB API key (v3)', tmdb_saved: 'TMDB key saved', tmdb_bad: 'TMDB rejected this key',
      live_fmt: 'Live stream format', update: 'Check for updates', checking: 'Checking…', uptodate: 'Up to date', installing: 'Installing update…', upd_fail: 'Could not check', upd_none: 'No update source set', upd_avail: 'Update available — open Settings',
      refresh: 'Refresh library', refresh_sub: 'Reload channels and titles', refreshing: 'Refreshing…', clear_hist: 'Clear watch history', cleared: 'Cleared',
      signout: 'Sign out', signout_sub: 'Switch provider', version: 'Version',
      resume_from: 'Resume from ', start_over: 'Start Over', in_list: 'In My List', trailer: 'Trailer', season: 'Season ', episode: 'Episode ', no_eps: 'No episodes available', cast: 'Cast: ',
      added: 'Added to My List', removed: 'Removed from My List', exit_again: 'Press Back again to exit', no_yt: 'Could not open YouTube', tr_sound: 'Press OK for sound', tr_hint: 'OK pause · ◀ ▶ 10s · Back close',
      s_title: 'Connect your provider', s_text: 'Enter your Xtream Codes server with username and password, or paste an M3U playlist link and leave the other two fields empty.',
      s_url: 'Server address or M3U playlist link', s_user: 'Username (Xtream Codes)', s_pass: 'Password (Xtream Codes)', connect: 'Connect', demo: 'Try the demo', connecting: 'Connecting…', need_url: 'Enter the server address first', conn_fail: 'Could not connect',
      now: 'Now: ', next: 'Next: ', ch_hint: '▲▼ Change channel', vod_hint: '◀ ▶ Seek   ·   OK Play / Pause   ·   ▲ Audio   ▼ Subtitles',
      no_audio: 'No other audio tracks', audio: 'Audio: ', no_subs: 'No subtitles in this video', subs_off: 'Subtitles off', subs: 'Subtitles: ', ch_unavail: 'This channel is not available right now', vid_fail: 'This video cannot be played'
    },
    ar: {
      home: 'الرئيسية', live: 'بث مباشر', movies: 'أفلام', series: 'مسلسلات', mylist: 'قائمتي', settings: 'الإعدادات',
      choose: 'تحب تشوف إيه؟', l_live_sub: 'قنوات، أخبار ورياضة', l_vod: 'أفلام ومسلسلات', l_vod_sub: 'مكتبتك حسب الطلب',
      play: 'تشغيل', resume: 'متابعة', episodes: 'الحلقات', more_info: 'التفاصيل', new_movies: 'جديد الأفلام', new_series: 'جديد المسلسلات',
      loading_lib: 'جاري تحميل مكتبتك…', lib_fail: 'تعذّر تحميل المكتبة. راجع الاتصال من الإعدادات.',
      tm_trending: 'الأكثر رواجاً هذا الأسبوع', tm_popular: 'الأشهر', tm_top_rated: 'الأعلى تقييماً', tm_now_playing: 'يُعرض الآن', tm_on_the_air: 'يُعرض حالياً', tm_none: 'لا يوجد من هذه العناوين على السيرفر', tm_loading: 'جاري مطابقة TMDB مع السيرفر…',
      cw: 'متابعة المشاهدة', recent_movies: 'أفلام مضافة حديثاً', recent_series: 'مسلسلات مضافة حديثاً',
      all_channels: 'كل القنوات', favorites: '★ المفضلة', all_movies: 'كل الأفلام', all_series: 'كل المسلسلات',
      nothing: 'لا يوجد شيء هنا', hold_ch: 'لا توجد قنوات. اضغط مطوّلاً على OK لإضافة قناة للمفضلة.', hold_any: 'لا يوجد شيء بعد. اضغط مطوّلاً على OK للإضافة.',
      n_channels: ' قناة', n_titles: ' عنوان', retry_cat: ' — اختر القسم مرة أخرى', load_fail: 'تعذّر التحميل', loading: 'جاري التحميل…',
      search_ph: 'بحث', results: 'النتائج', type2: 'اكتب حرفين على الأقل', no_results: 'لا نتائج لـ ', space: 'مسافة', del: '⌫ حذف', clear: 'مسح',
      account: 'الحساب', demo_lib: 'مكتبة تجريبية', language: 'اللغة', appearance: 'المظهر', light: 'فاتح', dark: 'داكن',
      tmdb: 'بيانات وتريلرات TMDB', tmdb_on: 'متصل', tmdb_off: 'غير مفعّل — اضغط OK لإدخال المفتاح', tmdb_ph: 'TMDB API key (v3)', tmdb_saved: 'تم حفظ مفتاح TMDB', tmdb_bad: 'TMDB رفض المفتاح',
      live_fmt: 'صيغة البث المباشر', update: 'البحث عن تحديثات', checking: 'جاري البحث…', uptodate: 'أحدث إصدار', installing: 'جاري تثبيت التحديث…', upd_fail: 'تعذّر البحث', upd_none: 'مصدر التحديث غير محدد', upd_avail: 'يوجد تحديث — افتح الإعدادات',
      refresh: 'تحديث المكتبة', refresh_sub: 'إعادة تحميل القنوات والعناوين', refreshing: 'جاري التحديث…', clear_hist: 'مسح سجل المشاهدة', cleared: 'تم المسح',
      signout: 'تسجيل الخروج', signout_sub: 'تغيير المزوّد', version: 'الإصدار',
      resume_from: 'متابعة من ', start_over: 'من البداية', in_list: 'في قائمتي', trailer: 'تريلر', season: 'الموسم ', episode: 'الحلقة ', no_eps: 'لا توجد حلقات', cast: 'بطولة: ',
      added: 'أُضيف إلى قائمتي', removed: 'أُزيل من قائمتي', exit_again: 'اضغط رجوع مرة أخرى للخروج', no_yt: 'تعذّر فتح يوتيوب', tr_sound: 'اضغط OK لتشغيل الصوت', tr_hint: 'OK إيقاف مؤقت · ◀ ▶ ١٠ ثوانٍ · رجوع للإغلاق',
      s_title: 'اتصل بمزوّد الخدمة', s_text: 'أدخل سيرفر Xtream Codes مع اسم المستخدم وكلمة المرور، أو الصق رابط M3U واترك الحقلين الآخرين فارغين.',
      s_url: 'Server address or M3U playlist link', s_user: 'Username (Xtream Codes)', s_pass: 'Password (Xtream Codes)', connect: 'اتصال', demo: 'جرّب النسخة التجريبية', connecting: 'جاري الاتصال…', need_url: 'أدخل عنوان السيرفر أولاً', conn_fail: 'تعذّر الاتصال',
      now: 'الآن: ', next: 'التالي: ', ch_hint: '▲▼ تغيير القناة', vod_hint: '◀ ▶ تقديم   ·   OK تشغيل / إيقاف   ·   ▲ الصوت   ▼ الترجمة',
      no_audio: 'لا توجد مسارات صوت أخرى', audio: 'الصوت: ', no_subs: 'لا توجد ترجمة', subs_off: 'الترجمة متوقفة', subs: 'الترجمة: ', ch_unavail: 'القناة غير متاحة حالياً', vid_fail: 'تعذّر تشغيل الفيديو'
    }
  };
  L.t = function (k) { var d = T[L.lang] || T.en; return d[k] != null ? d[k] : (T.en[k] != null ? T.en[k] : k); };

  /* webOS system bus (no extra library needed) */
  L.luna = function (uri, params, cb) {
    var B = window.WebOSServiceBridge || window.PalmServiceBridge;
    if (!B) { if (cb) cb(null); return false; }
    try {
      var b = new B();
      b.onservicecallback = function (m) { var r = null; try { r = JSON.parse(m); } catch (e) { } if (cb) cb(r); };
      b.call(uri, JSON.stringify(params || {}));
      return true;
    } catch (e) { if (cb) cb(null); return false; }
  };
  /* ---- platform: LG webOS, Samsung Tizen, Android TV (WebView shell), or a plain browser ---- */
  L.platform = window.LumenNative ? 'android' : window.tizen ? 'tizen' : (window.PalmSystem || window.webOS || window.PalmServiceBridge) ? 'webos' : 'web';
  if (L.platform === 'tizen') {
    try {
      ['MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop', 'MediaFastForward', 'MediaRewind', 'ChannelUp', 'ChannelDown']
        .forEach(function (n) { try { tizen.tvinputdevice.registerKey(n); } catch (e) { } });
    } catch (e) { }
  }
  /* turn each platform's remote codes into the app's own codes */
  L.mapKey = function (k) {
    switch (k) {
      case 10009: case 27: return K.BACK;              /* Samsung Return, Esc */
      case 427: return K.CHUP; case 428: return K.CHDN; /* Samsung channel keys */
      case 10252: case 179: return K.PP;                /* play/pause toggle (Samsung, Android) */
      default: return k;
    }
  };
  L.exit = function () {
    try {
      if (L.platform === 'android') return window.LumenNative.exit();
      if (L.platform === 'tizen') return tizen.application.getCurrentApplication().exit();
    } catch (e) { }
    window.close();
  };

  /* fallback when a trailer can't play inside Lumen: open it in the TV's YouTube app; Back returns here */
  L.trailerApp = function (id) {
    var web = 'https://www.youtube.com/watch?v=' + id;
    if (L.platform === 'android') { try { window.LumenNative.openUrl(web); } catch (e) { L.toast(L.t('no_yt')); } return; }
    if (L.platform === 'tizen') {
      try {
        var ctl = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/view', web);
        tizen.application.launchAppControl(ctl, '111299001912', null, function () {
          try { tizen.application.launchAppControl(ctl, null, null, function () { L.toast(L.t('no_yt')); }); } catch (e) { L.toast(L.t('no_yt')); }
        });
      } catch (e) { L.toast(L.t('no_yt')); }
      return;
    }
    var ok = L.luna('luna://com.webos.applicationManager/launch', { id: 'youtube.leanback.v4', params: { contentTarget: 'https://www.youtube.com/tv?v=' + id } },
      function (r) { if (!r || r.returnValue === false) L.toast(L.t('no_yt')); });
    if (!ok) { try { window.open(web, '_blank'); } catch (e) { } }
  };
})();
