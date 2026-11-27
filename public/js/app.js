(function () {
  'use strict';

  var B = window.BOOK, S = B.stories, ORDER = B.order, PARTS = B.parts;
  var X = window.CHIEM_NGHIEM || { sections: [] };
  var RBASE = X.sections || [], R = RBASE.slice();
  function setRemote(list) {
    var seen = {}, extra = [];
    RBASE.forEach(function (x, k) { seen[rid(x, k)] = 1; });
    (list || []).forEach(function (x) { if (x && x.id && x.title && Array.isArray(x.paras) && !seen[x.id]) { seen[x.id] = 1; extra.push(x); } });
    R = RBASE.concat(extra);
  }
  /* trang sách: 0 bìa, 1 mục lục, 2... các truyện, LAST trang cuối.
     Chiêm nghiệm và Ghi tâm là khu riêng, không nằm trong dòng lật trang. */
  var FIRST = 2, LAST = FIRST + S.length, TOTAL = LAST + 1;

  var ICO = {
    heart: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    speak: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/></svg>',
    rain:  '<svg class="ic" viewBox="0 0 24 24"><path d="M7 15h10a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 7.8 7.6 3.7 3.7 0 0 0 7 15z"/><path d="M9 18v2.5M13 18v2.5M17 18v2.5"/></svg>',
    card:  '<svg class="ic" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
    play:  '<svg class="ic i-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg class="ic i-pause" viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    pen:   '<svg class="ic" viewBox="0 0 24 24"><path d="M3 21l3.6-.9L19.4 7.3a2.2 2.2 0 0 0-3.1-3.1L3.5 17z"/><path d="M14.5 6l3.5 3.5"/></svg>'
  };

  var root = document.documentElement;
  var stage = document.getElementById('stage');
  var stripEl = document.getElementById('strip');
  var posEl = document.getElementById('pos');
  var prevB = document.getElementById('prev');
  var nextB = document.getElementById('next');
  var noteEl = document.getElementById('note');
  var ac, gain, rainOn = false, rainVol = parseInt(get('tkk-rain') || '50', 10);
  if (!(rainVol >= 0 && rainVol <= 100)) rainVol = 50;
  var SKINS = ['co', 'den', 'sang', 'toi'];
  var SKIN_NAME = { co: 'Cổ', den: 'Đèn dầu', sang: 'Sáng', toi: 'Tối' };
  var SKIN_BAR = { co: '#d9c08c', den: '#2c1d0f', sang: '#f4f2f8', toi: '#1b1730' };
  var skin = get('tkk-skin');
  if (skin === 'hien') skin = 'sang';
  if (SKINS.indexOf(skin) < 0) skin = 'co';
  var i = 0, curStory = null, navPrev = null, navNext = null;
  var timers = [], deferred = null;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- tiện ích ---------- */
  function partNow() {
    var d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (h >= 4.5 && h < 7.5) return 'dawn';
    if (h >= 7.5 && h < 11) return 'morning';
    if (h >= 11 && h < 15) return 'noon';
    if (h >= 15 && h < 19) return 'dusk';
    return 'night';
  }
  function hhmm() { var d = new Date(); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function firstOf(part) { return S.findIndex(function (s) { return s.part === part; }); }
  function byId(id) { return S.find(function (s) { return s.id === id; }); }
  function dayPick() { return Math.floor((Date.now() + 7 * 3600000) / 86400000) % S.length; }
  function by(p) { return p.by ? p.by : ''; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rid(s, k) {
    if (s.id) return s.id;
    return (s.title || 'r' + k).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function origin(s) {
    if (!s.source) return '';
    var a = '<a href="' + s.source.url + '" target="_blank" rel="noopener noreferrer">' + s.source.name + '</a>';
    if (s.kind === 'real') return '<p class="origin">Dựa trên câu chuyện có thật, kể lại bằng lời của sách và không nêu tên người. Nguồn: ' + a + '.</p>';
    return '<p class="origin">Truyện sáng tác, lấy ý từ bài viết: ' + a + '. ' + (s.source.idea || '') + '</p>';
  }

  var nt;
  function note(m) {
    noteEl.textContent = m; noteEl.classList.add('show');
    clearTimeout(nt); nt = setTimeout(function () { noteEl.classList.remove('show'); }, 2400);
  }
  function clearAll() { timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }

  /* ---------- Ghi tâm: những điều giữ lại và tự viết ---------- */
  var tam = { saved: [], own: [] };
  (function loadTam() {
    try {
      var t = JSON.parse(get('tkk-tam') || 'null');
      if (t && Array.isArray(t.saved) && Array.isArray(t.own)) { tam = t; return; }
    } catch (e) {}
    try {   /* chuyển dữ liệu "hũ khoảnh khắc" của bản cũ */
      var old = JSON.parse(get('tkk-saved') || '[]');
      if (Array.isArray(old)) tam.saved = old.map(function (id) { return 's:' + id; });
    } catch (e) {}
  })();
  function saveTam() { put('tkk-tam', JSON.stringify(tam)); }
  function isSaved(ref) { return tam.saved.indexOf(ref) >= 0; }
  function toggleRef(ref) {
    var k = tam.saved.indexOf(ref);
    if (k < 0) tam.saved.push(ref); else tam.saved.splice(k, 1);
    saveTam();
    return k < 0;
  }
  function refInfo(ref) {
    var t = ref.slice(0, 1), id = ref.slice(2);
    if (t === 's') {
      var s = byId(id);
      return s ? { title: s.title, kind: 'Truyện', act: 'goto', n: S.indexOf(s) + FIRST } : null;
    }
    if (t === 'r') {
      for (var k = 0; k < R.length; k++) if (rid(R[k], k) === id) return { title: R[k].title, kind: 'Chiêm nghiệm', act: 'reflOpen', n: k };
    }
    return null;
  }
  function savedHtml(withRemove) {
    var items = tam.saved.map(function (ref) { return { ref: ref, info: refInfo(ref) }; }).filter(function (o) { return o.info; });
    if (!items.length) return '<p class="empty">Chưa có gì. Bấm “Ghi tâm” ở cuối mỗi truyện hoặc mỗi điều chiêm nghiệm, những điều bạn muốn giữ lại sẽ nằm ở đây.</p>';
    return '<ul class="saved-list">' + items.map(function (o) {
      return '<li><button class="lnk" data-act="' + o.info.act + '" data-n="' + o.info.n + '" data-k="' + o.info.n + '">' + esc(o.info.title) + '<small>' + o.info.kind + '</small></button>' +
        (withRemove ? '<button class="mini" data-act="unsave" data-ref="' + o.ref + '" aria-label="Bỏ khỏi Ghi tâm">Bỏ</button>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  /* ---------- header: dòng người và người đi ngược dòng ---------- */
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function crowd(n, y, s, seed) {
    var r = rnd(seed), W = 780, step = W / n, out = '';
    for (var k = 0; k < n; k++) {
      var x = k * step + (r() - .5) * step * .55, sc = s * (.9 + r() * .24);
      out += '<use href="#fig" transform="translate(' + x.toFixed(1) + ' ' + y + ') scale(' + sc.toFixed(2) + ')"/>';
    }
    return '<g>' + out + '</g><g transform="translate(-780 0)">' + out + '</g>';
  }
  function buildScene() {
    var far = document.getElementById('crowdFar'), near = document.getElementById('crowdNear');
    if (far) far.innerHTML = crowd(12, 197, .5, 7);
    if (near) near.innerHTML = crowd(7, 200, .78, 3);
  }

  /* ---------- chữ hiện ra như cây bút đang viết ---------- */
  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var penPref = get('tkk-pen');
  if (['auto', 'on', 'off'].indexOf(penPref) < 0) penPref = 'auto';
  var penRuns = [], penIO = null;

  function penOn() {
    if (!document.body.animate) return false;
    if (penPref === 'off') return false;
    if (penPref === 'on') return true;
    return !REDUCED;
  }
  function penSeen(key) { try { return JSON.parse(get('tkk-penned') || '[]').indexOf(key) >= 0; } catch (e) { return false; } }
  function penDone(key) {
    try {
      var l = JSON.parse(get('tkk-penned') || '[]');
      if (l.indexOf(key) < 0) { l.push(key); put('tkk-penned', JSON.stringify(l)); }
    } catch (e) {}
  }
  function penStop() {
    penRuns.slice().forEach(function (r) { r.stop(); });
    penRuns = [];
    if (penIO) { penIO.disconnect(); penIO = null; }
  }

  function penWrite(els, speed, done) {
    var items = [], t = 0, over = false, raf = 0, t0 = 0, anims, run, seed = 11;
    function r() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var nib = document.createElement('i');
    els.forEach(function (el) {
      var text = el.textContent;
      el.setAttribute('aria-label', text);
      el.classList.remove('pen-pending');
      el.innerHTML = text.split(' ').map(function (w) { return '<span class="w" aria-hidden="true">' + w + '</span>'; }).join(' ');
      [].forEach.call(el.querySelectorAll('.w'), function (sp) {
        var w = sp.textContent, d = Math.max(170, w.length * speed * (0.8 + r() * 0.5));
        items.push({ sp: sp, start: t, dur: d });
        t += d + 40 + r() * 90;                     /* nhấc bút giữa các từ */
        if (/[,;:]$/.test(w)) t += 220;             /* dừng ở dấu phẩy */
        else if (/[.!?…]$/.test(w)) t += 420;       /* dừng ở dấu chấm */
        else if (r() < .08) t += 180;               /* thỉnh thoảng nghĩ một nhịp */
      });
      t += 380;
    });
    var total = t;
    nib.className = 'nib'; nib.setAttribute('aria-hidden', 'true');
    nib.innerHTML = '<svg viewBox="0 0 46 46" width="46" height="46" overflow="visible"><g stroke-linejoin="round" stroke-linecap="round"><path d="M15 31 L12.4 25 L13.6 25.2 L13 19.6 L14.4 20 L15.6 14.8 L16.8 15.4 L20.4 10.6 L20.8 11.8 L22.6 14.2 L24 9 L25 9.8 L29 6.2 L29.3 7.4 L34 4.4 L34 5.6 L38.6 3 L44 2 C38 8.5 30 16.5 22 24 C19 27 17 29.2 15 31Z" fill="#f6eedb" stroke="#6b5230" stroke-width=".9"/><path d="M18 29.5 L20.6 33.2 L21 32.2 L25 34.6 L25 33.4 L30 33 L29.6 31.8 L34 28.6 L33.4 27.6 L37.6 22.4 L36.8 21.6 L40.4 14.6 L39.5 14 L43 6.4 L44 2 C38 10 28 20 18 29.5Z" fill="#e9dcbd" stroke="#6b5230" stroke-width=".9"/><path d="M20 27 L14.5 23 M23.4 23.4 L17 17.6 M26.8 19.6 L21.6 12.6 M30 16.2 L26.2 9 M33.4 12.6 L31 6.4 M22 28 L24.6 32.6 M26 24.4 L31.5 29.5 M29.6 20.6 L35 25 M33 16.6 L38 19.6 M37 12 L40.6 12.6" stroke="#b39a6c" stroke-width=".6" fill="none"/><path d="M4 42 C12 34 24 20 44 2" stroke="#5a4326" stroke-width="1.6" fill="none"/><path d="M2.2 44.4 L5 40.4 L7.2 42.6Z" fill="#2c1d0c" stroke="none"/></g></svg>';
    stage.appendChild(nib);
    var MASK = 'linear-gradient(103deg, #000 0, #000 58%, transparent 100%)';
    anims = [];
    try {
    items.forEach(function (it) {
      var st = it.sp.style;
      st.webkitMaskImage = st.maskImage = MASK;
      st.webkitMaskSize = st.maskSize = '300% 100%';
      st.webkitMaskRepeat = st.maskRepeat = 'no-repeat';
      var eff = { duration: it.dur, delay: it.start, easing: 'cubic-bezier(.35,.1,.5,1)', fill: 'both' };
      anims.push(it.sp.animate(
        [{ webkitMaskPosition: '100% 0', maskPosition: '100% 0' }, { webkitMaskPosition: '0% 0', maskPosition: '0% 0' }], eff));
      anims.push(it.sp.animate(   /* mực còn ướt, đậm rồi nhạt dần */
        [{ textShadow: '0 0 1.4px currentColor' }, { textShadow: '0 0 1.4px currentColor', offset: .4 }, { textShadow: '0 0 0 transparent' }],
        { duration: it.dur + 650, delay: it.start, easing: 'linear', fill: 'both' }));
    });
    } catch (err) {
      anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      items.forEach(function (it) { it.sp.style.webkitMaskImage = it.sp.style.maskImage = ''; });
      if (nib.parentNode) nib.parentNode.removeChild(nib);
      if (done) done();
      return;
    }
    function finish() {
      if (over) return;
      over = true;
      cancelAnimationFrame(raf);
      anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      items.forEach(function (it) { it.sp.style.webkitMaskImage = it.sp.style.maskImage = ''; });
      if (nib.parentNode) nib.parentNode.removeChild(nib);
      var k = penRuns.indexOf(run); if (k >= 0) penRuns.splice(k, 1);
      els.forEach(function (el) { el.removeEventListener('click', skip); });
    }
    function skip() { finish(); if (done) done(); }
    run = { stop: finish };
    penRuns.push(run);
    els.forEach(function (el) { el.addEventListener('click', skip); });
    function frame(now) {
      if (over) return;
      if (!t0) t0 = now;
      var e = now - t0;
      if (e >= total) { finish(); if (done) done(); return; }
      var cur = null;
      for (var k = 0; k < items.length; k++) {
        if (e >= items[k].start && e <= items[k].start + items[k].dur) { cur = items[k]; break; }
      }
      if (cur) {
        var rc = cur.sp.getBoundingClientRect(), sg = stage.getBoundingClientRect(), p = (e - cur.start) / cur.dur;
        var wob = Math.sin(e / 55) * rc.height * .07 + Math.sin(e / 23) * 1.2;
        nib.style.transform = 'translate(' + (rc.left - sg.left + rc.width * p - 3.8) + 'px,' + (rc.top - sg.top + rc.height * .74 + wob - 54) + 'px) rotate(' + (Math.sin(e / 90) * 3 + Math.sin(e / 210) * 2 - 4) + 'deg)';
        nib.style.opacity = '1';
      } else nib.style.opacity = '0';
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  /* always = true: viết lại mỗi lần trang hiện ra (trang bìa). Ngược lại chỉ viết lần đầu. */
  function setupPen(key, always) {
    var els = [].slice.call(stage.querySelectorAll('[data-pen]'));
    if (!els.length || !penOn()) return;
    if (!always && key && penSeen(key)) return;
    els.forEach(function (el) { el.classList.add('pen-pending'); });
    if (always) {
      var tm = setTimeout(function () { penWrite(els, 26); }, 700);
      penRuns.push({ stop: function () { clearTimeout(tm); } });
      return;
    }
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.remove('pen-pending'); });
      return;
    }
    var left = els.length, started = [];
    function begin(t) {
      if (started.indexOf(t) >= 0) return;
      started.push(t);
      try { penIO.unobserve(t); } catch (e) {}
      try { penWrite([t], 46, function () { if (--left === 0 && key) penDone(key); }); }
      catch (err) { t.classList.remove('pen-pending'); if (--left === 0 && key) penDone(key); }
    }
    penIO = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var vh = window.innerHeight || 700, hh = en.boundingClientRect.height;
        /* đoạn dài hơn màn hình thì không bao giờ đủ 60%: cho viết khi đã thấy phần lớn màn hình */
        if (en.intersectionRatio >= 0.6 || en.intersectionRect.height >= Math.min(hh * 0.6, vh * 0.45)) begin(en.target);
      });
    }, { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1] });
    /* chốt an toàn: chữ không bao giờ bị ẩn mãi */
    var safe = setTimeout(function () {
      els.forEach(function (el) {
        if (started.indexOf(el) >= 0 || !el.classList.contains('pen-pending')) return;
        var rc = el.getBoundingClientRect();
        if (rc.bottom > 0 && rc.top < (window.innerHeight || 700)) begin(el);
      });
      setTimeout(function () { els.forEach(function (el) { if (started.indexOf(el) < 0) el.classList.remove('pen-pending'); }); }, 8000);
    }, 2500);
    penRuns.push({ stop: function () { clearTimeout(safe); } });
    els.forEach(function (el) { penIO.observe(el); });
  }
  function rewrite() {
    var el = stage.querySelector('[data-pen]');
    if (!el || !document.body.animate) return;
    penStop();
    penWrite([el], 46);
  }

  /* ---------- các trang ---------- */
  function installHint() {
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
    if (standalone) return '';
    return ios ? 'Trên iPhone: bấm nút Chia sẻ của Safari, chọn "Thêm vào MH chính" để cài sách.' : '';
  }

  function rainRow() {
    return '<div class="rain"><button class="rbtn" data-act="rain" aria-pressed="' + rainOn + '" aria-label="Bật hoặc tắt tiếng mưa">' + ICO.rain + '<span>Mưa</span></button>' +
      '<input class="rvol" type="range" min="0" max="100" step="5" value="' + rainVol + '" aria-label="Âm lượng tiếng mưa"></div>';
  }
  function listenBar(id) {
    return '<div class="listen" data-id="' + id + '" role="group" aria-label="Nghe bài">' +
      '<button class="lbtn" data-act="listen" aria-label="Nghe hoặc dừng bài này">' + ICO.play + ICO.pause + '</button>' +
      '<div class="lmid"><div class="lt">Nghe bài này</div><div class="lbar"><i></i></div>' +
      '<div class="lmeta"><span class="lsrc"></span><span class="ltime"></span></div></div>' + rainRow() + '</div>' +
      '<p class="voice-hint" role="status" hidden></p>';
  }

  function cover() {
    var last = parseInt(get('tkk-page') || '0', 10);
    var resume = last >= FIRST && last <= LAST;
    return '<article class="page cover">' +
      '<p class="kick">Lời động viên cho từng ngày</p>' +
      '<h1 class="h-story">Từng <em>Khoảnh Khắc</em></h1>' +
      '<blockquote class="epi hand"><p data-pen>Cuộc đời có lẽ không cần chúng ta phải hiểu hết mọi người, cũng không cần mọi người phải hiểu mình.</p><p data-pen>Điều quan trọng là hiểu đủ để không làm tổn thương người khác, tỉnh táo đủ để không đánh mất chính mình và khiêm nhường đủ để biết rằng mình vẫn còn nhiều điều phải học.</p></blockquote>' +
      '<div class="btns"><button class="btn" data-act="open">Mở sách</button>' +
      (resume ? '<button class="btn ghost" data-act="resume">Đọc tiếp trang ' + (last + 1) + '</button>' : '') +
      '<button class="btn ghost" data-act="bookListen">' + ICO.speak + '<span data-bl>Nghe cả sách</span></button>' +
      '<button class="btn ghost" data-act="install" ' + (deferred ? '' : 'hidden') + '>Cài lên màn hình</button></div>' +
      '<div class="listen coverrain" role="group" aria-label="Tiếng mưa">' + rainRow() + '</div>' +
      '<div class="cover-foot"><p class="foot">' + S.length + ' truyện · đọc được khi không có mạng' + (installHint() ? ' · ' + installHint() : '') + '</p>' +
      '<div class="seal" aria-hidden="true"><span>Từng</span><span>Khoảnh</span><span>Khắc</span></div></div>' +
      '</article>';
  }

  function penPrefHtml() {
    var o = [['auto', 'Theo thiết bị'], ['on', 'Bật'], ['off', 'Tắt']];
    return '<section class="settings"><h2 class="h2">Cài đặt</h2>' +
      '<div class="set-row"><span>Hiệu ứng cây bút</span><div class="chips" role="group" aria-label="Hiệu ứng cây bút">' +
      o.map(function (x) { return '<button class="chip" data-act="penpref" data-v="' + x[0] + '" aria-pressed="' + (penPref === x[0]) + '">' + x[1] + '</button>'; }).join('') +
      '</div></div>' +
      '<p class="src">Nếu bạn không thấy chữ được viết ra, hãy chọn “Bật”. Máy của bạn có thể đang tắt hiệu ứng chuyển động.</p></section>';
  }

  function toc() {
    var cur = partNow(), ci = firstOf(cur), d = S[dayPick()];
    var parts = ORDER.map(function (k) {
      var items = S.map(function (s, n) { return { s: s, n: n }; }).filter(function (o) { return o.s.part === k; });
      return '<section class="toc-part"><h2>' + PARTS[k].name + ' · ' + PARTS[k].tag + '<span>' + PARTS[k].time + '</span></h2>' +
        '<ol class="toc-list">' + items.map(function (o) {
          return '<li><button data-act="goto" data-n="' + (o.n + FIRST) + '"><em>' + o.s.title + '</em>' +
            '<span class="tk">' + (isSaved('s:' + o.s.id) ? ICO.heart : '') + '</span></button></li>';
        }).join('') + '</ol></section>';
    }).join('');
    return '<article class="page toc">' +
      '<p class="kick">Mục lục</p>' +
      '<h1 class="h-story">Một ngày, năm chặng đường</h1>' +
      '<section class="today"><span class="t-lab">Phương ngôn hôm nay</span><q>' + d.proverb.text + '</q><span class="by">' + by(d.proverb) + '</span>' +
      '<div class="btns"><button class="chip" data-act="goto" data-n="' + (dayPick() + FIRST) + '">Đọc truyện “' + d.title + '”</button></div></section>' +
      '<div class="dual">' +
      '<button class="dcard" data-act="bookListen"><b>Nghe</b><em data-bl>Nghe cả sách</em><small>Phát liên tục từ truyện đầu đến truyện cuối, tự sang trang</small></button>' +
      '<button class="dcard" data-act="refl"><b>Chiêm nghiệm</b><em>Những điều chiêm nghiệm về cuộc đời</em><small>' + R.length + ' điều chung, và chỗ để bạn tự viết</small></button>' +
      '</div>' +
      '<button class="now" data-act="goto" data-n="' + (ci + FIRST) + '"><span class="now-t">Bây giờ ' + hhmm() + '</span><span class="now-n">Truyện hợp giờ này: “' + S[ci].title + '”</span></button>' +
      parts + penPrefHtml() + '</article>';
  }

  function story(s) {
    var p = PARTS[s.part], on = isSaved('s:' + s.id);
    return '<article class="page story">' +
      '<p class="kick">' + p.name + ' · ' + p.time + (s.kind === 'real' ? ' · Chuyện có thật' : '') + '</p>' +
      '<h1 class="h-story">' + s.title + '</h1>' +
      listenBar(s.id) +
      '<div class="prose">' + s.paras.map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div>' +
      origin(s) +
      '<figure class="proverb"><figcaption>Phương ngôn</figcaption><blockquote class="hand" data-pen>' + s.proverb.text + '</blockquote><p class="by">' + by(s.proverb) + '</p>' +
      '<button class="chip pen-btn" data-act="rewrite">' + ICO.pen + '<span>Viết lại</span></button></figure>' +
      '<section class="task"><h2>Việc nhỏ cho hôm nay</h2><p>' + s.task + '</p>' +
      '<div class="t-bar"><i></i></div><p class="t-out" role="status"></p>' +
      '<button class="btn ghost" data-act="task">Bắt đầu 1 phút</button></section>' +
      '<section class="pause"><button class="btn ghost" data-act="breath">Dừng lại một nhịp</button>' +
      '<p class="hint">10 giây hít thở trước khi sang trang.</p></section>' +
      '<div class="acts">' +
      '<button class="chip" data-act="save" data-ref="s:' + s.id + '" aria-pressed="' + on + '">' + ICO.heart + '<span>' + (on ? 'Đã ghi tâm' : 'Ghi tâm') + '</span></button>' +
      '<button class="chip" data-act="card">' + ICO.card + '<span>Tạo thẻ phương ngôn</span></button>' +
      '</div>' +
      '</article>';
  }

  function end() {
    return '<article class="page end">' +
      '<p class="kick">Hết một ngày</p>' +
      '<h1 class="h-story">Bạn vừa đi trọn một ngày bằng đúng nhịp của mình</h1>' +
      '<p class="lead hand" data-pen>Ngày mai là một trang mới, và bạn đã sẵn sàng.</p>' +
      '<section><h2 class="h2">Đã ghi tâm</h2>' + savedHtml(true) + '</section>' +
      '<p class="care">Hôm nào thấy mệt, cứ làm chậm lại một chút. Nhắn cho một người bạn hay gọi về nhà cũng là một việc đáng làm.</p>' +
      '<div class="btns"><button class="btn" data-act="refl">Đọc những điều chiêm nghiệm</button><button class="btn ghost" data-act="goto" data-n="' + FIRST + '">Đọc lại từ đầu</button></div>' +
      '<p class="src">Các câu trích từ kinh điển (Phật giáo, Nho gia, Lão Tử, khắc kỷ) được diễn đạt lại bằng tiếng Việt hiện đại, ghi “(ý)” khi không phải bản dịch từng chữ. Truyện có nhãn “Chuyện có thật” được kể lại từ báo chí bằng lời của sách, kèm nguồn ở cuối truyện; các truyện còn lại là sáng tác.</p>' +
      '</article>';
  }

  function pageHtml(n) {
    if (n === 0) return cover();
    if (n === 1) return toc();
    if (n === LAST) return end();
    return story(S[n - FIRST]);
  }

  function drawStrip(cur) {
    stripEl.innerHTML = ORDER.map(function (k, n) {
      return '<li><button class="seg' + (n <= cur ? ' on' : '') + (n === cur ? ' cur' : '') + '" data-act="goto" data-n="' + (firstOf(k) + FIRST) + '" aria-label="' + PARTS[k].name + '">' +
        '<span class="bar"></span><span class="lbl">' + PARTS[k].name + '</span></button></li>';
    }).join('');
  }

  /* hiện một trang vào khung đọc, dùng chung cho sách, Chiêm nghiệm và Ghi tâm */
  function mount(html, o) {
    clearAll(); penStop();
    if (!keepPlay) stopPlay();
    var y = window.scrollY;
    root.setAttribute('data-part', o.part);
    setMenu(o.menu || 'read');
    document.body.classList.toggle('reading', !o.cover);
    stage.innerHTML = html;
    if (!o.keep && stage.firstElementChild) stage.firstElementChild.classList.add('turn-' + (o.dir || 'next'));
    setupPen(o.penKey, !!o.penAlways);
    drawStrip(o.cur);
    stripEl.hidden = o.menu === 'refl';
    posEl.textContent = o.pos;
    navPrev = o.prev || null; navNext = o.next || null;
    prevB.style.visibility = navPrev ? 'visible' : 'hidden';
    nextB.style.visibility = navNext ? 'visible' : 'hidden';
    syncListen();
    window.scrollTo(0, o.keep ? y : 0);
  }
  function setMenu(m) {
    var a = document.getElementById('mRead'), b = document.getElementById('mRefl');
    if (m === 'refl') { b.setAttribute('aria-current', 'page'); a.removeAttribute('aria-current'); }
    else { a.setAttribute('aria-current', 'page'); b.removeAttribute('aria-current'); }
  }

  function go(n, dir) {
    n = Math.max(0, Math.min(LAST, n));
    dir = dir || (n >= i ? 'next' : 'prev');
    i = n; view = 'book'; put('tkk-page', String(i));
    var s = (i >= FIRST && i < LAST) ? S[i - FIRST] : null;
    curStory = s;
    mount(pageHtml(i), {
      part: s ? s.part : (i === LAST ? 'night' : partNow()),
      cur: s ? ORDER.indexOf(s.part) : (i === LAST ? ORDER.length - 1 : -1),
      cover: i === 0, dir: dir,
      pos: 'Trang ' + (i + 1) + ' / ' + TOTAL,
      prev: i > 0 ? function () { go(i - 1, 'prev'); } : null,
      next: i < LAST ? function () { go(i + 1, 'next'); } : null,
      penKey: i === 0 ? 'cover' : (i === LAST ? 'end' : (s ? s.id : null)),
      penAlways: i === 0
    });
  }

  /* ---------- khu Chiêm nghiệm: Chung (admin thêm) và Của bạn (tự viết) ---------- */
  var reflTab = 'common';
  function commonHtml() {
    var c = X.closing, sp = X.spirit || [];
    return '<p class="lead">Đọc chậm, từng điều một. Điều nào chạm vào bạn, hãy ghi tâm.</p>' +
      '<ol class="toc-list refl-list">' + R.map(function (s, k) {
        return '<li><button data-act="reflOpen" data-k="' + k + '"><em>' + esc(s.title) + '</em><span class="tk">' + (isSaved('r:' + rid(s, k)) ? ICO.heart : '') + '</span></button></li>';
      }).join('') + '</ol>' +
      (c ? '<figure class="proverb"><figcaption>' + esc(c.label) + '</figcaption><blockquote class="hand" data-pen>' + esc(c.text) + '</blockquote><p class="by">' + esc(c.by) + '</p>' +
        '<button class="chip pen-btn" data-act="rewrite">' + ICO.pen + '<span>Viết lại</span></button></figure>' : '') +
      (sp.length ? '<ul class="spirit">' + sp.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '');
  }
  function ownHtml() {
    var own = tam.own.map(function (e) {
      return '<li class="entry"><p>' + esc(e.text).replace(/\n/g, '<br>') + '</p><div class="entry-foot"><span>' + new Date(e.ts).toLocaleDateString('vi-VN') + '</span>' +
        '<button class="mini" data-act="tamDel" data-id="' + e.id + '">Xóa</button></div></li>';
    }).join('');
    return '<p class="kick own-tag">Tự chiêm nghiệm · chỉ mình bạn thấy</p>' +
      '<section class="tam-form"><label class="h2" for="tamText">Hôm nay bạn nghiệm ra điều gì?</label>' +
      '<textarea id="tamText" rows="4" maxlength="800" placeholder="Một câu thôi cũng được…"></textarea>' +
      '<div class="btns"><button class="btn" data-act="tamAdd">Ghi lại</button></div></section>' +
      (own ? '<ul class="entries">' + own + '</ul>' : '<p class="empty">Chưa có điều nào. Hãy viết điều bạn nghĩ ở khung phía trên.</p>') +
      (tam.own.length ? '<div class="btns"><button class="btn ghost" data-act="tamCopy">Sao chép tất cả</button></div>' : '') +
      '<p class="src">Những điều bạn tự viết chỉ lưu trên thiết bị này. Xóa dữ liệu trình duyệt hoặc đổi máy thì sẽ mất, nên hãy sao chép một bản để giữ.</p>';
  }
  function showReflList(dir, tab, keep) {
    curStory = null; view = 'refl';
    if (tab) reflTab = tab;
    var html = '<article class="page refl">' +
      '<p class="kick">Chiêm nghiệm</p>' +
      '<h1 class="h-story">Những điều chiêm nghiệm về cuộc đời</h1>' +
      '<div class="pills" role="tablist" aria-label="Loại chiêm nghiệm">' +
      '<button class="pill" role="tab" data-act="reflTab" data-tab="common" aria-selected="' + (reflTab === 'common') + '">Chung</button>' +
      '<button class="pill" role="tab" data-act="reflTab" data-tab="own" aria-selected="' + (reflTab === 'own') + '">Của bạn</button></div>' +
      (reflTab === 'common' ? commonHtml() : ownHtml()) +
      '</article>';
    mount(html, {
      menu: 'refl', part: 'night', cur: -1, dir: dir || 'next', keep: !!keep, pos: 'Chiêm nghiệm',
      prev: function () { view = 'book'; go(i, 'prev'); },
      next: (reflTab === 'common' && R.length) ? function () { showRefl(0, 'next'); } : null,
      penKey: 'refl-list'
    });
  }

  function showRefl(k, dir) {
    var s = R[k]; if (!s) { showReflList(dir, 'common'); return; }
    var ref = 'r:' + rid(s, k), on = isSaved(ref);
    curStory = null; view = 'refl';
    var html = '<article class="page refl">' +
      '<p class="kick">Chiêm nghiệm · ' + (k + 1) + ' trong ' + R.length + '</p>' +
      '<h1 class="h-story">' + esc(s.title) + '</h1>' +
      listenBar('r-' + rid(s, k)) +
      '<div class="refl-body">' + s.paras.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>' +
      '<div class="acts"><button class="chip" data-act="save" data-ref="' + ref + '" aria-pressed="' + on + '">' + ICO.heart + '<span>' + (on ? 'Đã ghi tâm' : 'Ghi tâm') + '</span></button></div>' +
      '</article>';
    mount(html, {
      menu: 'refl', part: 'night', cur: -1, dir: dir || 'next', pos: 'Chiêm nghiệm ' + (k + 1) + ' / ' + R.length,
      prev: function () { if (k > 0) showRefl(k - 1, 'prev'); else showReflList('prev', 'common'); },
      next: function () { if (k < R.length - 1) showRefl(k + 1, 'next'); else showReflList('next', 'common'); }
    });
  }

  function tamAdd() {
    var ta = document.getElementById('tamText');
    var text = ta ? ta.value.trim() : '';
    if (!text) { note('Hãy viết vài chữ trước nhé'); return; }
    tam.own.unshift({ id: Date.now().toString(36), text: text, ts: Date.now() });
    saveTam();
    showReflList(null, 'own', true);
    note('Đã ghi lại');
  }
  function tamCopy() {
    if (!tam.own.length) { note('Chưa có gì để sao chép'); return; }
    var txt = tam.own.map(function (e) { return '- ' + e.text + ' (' + new Date(e.ts).toLocaleDateString('vi-VN') + ')'; }).join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { note('Đã sao chép'); }, function () { note('Không sao chép được. Hãy chép tay từng mục.'); });
    } else note('Không sao chép được. Hãy chép tay từng mục.');
  }

  /* ---------- tính năng nhỏ ---------- */
  function startTask(b) {
    var box = b.closest('.task'), out = box.querySelector('.t-out'), bar = box.querySelector('.t-bar i');
    var s = 60;
    b.hidden = true; box.classList.add('run');
    out.textContent = '1:00';
    bar.style.transition = 'none'; bar.style.width = '0';
    bar.offsetWidth;
    bar.style.transition = 'width 60s linear'; bar.style.width = '100%';
    var id = setInterval(function () {
      s--;
      if (s <= 0) { clearInterval(id); out.textContent = 'Xong rồi. Bạn vừa dành cho mình một phút.'; return; }
      out.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }, 1000);
    timers.push(id);
  }

  function startBreath(b) {
    var box = b.closest('.pause');
    box.innerHTML = '<div class="orb" aria-hidden="true"></div><p class="b-txt" role="status">Hít vào chậm…</p>';
    var orb = box.querySelector('.orb'), t = box.querySelector('.b-txt');
    orb.offsetWidth;
    orb.style.transition = 'transform 4s ease-in-out'; orb.style.transform = 'scale(1)';
    timers.push(setTimeout(function () {
      t.textContent = 'Thở ra thật chậm…';
      orb.style.transition = 'transform 6s ease-in-out'; orb.style.transform = 'scale(.5)';
    }, 4000));
    timers.push(setTimeout(function () {
      t.textContent = 'Xong rồi. Sang trang khi bạn sẵn sàng.';
      var nb = document.createElement('button');
      nb.className = 'btn'; nb.setAttribute('data-act', 'next'); nb.textContent = 'Sang trang';
      box.appendChild(nb);
    }, 10000));
  }

  /* đọc to: chỉ dùng giọng tiếng Việt có sẵn trên thiết bị, nếu không có thì hướng dẫn cách cài */
  /* ---------- nghe: file thu âm của admin, hoặc giọng máy tiếng Việt nếu bài chưa có thu ---------- */
  var VOICE_MSG = 'Trình duyệt này chưa có giọng đọc tiếng Việt. Bạn có thể mở sách bằng Microsoft Edge, hoặc cài giọng Việt: trên Windows vào Cài đặt, Thời gian và ngôn ngữ, Giọng nói, rồi Thêm giọng; trên Android cài Google Text-to-speech và tải giọng Tiếng Việt.';
  var AUD = {};                         /* id bài -> mốc tải lên của file thu */
  var aud = new Audio(); aud.preload = 'none';
  var play = { id: null, playing: false, tts: false, book: false, prog: 0 };
  var keepPlay = false, ttsRun = 0;

  function textOf(id) {
    var s = /^s\d+$/.test(id) ? byId(id) : null;
    if (s) return { chunks: [s.title].concat(s.paras, [s.proverb.text]) };
    for (var k = 0; k < R.length; k++) if ('r-' + rid(R[k], k) === id) return { chunks: [R[k].title].concat(R[k].paras) };
    return null;
  }
  function fmt(t) { if (!isFinite(t)) return ''; return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); }
  function showVoiceHint(msg) {
    var el = stage.querySelector('.voice-hint');
    if (!el) { note('Chưa đọc to được trên thiết bị này'); return; }
    el.textContent = msg || VOICE_MSG; el.hidden = false;
  }
  function syncListen() {
    [].forEach.call(stage.querySelectorAll('.listen[data-id]'), function (el) {
      var id = el.getAttribute('data-id'), me = play.id === id, on = me && play.playing, pct = 0, t = '';
      if (me) {
        if (play.tts) pct = play.prog * 100;
        else if (aud.duration) { pct = aud.currentTime / aud.duration * 100; t = fmt(aud.currentTime) + ' / ' + fmt(aud.duration); }
      }
      el.classList.toggle('on', on);
      el.querySelector('.lsrc').textContent = AUD[id] ? 'Giọng người đọc' : 'Giọng máy';
      el.querySelector('.lbar i').style.width = pct + '%';
      el.querySelector('.ltime').textContent = t;
      el.querySelector('.lt').textContent = on ? 'Đang nghe' : (me && !play.tts && aud.currentTime > 0 ? 'Tạm dừng' : 'Nghe bài này');
    });
    [].forEach.call(document.querySelectorAll('[data-bl]'), function (b) { b.textContent = play.book ? 'Dừng nghe' : 'Nghe cả sách'; });
  }
  aud.addEventListener('timeupdate', syncListen);
  aud.addEventListener('loadedmetadata', syncListen);

  function stopCore() {
    ttsRun++;
    play.playing = false; play.tts = false; play.prog = 0;
    aud.onended = null; aud.onerror = null;
    try { aud.pause(); } catch (e) {}
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  }
  function stopPlay() {
    stopCore();
    play.id = null; play.book = false;
    try { aud.currentTime = 0; } catch (e) {}
    syncListen();
  }
  function withVoices(cb) {
    var ss = window.speechSynthesis, v = ss.getVoices();
    if (v.length) { cb(v); return; }
    var done = false;
    function fin() {
      if (done) return;
      done = true;
      try { ss.removeEventListener('voiceschanged', fin); } catch (e) {}
      cb(ss.getVoices());
    }
    try { ss.addEventListener('voiceschanged', fin); } catch (e) {}
    setTimeout(fin, 1200);
  }
  function giveUp(msg) {
    play.playing = false; play.id = null; play.book = false;
    showVoiceHint(msg); syncListen();
  }
  function startTTS(id, it, onEnd) {
    var ss = window.speechSynthesis;
    if (!ss || !window.SpeechSynthesisUtterance) { giveUp('Trình duyệt này không hỗ trợ đọc to. Bạn thử mở sách bằng Microsoft Edge hoặc Chrome mới nhất.'); return; }
    var run = ++ttsRun;
    play.tts = true; play.prog = 0;
    withVoices(function (vs) {
      if (run !== ttsRun) return;
      var vi = vs.filter(function (v) { return /^vi([-_]|$)/i.test(v.lang); });
      if (!vi.length) { giveUp(); return; }
      vi.sort(function (a, b) { return (/natural|online/i.test(b.name) ? 1 : 0) - (/natural|online/i.test(a.name) ? 1 : 0); });
      var hint = stage.querySelector('.voice-hint'); if (hint) hint.hidden = true;
      var n = it.chunks.length;
      try {
        it.chunks.forEach(function (t, k) {      /* chia đoạn để Chrome không tự dừng giữa chừng */
          var u = new SpeechSynthesisUtterance(t);
          u.lang = vi[0].lang; u.voice = vi[0]; u.rate = .92;
          u.onstart = function () { if (run === ttsRun) { play.prog = k / n; syncListen(); } };
          u.onerror = function (e) {
            if (run !== ttsRun) return;
            if (e.error === 'language-unavailable' || e.error === 'voice-unavailable') giveUp();
          };
          if (k === n - 1) u.onend = function () { if (run !== ttsRun) return; play.playing = false; play.prog = 1; syncListen(); if (onEnd) onEnd(); };
          ss.speak(u);
        });
      } catch (e) { giveUp(); }
    });
  }
  function startItem(id, onEnd) {
    var it = textOf(id); if (!it) return;
    stopCore();
    play.id = id; play.playing = true;
    if (AUD[id]) {
      aud.src = 'api/audio/' + id + '?v=' + AUD[id];
      aud.onended = function () { play.playing = false; syncListen(); if (onEnd) onEnd(); };
      aud.onerror = function () { delete AUD[id]; if (play.id === id) { aud.onerror = null; startTTS(id, it, onEnd); syncListen(); } };
      var pr = aud.play();
      if (pr && pr.catch) pr.catch(function (err) {
        if (err && err.name === 'NotAllowedError') { play.playing = false; syncListen(); note('Chạm nút nghe một lần nữa để phát'); }
      });
    } else startTTS(id, it, onEnd);
    syncListen();
  }
  function toggleListen(bar) {
    var id = bar.getAttribute('data-id');
    if (play.id === id && play.playing) {
      if (!play.tts) { aud.pause(); play.playing = false; syncListen(); } else stopPlay();
      return;
    }
    if (play.id === id && !play.tts && aud.currentTime > 0 && !aud.ended) { aud.play(); play.playing = true; syncListen(); return; }
    play.book = false;
    startItem(id, null);
  }
  function bookListen() {
    if (play.book) { stopPlay(); return; }
    stopPlay();
    var n = (view === 'book' && i >= FIRST && i < LAST) ? i : FIRST;
    if (n !== i || view !== 'book') { keepPlay = true; go(n, 'next'); keepPlay = false; }
    play.book = true;
    startItem(S[n - FIRST].id, bookNext);
  }
  function bookNext() {
    if (!play.book) return;
    keepPlay = true;
    if (i + 1 < LAST) { go(i + 1, 'next'); keepPlay = false; startItem(S[i - FIRST].id, bookNext); }
    else { play.book = false; go(LAST, 'next'); keepPlay = false; play.playing = false; syncListen(); }
  }

  function rainSync() {
    [].forEach.call(document.querySelectorAll('.rbtn'), function (b) { b.setAttribute('aria-pressed', String(rainOn)); });
    [].forEach.call(document.querySelectorAll('.rvol'), function (r) { r.value = rainVol; });
  }
  function rainGain() { return rainOn ? rainVol / 100 * 0.18 : 0; }
  function toggleRain(forceOn) {
    try {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        var len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
        for (var k = 0; k < len; k++) d[k] = Math.random() * 2 - 1;
        var src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
        var hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
        var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500;
        gain = ac.createGain(); gain.gain.value = 0;
        src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(ac.destination);
        src.start();
      }
      if (ac.state === 'suspended') ac.resume();
      rainOn = forceOn === true ? true : !rainOn;
      gain.gain.setTargetAtTime(rainGain(), ac.currentTime, 0.3);
      rainSync();
    } catch (e) { note('Thiết bị này chưa phát được âm thanh'); }
  }
  document.addEventListener('input', function (e) {
    if (!e.target.classList || !e.target.classList.contains('rvol')) return;
    rainVol = +e.target.value; put('tkk-rain', String(rainVol));
    if (rainVol > 0 && !rainOn) toggleRain(true);
    else if (gain) gain.gain.setTargetAtTime(rainGain(), ac.currentTime, 0.1);
    rainSync();
  });

  function closeSkin() {
    var pp = document.getElementById('skinpop'), sb = document.getElementById('skinB');
    if (pp) pp.hidden = true; if (sb) sb.setAttribute('aria-expanded', 'false');
  }
  function applySkin() {
    root.setAttribute('data-skin', skin);
    if (skin === 'sang' || skin === 'toi') root.setAttribute('data-theme', skin === 'toi' ? 'dark' : 'light'); else root.removeAttribute('data-theme');
    var pop = document.getElementById('skinpop');
    if (pop) pop.innerHTML = SKINS.map(function (k) { return '<button class="sk" data-act="skin" data-v="' + k + '" aria-pressed="' + (skin === k) + '">' + SKIN_NAME[k] + '</button>'; }).join('');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', SKIN_BAR[skin]);
  }
  applySkin();

  function toggleSave(b) {
    var ref = b.getAttribute('data-ref'), on = toggleRef(ref);
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('span').textContent = on ? 'Đã ghi tâm' : 'Ghi tâm';
    note(on ? 'Đã ghi tâm' : 'Đã bỏ khỏi Ghi tâm');
  }

  /* ---------- thẻ phương ngôn (ảnh) ---------- */
  var PAL = {
    dawn:    ['#1f1a33', '#6b3f6e', '#ffc8a0'],
    morning: ['#1b2a1d', '#6f7a2e', '#f4e28a'],
    noon:    ['#12263a', '#2f7aa3', '#bfe7ff'],
    dusk:    ['#2a1612', '#a8452a', '#ffd0a1'],
    night:   ['#0f1228', '#2b2f66', '#c9c6ff']
  };
  var cardBlob = null, cardUrl = '';
  function wrap(x, text, maxW) {
    var words = text.split(' '), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }
  function makeCard(s, done) {
    var c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    var x = c.getContext('2d'), p = PAL[s.part];
    function draw() {
      var g = x.createLinearGradient(0, 0, 0, 1350);
      g.addColorStop(0, p[0]); g.addColorStop(1, p[1]);
      x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
      var r = x.createRadialGradient(540, 1180, 20, 540, 1180, 620);
      r.addColorStop(0, p[2] + 'cc'); r.addColorStop(1, p[2] + '00');
      x.fillStyle = r; x.fillRect(0, 500, 1080, 850);
      x.fillStyle = p[2]; x.globalAlpha = .9; x.beginPath(); x.arc(540, 1180, 70, 0, 7); x.fill(); x.globalAlpha = 1;
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 1180, 1080, 170);
      x.fillStyle = p[2]; x.font = '600 30px "Be Vietnam Pro", sans-serif';
      x.textBaseline = 'alphabetic'; x.fillText(PARTS[s.part].name.toUpperCase(), 90, 150);
      x.fillStyle = '#fff';
      var size = 100, lines;
      do { x.font = '600 ' + size + 'px "Dancing Script", Fraunces, Georgia, serif'; lines = wrap(x, s.proverb.text, 900); size -= 4; }
      while (lines.length > 6 && size > 56);
      var lh = (size + 4) * 1.25, y = 340;
      lines.forEach(function (l, k) { x.fillText(l, 90, y + k * lh); });
      if (s.proverb.by) {
        x.fillStyle = p[2]; x.font = '400 34px "Be Vietnam Pro", sans-serif';
        x.fillText(s.proverb.by, 90, y + lines.length * lh + 40);
      }
      x.fillStyle = '#fff'; x.font = 'italic 400 44px Fraunces, Georgia, serif';
      x.fillText('Từng Khoảnh Khắc', 90, 1290);
      c.toBlob(function (b) { done(b); }, 'image/png');
    }
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('600 60px "Dancing Script"'), document.fonts.load('italic 400 40px Fraunces'), document.fonts.load('400 30px "Be Vietnam Pro"')]).then(draw, draw);
    } else draw();
  }
  function openCard() {
    var s = curStory; if (!s) return;
    note('Đang tạo thẻ…');
    makeCard(s, function (blob) {
      if (!blob) { note('Không tạo được thẻ lúc này'); return; }
      if (cardUrl) URL.revokeObjectURL(cardUrl);
      cardBlob = blob; cardUrl = URL.createObjectURL(blob);
      document.getElementById('shImg').src = cardUrl;
      document.getElementById('sheet').hidden = false;
    });
  }
  function shareCard() {
    if (!cardBlob) return;
    var f;
    try { f = new File([cardBlob], 'tung-khoanh-khac.png', { type: 'image/png' }); } catch (e) { f = null; }
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], title: 'Từng Khoảnh Khắc' }).catch(function () {});
    } else saveCard();
  }
  function saveCard() {
    if (!cardUrl) return;
    var a = document.createElement('a'); a.href = cardUrl; a.download = 'tung-khoanh-khac.png';
    document.body.appendChild(a); a.click(); a.remove();
    note('Nếu ảnh chưa tải, hãy nhấn giữ vào ảnh để lưu');
  }

  /* ---------- sự kiện ---------- */
  var view = 'book';
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!e.target.closest('#skinpop') && !(b && b.getAttribute('data-act') === 'skinMenu')) closeSkin();
    if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'open') go(1);
    else if (a === 'resume') go(parseInt(get('tkk-page') || '1', 10) || 1);
    else if (a === 'goto') { view = 'book'; go(parseInt(b.getAttribute('data-n'), 10)); }
    else if (a === 'next') { if (navNext) navNext(); }
    else if (a === 'prev') { if (navPrev) navPrev(); }
    else if (a === 'toc') { view = 'book'; go(1); }
    else if (a === 'refl' || a === 'menuRefl') showReflList('next');
    else if (a === 'menuRead') { view = 'book'; go(i, 'prev'); }
    else if (a === 'reflTab') showReflList(null, b.getAttribute('data-tab'), true);
    else if (a === 'reflOpen') showRefl(parseInt(b.getAttribute('data-k'), 10));
    else if (a === 'tamAdd') tamAdd();
    else if (a === 'tamCopy') tamCopy();
    else if (a === 'tamDel') {
      if (b.getAttribute('data-arm') !== '1') {
        b.setAttribute('data-arm', '1'); b.textContent = 'Bấm lần nữa để xóa';
        setTimeout(function () { if (b.isConnected) { b.removeAttribute('data-arm'); b.textContent = 'Xóa'; } }, 3000);
      } else {
        var id = b.getAttribute('data-id');
        tam.own = tam.own.filter(function (x) { return x.id !== id; });
        saveTam(); showReflList(null, 'own', true);
      }
    }
    else if (a === 'unsave') {
      toggleRef(b.getAttribute('data-ref'));
      var li = b.closest('li'), ul = li && li.parentNode;
      if (li) li.remove();
      if (ul && !ul.children.length) ul.outerHTML = savedHtml(true);
    }
    else if (a === 'task') startTask(b);
    else if (a === 'breath') startBreath(b);
    else if (a === 'save') toggleSave(b);
    else if (a === 'listen') toggleListen(b.closest('.listen'));
    else if (a === 'bookListen') bookListen();
    else if (a === 'skin') { skin = b.getAttribute('data-v'); put('tkk-skin', skin); applySkin(); closeSkin(); note('Giao diện: ' + SKIN_NAME[skin]); }
    else if (a === 'skinMenu') { var pp = document.getElementById('skinpop'); pp.hidden = !pp.hidden; b.setAttribute('aria-expanded', String(!pp.hidden)); }
    else if (a === 'rewrite') rewrite();
    else if (a === 'penpref') {
      penPref = b.getAttribute('data-v'); put('tkk-pen', penPref);
      [].forEach.call(document.querySelectorAll('[data-act="penpref"]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      note('Hiệu ứng cây bút: ' + ({ auto: 'theo thiết bị', on: 'bật', off: 'tắt' })[penPref]);
    }
    else if (a === 'card') openCard();
    else if (a === 'shShare') shareCard();
    else if (a === 'shSave') saveCard();
    else if (a === 'shClose') document.getElementById('sheet').hidden = true;
    else if (a === 'rain') toggleRain();
    else if (a === 'reload') location.reload();
    else if (a === 'install' && deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; b.hidden = true; });
    }
  });

  var sx = 0, sy = 0;
  stage.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      var f = dx < 0 ? navNext : navPrev; if (f) f();
    }
  }, { passive: true });
  document.addEventListener('keydown', function (e) {
    if (e.target && /^(TEXTAREA|INPUT)$/.test(e.target.tagName)) return;
    if (e.key === 'Escape') document.getElementById('sheet').hidden = true;
    else if (e.key === 'ArrowRight') { if (navNext) navNext(); }
    else if (e.key === 'ArrowLeft') { if (navPrev) navPrev(); }
  });

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    var b = document.querySelector('[data-act="install"]');
    if (b) b.hidden = false;
  });

  /* ---------- khởi động ---------- */
  buildScene();
  function loadJson(u, cb) {
    fetch(u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d) cb(d); }).catch(function () {});
  }
  try { var c1 = JSON.parse(get('tkk-aud') || 'null'); if (c1 && typeof c1 === 'object') AUD = c1; } catch (e) {}
  try { var c2 = JSON.parse(get('tkk-cn') || 'null'); if (c2) setRemote(c2.sections); } catch (e) {}
  go(0, 'next');
  loadJson('api/audio-list', function (d) {
    if (d.items) { AUD = d.items; put('tkk-aud', JSON.stringify(AUD)); syncListen(); }
  });
  loadJson('api/chiem-nghiem', function (d) {
    if (!Array.isArray(d.sections)) return;
    put('tkk-cn', JSON.stringify(d)); setRemote(d.sections);
    if (view === 'refl' && stage.querySelector('.refl-list')) showReflList(null, null, true);
  });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    var hadCtrl = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (hadCtrl) document.getElementById('upd').hidden = false;
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') reg.update().catch(function () {});
        });
      }).catch(function () {});
    });
  }
})();
