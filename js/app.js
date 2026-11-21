(function () {
  'use strict';

  var B = window.BOOK, S = B.stories, ORDER = B.order, PARTS = B.parts;
  var X = window.CHIEM_NGHIEM || { sections: [] };
  var R = X.sections || [];
  /* trang sách: 0 bìa, 1 mục lục, 2... các truyện, LAST trang cuối.
     Chiêm nghiệm và Ghi tâm là khu riêng, không nằm trong dòng lật trang. */
  var FIRST = 2, LAST = FIRST + S.length, TOTAL = LAST + 1;

  var ICO = {
    heart: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    speak: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/></svg>',
    card:  '<svg class="ic" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
    pen:   '<svg class="ic" viewBox="0 0 24 24"><path d="M3 21l3.6-.9L19.4 7.3a2.2 2.2 0 0 0-3.1-3.1L3.5 17z"/><path d="M14.5 6l3.5 3.5"/></svg>'
  };

  var root = document.documentElement;
  var stage = document.getElementById('stage');
  var stripEl = document.getElementById('strip');
  var posEl = document.getElementById('pos');
  var prevB = document.getElementById('prev');
  var nextB = document.getElementById('next');
  var noteEl = document.getElementById('note');
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
    var r = rnd(seed), W = 1600, step = W / n, out = '';
    for (var k = 0; k < n; k++) {
      var x = k * step + (r() - .5) * step * .55, sc = s * (.9 + r() * .24);
      out += '<use href="#fig" transform="translate(' + x.toFixed(1) + ' ' + y + ') scale(' + sc.toFixed(2) + ')"/>';
    }
    return '<g>' + out + '</g><g transform="translate(-1600 0)">' + out + '</g>';
  }
  function buildScene() {
    var far = document.getElementById('crowdFar'), near = document.getElementById('crowdNear');
    if (far) far.innerHTML = crowd(24, 336, .62, 7);
    if (near) near.innerHTML = crowd(13, 352, 1, 3);
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
    var items = [], t = 0, over = false, raf = 0, t0 = 0, anims, run;
    var nib = document.createElement('i');
    els.forEach(function (el) {
      var text = el.textContent;
      el.setAttribute('aria-label', text);
      el.classList.remove('pen-pending');
      el.innerHTML = text.split(' ').map(function (w) { return '<span class="w" aria-hidden="true">' + w + '</span>'; }).join(' ');
      [].forEach.call(el.querySelectorAll('.w'), function (sp) {
        var d = Math.max(140, sp.textContent.length * speed);
        items.push({ sp: sp, start: t, dur: d });
        t += d;
      });
      t += 380;
    });
    var total = t;
    nib.className = 'nib'; nib.setAttribute('aria-hidden', 'true');
    nib.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M3 21l3.6-.9L19.4 7.3a2.2 2.2 0 0 0-3.1-3.1L3.5 17z" fill="var(--paper)" stroke="var(--ac)" stroke-width="1.8" stroke-linejoin="round"/><path d="M14.5 6l3.5 3.5" stroke="var(--ac)" stroke-width="1.8"/></svg>';
    stage.appendChild(nib);
    anims = items.map(function (it) {
      return it.sp.animate(
        [{ clipPath: 'inset(-25% 100% -25% -2%)' }, { clipPath: 'inset(-25% -6% -25% -2%)' }],
        { duration: it.dur, delay: it.start, easing: 'linear', fill: 'both' });
    });
    function finish() {
      if (over) return;
      over = true;
      cancelAnimationFrame(raf);
      anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
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
        var r = cur.sp.getBoundingClientRect(), s = stage.getBoundingClientRect(), p = (e - cur.start) / cur.dur;
        nib.style.transform = 'translate(' + (r.left - s.left + r.width * p - 3) + 'px,' + (r.bottom - s.top - 20) + 'px)';
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
    var left = els.length;
    penIO = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        penIO.unobserve(en.target);
        penWrite([en.target], 46, function () { if (--left === 0 && key) penDone(key); });
      });
    }, { threshold: 0.6 });
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

  function cover() {
    var last = parseInt(get('tkk-page') || '0', 10);
    var resume = last >= FIRST && last <= LAST;
    return '<article class="page cover">' +
      '<p class="kick">Lời động viên cho từng ngày</p>' +
      '<h1 class="h-story">Từng <em>Khoảnh Khắc</em></h1>' +
      '<blockquote class="epi hand"><p data-pen>Cuộc đời có lẽ không cần chúng ta phải hiểu hết mọi người, cũng không cần mọi người phải hiểu mình.</p><p data-pen>Điều quan trọng là hiểu đủ để không làm tổn thương người khác, tỉnh táo đủ để không đánh mất chính mình và khiêm nhường đủ để biết rằng mình vẫn còn nhiều điều phải học.</p></blockquote>' +
      '<div class="btns"><button class="btn" data-act="open">Mở sách</button>' +
      (resume ? '<button class="btn ghost" data-act="resume">Đọc tiếp trang ' + (last + 1) + '</button>' : '') +
      '<button class="btn ghost" data-act="install" ' + (deferred ? '' : 'hidden') + '>Cài lên màn hình</button></div>' +
      '<p class="foot">' + S.length + ' truyện · đọc được khi không có mạng' + (installHint() ? ' · ' + installHint() : '') + '</p>' +
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
      '<button class="dcard" data-act="refl"><b>Chiêm nghiệm</b><em>Những điều chiêm nghiệm về cuộc đời</em><small>' + R.length + ' điều, đọc chậm từng điều</small></button>' +
      '<button class="dcard" data-act="tam"><b>Ghi tâm</b><em>Điều bạn giữ lại và tự viết</em><small>' + (tam.saved.length + tam.own.length) + ' mục</small></button>' +
      '</div>' +
      '<button class="now" data-act="goto" data-n="' + (ci + FIRST) + '"><span class="now-t">Bây giờ ' + hhmm() + '</span><span class="now-n">Truyện hợp giờ này: “' + S[ci].title + '”</span></button>' +
      parts + penPrefHtml() + '</article>';
  }

  function story(s) {
    var p = PARTS[s.part], on = isSaved('s:' + s.id);
    return '<article class="page story">' +
      '<p class="kick">' + p.name + ' · ' + p.time + (s.kind === 'real' ? ' · Chuyện có thật' : '') + '</p>' +
      '<h1 class="h-story">' + s.title + '</h1>' +
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
      '<button class="chip" data-act="speak">' + ICO.speak + '<span>Đọc to</span></button>' +
      '<button class="chip" data-act="card">' + ICO.card + '<span>Tạo thẻ phương ngôn</span></button>' +
      '</div>' +
      '<p class="voice-hint" id="voiceHint" role="status" hidden></p>' +
      '</article>';
  }

  function end() {
    return '<article class="page end">' +
      '<p class="kick">Hết một ngày</p>' +
      '<h1 class="h-story">Bạn vừa đi trọn một ngày bằng đúng nhịp của mình</h1>' +
      '<p class="lead hand" data-pen>Ngày mai là một trang mới, và bạn đã sẵn sàng.</p>' +
      '<section><h2 class="h2">Đã ghi tâm</h2>' + savedHtml(false) + '</section>' +
      '<p class="care">Hôm nào thấy mệt, cứ làm chậm lại một chút. Nhắn cho một người bạn hay gọi về nhà cũng là một việc đáng làm.</p>' +
      '<div class="btns"><button class="btn" data-act="refl">Đọc những điều chiêm nghiệm</button><button class="btn ghost" data-act="goto" data-n="' + FIRST + '">Đọc lại từ đầu</button><button class="btn ghost" data-act="tam">Mở Ghi tâm</button></div>' +
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
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    var y = window.scrollY;
    root.setAttribute('data-part', o.part);
    document.body.classList.toggle('reading', !o.cover);
    stage.innerHTML = html;
    if (!o.keep && stage.firstElementChild) stage.firstElementChild.classList.add('turn-' + (o.dir || 'next'));
    setupPen(o.penKey, !!o.penAlways);
    drawStrip(o.cur);
    posEl.textContent = o.pos;
    navPrev = o.prev || null; navNext = o.next || null;
    prevB.style.visibility = navPrev ? 'visible' : 'hidden';
    nextB.style.visibility = navNext ? 'visible' : 'hidden';
    window.scrollTo(0, o.keep ? y : 0);
  }

  function go(n, dir) {
    n = Math.max(0, Math.min(LAST, n));
    dir = dir || (n >= i ? 'next' : 'prev');
    i = n; put('tkk-page', String(i));
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

  /* ---------- khu Chiêm nghiệm ---------- */
  function showReflList(dir) {
    curStory = null;
    var c = X.closing, sp = X.spirit || [];
    var html = '<article class="page refl">' +
      '<p class="kick">Chiêm nghiệm</p>' +
      '<h1 class="h-story">Những điều chiêm nghiệm về cuộc đời</h1>' +
      '<p class="lead">Đọc chậm, từng điều một. Điều nào chạm vào bạn, hãy ghi tâm.</p>' +
      '<ol class="toc-list refl-list">' + R.map(function (s, k) {
        return '<li><button data-act="reflOpen" data-k="' + k + '"><em>' + esc(s.title) + '</em><span class="tk">' + (isSaved('r:' + rid(s, k)) ? ICO.heart : '') + '</span></button></li>';
      }).join('') + '</ol>' +
      (c ? '<figure class="proverb"><figcaption>' + esc(c.label) + '</figcaption><blockquote class="hand" data-pen>' + esc(c.text) + '</blockquote><p class="by">' + esc(c.by) + '</p>' +
        '<button class="chip pen-btn" data-act="rewrite">' + ICO.pen + '<span>Viết lại</span></button></figure>' : '') +
      (sp.length ? '<ul class="spirit">' + sp.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
      '<p class="src">Muốn viết điều chiêm nghiệm của riêng mình? Hãy mở Ghi tâm.</p>' +
      '<div class="btns"><button class="btn ghost" data-act="tam">Mở Ghi tâm</button><button class="btn ghost" data-act="toc">Về mục lục</button></div>' +
      '</article>';
    view = 'refl';
    mount(html, {
      part: 'night', cur: -1, dir: dir || 'next', pos: 'Chiêm nghiệm',
      prev: function () { go(1, 'prev'); },
      next: R.length ? function () { showRefl(0, 'next'); } : null,
      penKey: 'refl-list'
    });
  }

  function showRefl(k, dir) {
    var s = R[k]; if (!s) { showReflList(dir); return; }
    var ref = 'r:' + rid(s, k), on = isSaved(ref);
    curStory = null; view = 'refl';
    var html = '<article class="page refl">' +
      '<p class="kick">Chiêm nghiệm · ' + (k + 1) + ' trong ' + R.length + '</p>' +
      '<h1 class="h-story">' + esc(s.title) + '</h1>' +
      '<div class="refl-body">' + s.paras.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>' +
      '<div class="acts"><button class="chip" data-act="save" data-ref="' + ref + '" aria-pressed="' + on + '">' + ICO.heart + '<span>' + (on ? 'Đã ghi tâm' : 'Ghi tâm') + '</span></button></div>' +
      '</article>';
    mount(html, {
      part: 'night', cur: -1, dir: dir || 'next', pos: 'Chiêm nghiệm ' + (k + 1) + ' / ' + R.length,
      prev: function () { if (k > 0) showRefl(k - 1, 'prev'); else showReflList('prev'); },
      next: function () { if (k < R.length - 1) showRefl(k + 1, 'next'); else showReflList('next'); }
    });
  }

  /* ---------- khu Ghi tâm ---------- */
  function showTam(keep) {
    curStory = null; view = 'tam';
    var own = tam.own.map(function (e) {
      return '<li class="entry"><p>' + esc(e.text).replace(/\n/g, '<br>') + '</p><div class="entry-foot"><span>' + new Date(e.ts).toLocaleDateString('vi-VN') + '</span>' +
        '<button class="mini" data-act="tamDel" data-id="' + e.id + '">Xóa</button></div></li>';
    }).join('');
    var html = '<article class="page tam">' +
      '<p class="kick">Ghi tâm</p>' +
      '<h1 class="h-story">Những điều bạn giữ trong lòng</h1>' +
      '<p class="lead">Viết xuống điều bạn nghiệm ra hôm nay, hoặc giữ lại những trang đã chạm vào bạn.</p>' +
      '<section class="tam-form"><label class="h2" for="tamText">Điều bạn chiêm nghiệm hôm nay</label>' +
      '<textarea id="tamText" rows="4" maxlength="800" placeholder="Một câu thôi cũng được…"></textarea>' +
      '<div class="btns"><button class="btn" data-act="tamAdd">Ghi tâm</button></div></section>' +
      '<section><h2 class="h2">Điều của riêng bạn</h2>' +
      (own ? '<ul class="entries">' + own + '</ul>' : '<p class="empty">Chưa có điều nào. Điều bạn viết ở trên sẽ nằm ở đây.</p>') + '</section>' +
      '<section><h2 class="h2">Đã ghi tâm</h2>' + savedHtml(true) + '</section>' +
      '<div class="btns"><button class="btn ghost" data-act="tamCopy">Sao chép tất cả</button><button class="btn ghost" data-act="toc">Về mục lục</button></div>' +
      '<p class="src">Mọi thứ ở đây chỉ lưu trên thiết bị này. Xóa dữ liệu trình duyệt hoặc đổi máy thì sẽ mất, nên hãy bấm “Sao chép tất cả” để giữ một bản.</p>' +
      '</article>';
    mount(html, {
      part: 'night', cur: -1, keep: !!keep, pos: 'Ghi tâm',
      prev: function () { go(1, 'prev'); }, next: null
    });
  }
  function tamAdd() {
    var ta = document.getElementById('tamText');
    var text = ta ? ta.value.trim() : '';
    if (!text) { note('Hãy viết vài chữ trước nhé'); return; }
    tam.own.unshift({ id: Date.now().toString(36), text: text, ts: Date.now() });
    saveTam();
    showTam(true);
    note('Đã ghi tâm');
  }
  function tamCopy() {
    var lines = [];
    if (tam.own.length) {
      lines.push('ĐIỀU CỦA RIÊNG TÔI');
      tam.own.forEach(function (e) { lines.push('- ' + e.text + ' (' + new Date(e.ts).toLocaleDateString('vi-VN') + ')'); });
    }
    var sv = tam.saved.map(refInfo).filter(Boolean);
    if (sv.length) {
      lines.push('', 'ĐÃ GHI TÂM');
      sv.forEach(function (x) { lines.push('- ' + x.title + ' (' + x.kind + ')'); });
    }
    if (!lines.length) { note('Chưa có gì để sao chép'); return; }
    var txt = lines.join('\n');
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
  var VOICE_MSG = 'Trình duyệt này chưa có giọng đọc tiếng Việt. Bạn có thể mở sách bằng Microsoft Edge, hoặc cài giọng Việt: trên Windows vào Cài đặt, Thời gian và ngôn ngữ, Giọng nói, rồi Thêm giọng; trên Android cài Google Text-to-speech và tải giọng Tiếng Việt.';
  function showVoiceHint(msg) {
    var el = document.getElementById('voiceHint');
    if (!el) { note('Chưa đọc to được trên thiết bị này'); return; }
    el.textContent = msg || VOICE_MSG; el.hidden = false;
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
  function speak() {
    var ss = window.speechSynthesis;
    if (!ss || !window.SpeechSynthesisUtterance) { showVoiceHint('Trình duyệt này không hỗ trợ đọc to. Bạn thử mở sách bằng Microsoft Edge hoặc Chrome mới nhất.'); return; }
    if (ss.speaking) { ss.cancel(); return; }
    var s = curStory; if (!s) return;
    withVoices(function (vs) {
      var vi = vs.filter(function (v) { return /^vi([-_]|$)/i.test(v.lang); });
      if (!vi.length) { showVoiceHint(); return; }
      vi.sort(function (a, b) { return (/natural|online/i.test(b.name) ? 1 : 0) - (/natural|online/i.test(a.name) ? 1 : 0); });
      var el = document.getElementById('voiceHint'); if (el) el.hidden = true;
      try {
        [s.title].concat(s.paras, [s.proverb.text]).forEach(function (t) {   /* chia đoạn để Chrome không tự dừng giữa chừng */
          var u = new SpeechSynthesisUtterance(t);
          u.lang = vi[0].lang; u.voice = vi[0]; u.rate = .92;
          u.onerror = function (e) { if (e.error === 'language-unavailable' || e.error === 'voice-unavailable') showVoiceHint(); };
          ss.speak(u);
        });
      } catch (e) { showVoiceHint(); }
    });
  }

  var ac, gain, rainOn = false;
  function toggleRain() {
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
      rainOn = !rainOn;
      gain.gain.setTargetAtTime(rainOn ? 0.09 : 0, ac.currentTime, 0.4);
      document.getElementById('rainB').setAttribute('aria-pressed', String(rainOn));
      note(rainOn ? 'Tiếng mưa: bật' : 'Tiếng mưa: tắt');
    } catch (e) { note('Thiết bị này chưa phát được âm thanh'); }
  }

  var THEMES = ['auto', 'light', 'dark'];
  var THEME_NAME = { auto: 'theo thiết bị', light: 'sáng', dark: 'tối' };
  var theme = get('tkk-theme');
  if (THEMES.indexOf(theme) < 0) theme = 'auto';
  if (theme !== 'auto') root.setAttribute('data-theme', theme);
  function cycleTheme() {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    if (theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme);
    put('tkk-theme', theme);
    note('Giao diện: ' + THEME_NAME[theme]);
  }

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
    if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'open') go(1);
    else if (a === 'resume') go(parseInt(get('tkk-page') || '1', 10) || 1);
    else if (a === 'goto') { view = 'book'; go(parseInt(b.getAttribute('data-n'), 10)); }
    else if (a === 'next') { if (navNext) navNext(); }
    else if (a === 'prev') { if (navPrev) navPrev(); }
    else if (a === 'toc') { view = 'book'; go(1); }
    else if (a === 'refl') showReflList();
    else if (a === 'reflOpen') showRefl(parseInt(b.getAttribute('data-k'), 10));
    else if (a === 'tam') showTam();
    else if (a === 'tamAdd') tamAdd();
    else if (a === 'tamCopy') tamCopy();
    else if (a === 'tamDel') {
      if (b.getAttribute('data-arm') !== '1') {
        b.setAttribute('data-arm', '1'); b.textContent = 'Bấm lần nữa để xóa';
        setTimeout(function () { if (b.isConnected) { b.removeAttribute('data-arm'); b.textContent = 'Xóa'; } }, 3000);
      } else {
        var id = b.getAttribute('data-id');
        tam.own = tam.own.filter(function (x) { return x.id !== id; });
        saveTam(); showTam(true);
      }
    }
    else if (a === 'unsave') { toggleRef(b.getAttribute('data-ref')); showTam(true); }
    else if (a === 'task') startTask(b);
    else if (a === 'breath') startBreath(b);
    else if (a === 'save') toggleSave(b);
    else if (a === 'speak') speak();
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
    else if (a === 'theme') cycleTheme();
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
  go(0, 'next');
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
