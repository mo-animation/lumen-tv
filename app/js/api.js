/* Data layer: Xtream Codes API, M3U playlists, and a demo provider.
   Items are kept tiny: {t:'live'|'vod'|'series', id, n:name, i:image, c:category, a:added, e:ext, u:url} */
(function () {
  'use strict';
  var L = window.L;
  var enc = encodeURIComponent;

  function req(url, asText, ms) {
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, ms || 30000);
    return fetch(url, { signal: c.signal }).then(function (r) {
      if (!r.ok) throw new Error('Server error (HTTP ' + r.status + ')');
      return asText ? r.text() : r.json();
    }).then(function (v) { clearTimeout(t); return v; }, function (e) {
      clearTimeout(t);
      if (e.name === 'AbortError') throw new Error('Server timed out');
      if (e.name === 'TypeError') throw new Error('Cannot reach server');
      if (e.name === 'SyntaxError') throw new Error('Unexpected reply from server');
      throw e;
    });
  }
  function arr(v) { return Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.keys(v).map(function (k) { return v[k]; }) : []); }
  function b64(s) { try { return decodeURIComponent(escape(atob(s))); } catch (e) { return s || ''; } }

  /* ---------------- Xtream Codes ---------------- */
  function Xtream(p) {
    this.base = p.url; this.u = p.user; this.p = p.pass;
    this.api = p.url + '/player_api.php?username=' + enc(p.user) + '&password=' + enc(p.pass);
  }
  Xtream.prototype = {
    login: function () {
      return req(this.api, false, 20000).then(function (d) {
        if (!d || !d.user_info || String(d.user_info.auth) === '0') throw new Error('Wrong username or password');
        if (d.user_info.status && d.user_info.status !== 'Active') throw new Error('Account is ' + d.user_info.status);
        return d.user_info;
      });
    },
    cats: function (t) {
      var a = { live: 'get_live_categories', vod: 'get_vod_categories', series: 'get_series_categories' }[t];
      return req(this.api + '&action=' + a).then(function (d) {
        return arr(d).map(function (c) { return { id: String(c.category_id), name: c.category_name || '' }; });
      });
    },
    list: function (t, cat) {
      var a = { live: 'get_live_streams', vod: 'get_vod_streams', series: 'get_series' }[t];
      return req(this.api + '&action=' + a + (cat ? '&category_id=' + enc(cat) : ''), false, 90000).then(function (d) {
        d = arr(d); var out = new Array(d.length), s;
        for (var i = 0; i < d.length; i++) {
          s = d[i];
          if (t === 'live') out[i] = { t: t, id: s.stream_id, n: s.name || '', i: s.stream_icon || '', c: String(s.category_id) };
          else if (t === 'vod') out[i] = { t: t, id: s.stream_id, n: s.name || '', i: s.stream_icon || '', c: String(s.category_id), a: +s.added || 0, e: s.container_extension || 'mp4' };
          else out[i] = { t: t, id: s.series_id, n: s.name || '', i: s.cover || '', c: String(s.category_id), a: +s.last_modified || 0 };
        }
        return out;
      });
    },
    info: function (it) {
      if (it.t === 'vod') return req(this.api + '&action=get_vod_info&vod_id=' + enc(it.id)).then(function (d) {
        var o = meta(d && d.info);
        if (d && d.movie_data && d.movie_data.container_extension) it.e = d.movie_data.container_extension;
        return o;
      });
      return req(this.api + '&action=get_series_info&series_id=' + enc(it.id)).then(function (d) {
        var o = meta(d && d.info), eps = (d && d.episodes) || {};
        o.seasons = [];
        Object.keys(eps).sort(function (a, b) { return a - b; }).forEach(function (k) {
          var list = arr(eps[k]); if (!list.length) return;
          o.seasons.push({
            s: +list[0].season || +k || 1,
            eps: list.map(function (e, i) {
              var inf = e.info && !Array.isArray(e.info) ? e.info : {};
              return { id: e.id, s: +e.season || +k || 1, e: +e.episode_num || i + 1, n: e.title || '', ext: e.container_extension || 'mp4', img: inf.movie_image || '' };
            })
          });
        });
        return o;
      });
    },
    url: function (it, ep, fmt) {
      var b = this.base + '/', cr = '/' + enc(this.u) + '/' + enc(this.p) + '/';
      if (ep) return b + 'series' + cr + ep.id + '.' + ep.ext;
      if (it.t === 'live') return b + 'live' + cr + it.id + '.' + (fmt || 'm3u8');
      return b + 'movie' + cr + it.id + '.' + (it.e || 'mp4');
    },
    epg: function (it) {
      return req(this.api + '&action=get_short_epg&stream_id=' + enc(it.id) + '&limit=2', false, 8000).then(function (d) {
        return arr(d && d.epg_listings).map(function (e) { return b64(e.title); });
      });
    }
  };
  function meta(i) {
    i = i && !Array.isArray(i) ? i : {};
    var bd = Array.isArray(i.backdrop_path) ? i.backdrop_path[0] : i.backdrop_path;
    var dur = i.duration || '';
    return {
      plot: i.plot || i.description || '', bd: bd || '', poster: i.movie_image || i.cover_big || i.cover || '',
      year: String(i.releasedate || i.releaseDate || i.release_date || '').slice(0, 4),
      dur: dur, genre: i.genre || '', cast: i.cast || '', rating: i.rating && +i.rating ? String(Math.round(+i.rating * 10) / 10) : '',
      tmdb: i.tmdb_id || i.tmdb || '', trailer: ytId(i.youtube_trailer)
    };
  }

  function ytId(v) {
    v = String(v || '').trim(); if (!v) return '';
    var m = v.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); if (m) return m[1];
    return /^[\w-]{11}$/.test(v) ? v : '';
  }

  /* ---------------- TMDB enrichment (optional) ---------------- */
  var TM = L.tmdb = {};
  TM.key = function () { return (window.LUMEN_CFG && window.LUMEN_CFG.tmdb) || L.store.get('tmdb', ''); };
  TM.clean = function (name) {
    var y = (name.match(/[(\[\s](19\d\d|20\d\d)[)\]]?\s*$/) || name.match(/\((19\d\d|20\d\d)\)/) || [])[1] || '';
    var q = name.replace(/^\s*[A-Za-z]{2,4}\s*[|:]\s*|^\s*[A-Z]{2,4}\s+-\s+/, '')
      .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
      .replace(/\b(4k|uhd|fhd|hd|sd|1080p|720p|2160p|hevc|h265|x264|x265|multi[- ]?subs?|dubbed|subbed|bluray|web-?dl)\b/gi, ' ')
      .replace(/\s(19\d\d|20\d\d)\s*$/, ' ').replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim();
    return { q: q || name, y: y };
  };
  function tm(path, q) { return req('https://api.themoviedb.org/3' + path + '?api_key=' + enc(TM.key()) + (q || ''), false, 8000); }
  TM.test = function (key) { return req('https://api.themoviedb.org/3/configuration?api_key=' + enc(key), false, 8000); };
  TM.fetch = function (it, inf) {
    var type = it.t === 'vod' ? 'movie' : 'tv', lang = L.lang === 'ar' ? 'ar' : 'en-US', c = TM.clean(it.n);
    function search(withYear) {
      var q = '&query=' + enc(c.q) + '&language=' + lang + (withYear && c.y ? '&' + (type === 'movie' ? 'year' : 'first_air_date_year') + '=' + c.y : '');
      return tm('/search/' + type, q).then(function (d) {
        var r = d && d.results && d.results[0];
        if (r) return r.id;
        if (withYear && c.y) return search(false);
        return null;
      });
    }
    var idp = inf && inf.tmdb && /^\d+$/.test(String(inf.tmdb)) ? Promise.resolve(inf.tmdb) : search(true);
    return idp.then(function (id) {
      if (!id) return { none: 1 };
      return tm('/' + type + '/' + id, '&language=' + lang + '&append_to_response=videos,credits&include_video_language=' + (lang === 'ar' ? 'ar,en,null' : 'en,null')).then(function (d) {
        var vids = (d.videos && d.videos.results || []).filter(function (v) { return v.site === 'YouTube'; });
        var tr = vids.filter(function (v) { return v.type === 'Trailer'; })[0] || vids[0];
        var rt = d.runtime || (d.episode_run_time && d.episode_run_time[0]) || 0;
        var o = {
          plot: d.overview || '', poster: d.poster_path ? 'https://image.tmdb.org/t/p/w500' + d.poster_path : '',
          bd: d.backdrop_path ? 'https://image.tmdb.org/t/p/w1280' + d.backdrop_path : '',
          year: String(d.release_date || d.first_air_date || '').slice(0, 4), rating: d.vote_average ? String(Math.round(d.vote_average * 10) / 10) : '',
          genre: (d.genres || []).slice(0, 3).map(function (g) { return g.name; }).join(', '),
          cast: ((d.credits && d.credits.cast) || []).slice(0, 5).map(function (p) { return p.name; }).join(', '),
          dur: rt ? (rt >= 60 ? Math.floor(rt / 60) + 'h ' : '') + (rt % 60) + 'm' : '', trailer: tr ? tr.key : ''
        };
        if (o.plot || lang !== 'ar') return o;
        return tm('/' + type + '/' + id, '&language=en-US').then(function (e) { o.plot = (e && e.overview) || ''; return o; }, function () { return o; });
      });
    });
  };
  /* cached per title; anything TMDB lacks stays as the IPTV server gave it */
  TM.enrich = function (it, inf) {
    if (!TM.key() || (it.t !== 'vod' && it.t !== 'series')) return Promise.resolve(inf);
    var k = D.pid + 'tmdb:' + L.lang + ':' + L.key(it);
    return L.cache.get(k).then(function (c) {
      if (c && c.v) return c.v;
      return TM.fetch(it, inf).then(function (o) { L.cache.set(k, o); return o; });
    }).then(function (o) {
      if (o && !o.none) for (var f in o) if (o[f]) inf[f] = o[f];
      inf.tm = !!(o && !o.none);
      return inf;
    }).catch(function () { return inf; });
  };

  /* ---------------- M3U playlist ---------------- */
  function M3U(p) { this.url = p.url; }
  M3U.prototype = {
    login: function () { return this.load().then(function (d) { if (!d.live.length && !d.vod.length && !d.series.length) throw new Error('Playlist is empty or not M3U'); }); },
    load: function () {
      var me = this;
      if (!me._p) me._p = req(me.url, true, 120000).then(parseM3U);
      me._p.catch(function () { me._p = null; });
      return me._p;
    },
    cats: function (t) { return this.load().then(function (d) { return d.cats[t]; }); },
    list: function (t, cat) { return this.load().then(function (d) { return cat ? d[t].filter(function (x) { return x.c === cat; }) : d[t]; }); },
    info: function (it) {
      var o = meta(null);
      if (it.t === 'series') {
        var by = {}; o.seasons = [];
        (it.eps || []).forEach(function (e) { (by[e.s] || (by[e.s] = [])).push(e); });
        Object.keys(by).sort(function (a, b) { return a - b; }).forEach(function (k) {
          o.seasons.push({ s: +k, eps: by[k].sort(function (a, b) { return a.e - b.e; }) });
        });
      }
      return Promise.resolve(o);
    },
    url: function (it, ep) { return ep ? ep.u : it.u; },
    epg: function () { return Promise.resolve([]); }
  };
  function parseM3U(text) {
    var d = { live: [], vod: [], series: [], cats: { live: [], vod: [], series: [] } };
    var seen = { live: {}, vod: {}, series: {} }, shows = {}, pos = 0, n = 0, inf = null, line, end;
    var reA = /([\w-]+)="([^"]*)"/g, reEp = /^(.*?)[\s._-]*S(\d{1,2})[\s._-]*E(\d{1,3})/i;
    while (pos < text.length) {
      end = text.indexOf('\n', pos); if (end < 0) end = text.length;
      line = text.slice(pos, end).trim(); pos = end + 1;
      if (!line) continue;
      if (line.charCodeAt(0) === 35) { if (line.lastIndexOf('#EXTINF', 0) === 0) inf = line; continue; }
      if (!inf) continue;
      var at = {}, m; reA.lastIndex = 0;
      while ((m = reA.exec(inf))) at[m[1]] = m[2];
      var name = inf.slice(inf.lastIndexOf(',') + 1).trim() || at['tvg-name'] || 'Untitled';
      var grp = at['group-title'] || 'Other', logo = at['tvg-logo'] || '', u = line, t, ep;
      inf = null;
      var path = u.split('?')[0];
      if (/\/series\//i.test(path) || ((ep = reEp.exec(name)) && /\.(mp4|mkv|avi|mov)$/i.test(path))) t = 'series';
      else if (/\/movie\//i.test(path) || /\.(mp4|mkv|avi|mov|wmv|flv)$/i.test(path)) t = 'vod';
      else t = 'live';
      if (!seen[t][grp]) { seen[t][grp] = 1; d.cats[t].push({ id: grp, name: grp }); }
      if (t === 'series') {
        ep = ep || reEp.exec(name);
        var show = ep ? (ep[1].trim() || name) : name, key = grp + '|' + show, sh = shows[key];
        if (!sh) { sh = shows[key] = { t: t, id: 's' + (++n), n: show, i: logo, c: grp, a: 0, eps: [] }; d.series.push(sh); }
        sh.eps.push({ id: ++n, s: ep ? +ep[2] : 1, e: ep ? +ep[3] : sh.eps.length + 1, n: '', u: u });
      } else d[t].push({ t: t, id: ++n, n: name, i: logo, c: grp, a: 0, u: u });
    }
    return d;
  }

  /* ---------------- Demo ---------------- */
  var HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  var MP4 = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  function Demo() {
    var A = ['Silent', 'Last', 'Blue', 'Broken', 'Golden', 'Hidden', 'Northern', 'Paper', 'Electric', 'Midnight', 'Crimson', 'Glass', 'Distant', 'Wild', 'Iron'];
    var B = ['Horizon', 'River', 'Kingdom', 'Signal', 'Garden', 'Harbor', 'Empire', 'Echo', 'Station', 'Orbit', 'Summer', 'Frontier', 'Letters', 'Tide', 'Mirage'];
    var g = { live: ['News', 'Sports', 'Kids', 'Documentary', 'Music', 'Entertainment'], vod: ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Family', 'Thriller', 'Animation'], series: ['Drama', 'Crime', 'Comedy', 'Sci-Fi', 'Reality'] };
    var d = this.d = { live: [], vod: [], series: [] }, i;
    this.c = {};
    for (var t in g) this.c[t] = g[t].map(function (x, j) { return { id: String(j + 1), name: x }; });
    for (i = 0; i < 120; i++) d.live.push({ t: 'live', id: i + 1, n: g.live[i % 6] + ' ' + (Math.floor(i / 6) + 1) + ' HD', i: '', c: String(i % 6 + 1) });
    for (i = 0; i < 3000; i++) d.vod.push({ t: 'vod', id: i + 1, n: A[i % 15] + ' ' + B[(i * 7 + Math.floor(i / 15)) % 15] + (i >= 225 ? ' ' + (Math.floor(i / 225) + 1) : ''), i: 'https://picsum.photos/seed/v' + i + '/318/477', c: String(i % 7 + 1), a: 3000 - i, e: 'mp4' });
    for (i = 0; i < 400; i++) d.series.push({ t: 'series', id: i + 1, n: 'The ' + B[i % 15] + ' ' + A[(i * 4 + Math.floor(i / 15)) % 15], i: 'https://picsum.photos/seed/s' + i + '/318/477', c: String(i % 5 + 1), a: 400 - i });
  }
  Demo.prototype = {
    login: function () { return Promise.resolve(); },
    cats: function (t) { return Promise.resolve(this.c[t]); },
    list: function (t, cat) { var l = this.d[t]; return Promise.resolve(cat ? l.filter(function (x) { return x.c === cat; }) : l); },
    info: function (it) {
      var o = { plot: 'A sample title so you can try the interface. Connect your own provider in Settings to see your real library here, with artwork, descriptions and episodes.', bd: 'https://picsum.photos/seed/b' + it.t + it.id + '/1920/1080', poster: '', year: String(2015 + it.id % 11), dur: '1h 52m', genre: 'Demo', cast: '', rating: String(6 + it.id % 4) };
      if (it.t === 'series') {
        o.seasons = [1, 2, 3].map(function (s) {
          var eps = []; for (var e = 1; e <= 8; e++) eps.push({ id: it.id * 1000 + s * 100 + e, s: s, e: e, n: 'Chapter ' + e, ext: 'mp4', img: 'https://picsum.photos/seed/e' + it.id + s + e + '/520/292' });
          return { s: s, eps: eps };
        });
      }
      return Promise.resolve(o);
    },
    url: function (it, ep) { return !ep && it.t === 'live' ? HLS : MP4; },
    epg: function () { return Promise.resolve(['Morning Show', 'World Report']); }
  };

  /* ---------------- cached facade ---------------- */
  var TTL = 12 * 3600 * 1000;
  var D = L.data = {};
  D.init = function (p) {
    D.profile = p; D.pid = L.hue(JSON.stringify(p)) + ':' + (p.url || 'demo').length + ':';
    D.prov = p.type === 'xtream' ? new Xtream(p) : p.type === 'm3u' ? new M3U(p) : new Demo();
    D.mem = {}; D.full = {};
  };
  function memo(key, fn) {
    if (!D.mem[key]) { D.mem[key] = fn(); D.mem[key].catch(function () { delete D.mem[key]; }); }
    return D.mem[key];
  }
  /* stale-while-revalidate: serve the cache at once, refresh in the background */
  function cached(key, fetcher) {
    if (D.profile.type === 'demo') return fetcher();
    var k = D.pid + key;
    return L.cache.get(k).then(function (c) {
      if (c && c.v && c.v.length) {
        if (Date.now() - c.ts > TTL) fetcher().then(function (v) { if (v && v.length) L.cache.set(k, v); }).catch(function () { });
        return c.v;
      }
      return fetcher().then(function (v) { L.cache.set(k, v); return v; });
    });
  }
  D.cats = function (t) { return memo('c' + t, function () { return cached('cats:' + t, function () { return D.prov.cats(t); }); }); };
  D.all = function (t) {
    return memo('a' + t, function () {
      return cached('all:' + t, function () { return D.prov.list(t, null); }).then(function (items) {
        if (t !== 'live') items.sort(function (a, b) { return (b.a || 0) - (a.a || 0); });
        var by = {}, c;
        for (var i = 0; i < items.length; i++) { c = items[i].c; (by[c] || (by[c] = [])).push(items[i]); }
        D.full[t] = { items: items, by: by };
        return items;
      });
    });
  };
  D.list = function (t, cat) {
    if (!cat) return D.all(t);
    if (D.full[t]) return Promise.resolve(D.full[t].by[cat] || []);
    return memo('l' + t + cat, function () {
      return D.prov.list(t, cat).then(function (items) {
        if (t !== 'live') items.sort(function (a, b) { return (b.a || 0) - (a.a || 0); });
        return items;
      });
    });
  };
  D.info = function (it) {
    return memo('i' + L.key(it), function () {
      return D.prov.info(it).catch(function (e) { if (TM.key()) return meta(null); throw e; }).then(function (inf) { return TM.enrich(it, inf); });
    });
  };
  D.forgetInfo = function () { for (var k in D.mem) if (k.charAt(0) === 'i') delete D.mem[k]; };
  D.url = function (it, ep, fmt) { return D.prov.url(it, ep, fmt); };
  D.epg = function (it) { return D.prov.epg(it).catch(function () { return []; }); };
})();
