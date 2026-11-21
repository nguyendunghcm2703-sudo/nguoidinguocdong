(function () {
  'use strict';

  var B = window.BOOK, S = B.stories, ORDER = B.order, PARTS = B.parts;
  var X = B.reflections || { sections: [] };
  var R = X.sections;
  /* thứ tự trang: bìa, mục lục, các truyện, các điều chiêm nghiệm, trang cuối */
  var FIRST = 2, REF0 = FIRST + S.length, LAST = REF0 + R.length, TOTAL = LAST + 1;

  var ICO = {
    heart: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    speak: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/></svg>',
    card:  '<svg class="ic" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>'
  };

  var root = document.documentElement;
  var stage = document.getElementById('stage');
  var stripEl = document.getElementById('strip');
  var posEl = document.getElementById('pos');
  var prevB = document.getElementById('prev');
  var nextB = document.getElementById('next');
  var noteEl = document.getElementById('note');
  var i = 0, timers = [], saved = [], deferred = null;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  try { saved = JSON.parse(get('tkk-saved') || '[]'); } catch (e) { saved = []; }
  if (!Array.isArray(saved)) saved = [];

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
  function origin(s) {
    if (!s.source) return '';
    var a = '<a href="' + s.source.url + '" target="_blank" rel="noopener noreferrer">' + s.source.name + '</a>';
    if (s.kind === 'real') return '<p class="origin">Dựa trên câu chuyện có thật, kể lại bằng lời của sách và không nêu tên người. Nguồn: ' + a + '.</p>';
    return '<p class="origin">Truyện sáng tác, lấy ý từ bài viết: ' + a + '. ' + (s.source.idea || '') + '</p>';
  }

  var nt;
  function note(m) {
    noteEl.textContent = m; noteEl.classList.add('show');
    clearTimeout(nt); nt = setTimeout(function () { noteEl.classList.remove('show'); }, 2200);
  }
  function clearAll() { timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }

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
  var penRuns = [], penIO = null;

  function penSeen(key) {
    try {
      if (key === 'cover') return sessionStorage.getItem('tkk-pen-cover') === '1';
      return JSON.parse(get('tkk-penned') || '[]').indexOf(key) >= 0;
    } catch (e) { return false; }
  }
  function penDone(key) {
    try {
      if (key === 'cover') { sessionStorage.setItem('tkk-pen-cover', '1'); return; }
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

  function setupPen() {
    var els = [].slice.call(stage.querySelectorAll('[data-pen]'));
    if (!els.length || REDUCED || !document.body.animate) return;
    var key = i === 0 ? 'cover' : (i === LAST ? 'end' : (i >= REF0 ? 'r' + (i - REF0) : S[i - FIRST].id));
    if (penSeen(key)) return;
    els.forEach(function (el) { el.classList.add('pen-pending'); });
    if (i === 0) {
      var tm = setTimeout(function () { penWrite(els, 26, function () { penDone(key); }); }, 700);
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
        penWrite([en.target], 46, function () { if (--left === 0) penDone(key); });
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { penIO.observe(el); });
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

  function toc() {
    var cur = partNow(), ci = firstOf(cur), d = S[dayPick()];
    var parts = ORDER.map(function (k) {
      var items = S.map(function (s, n) { return { s: s, n: n }; }).filter(function (o) { return o.s.part === k; });
      return '<section class="toc-part"><h2>' + PARTS[k].name + ' · ' + PARTS[k].tag + '<span>' + PARTS[k].time + '</span></h2>' +
        '<ol class="toc-list">' + items.map(function (o) {
          return '<li><button data-act="goto" data-n="' + (o.n + FIRST) + '"><em>' + o.s.title + '</em>' +
            '<span class="tk">' + (saved.indexOf(o.s.id) >= 0 ? ICO.heart : '') + '</span></button></li>';
        }).join('') + '</ol></section>';
    }).join('');
    return '<article class="page toc">' +
      '<p class="kick">Mục lục</p>' +
      '<h1 class="h-story">Một ngày, năm chặng đường</h1>' +
      '<section class="today"><span class="t-lab">Phương ngôn hôm nay</span><q>' + d.proverb.text + '</q><span class="by">' + by(d.proverb) + '</span>' +
      '<div class="btns"><button class="chip" data-act="goto" data-n="' + (dayPick() + FIRST) + '">Đọc truyện “' + d.title + '”</button></div></section>' +
      '<button class="now" data-act="goto" data-n="' + (ci + FIRST) + '"><span class="now-t">Bây giờ ' + hhmm() + '</span><span class="now-n">Truyện hợp giờ này: “' + S[ci].title + '”</span></button>' +
      parts + reflToc() + '</article>';
  }

  function story(s) {
    var p = PARTS[s.part], on = saved.indexOf(s.id) >= 0;
    return '<article class="page story">' +
      '<p class="kick">' + p.name + ' · ' + p.time + (s.kind === 'real' ? ' · Chuyện có thật' : '') + '</p>' +
      '<h1 class="h-story">' + s.title + '</h1>' +
      '<div class="prose">' + s.paras.map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div>' +
      origin(s) +
      '<figure class="proverb"><figcaption>Phương ngôn</figcaption><blockquote class="hand" data-pen>' + s.proverb.text + '</blockquote><p class="by">' + by(s.proverb) + '</p></figure>' +
      '<section class="task"><h2>Việc nhỏ cho hôm nay</h2><p>' + s.task + '</p>' +
      '<div class="t-bar"><i></i></div><p class="t-out" role="status"></p>' +
      '<button class="btn ghost" data-act="task">Bắt đầu 1 phút</button></section>' +
      '<section class="pause"><button class="btn ghost" data-act="breath">Dừng lại một nhịp</button>' +
      '<p class="hint">10 giây hít thở trước khi sang trang.</p></section>' +
      '<div class="acts">' +
      '<button class="chip" data-act="save" data-id="' + s.id + '" aria-pressed="' + on + '">' + ICO.heart + '<span>' + (on ? 'Đã lưu' : 'Lưu vào hũ') + '</span></button>' +
      '<button class="chip" data-act="speak">' + ICO.speak + '<span>Đọc to</span></button>' +
      '<button class="chip" data-act="card">' + ICO.card + '<span>Tạo thẻ phương ngôn</span></button>' +
      '</div></article>';
  }

  function end() {
    var list = saved.map(byId).filter(Boolean);
    return '<article class="page end">' +
      '<p class="kick">Hết một ngày</p>' +
      '<h1 class="h-story">Bạn vừa đi trọn một ngày bằng đúng nhịp của mình</h1>' +
      '<p class="lead hand" data-pen>Ngày mai là một trang mới, và bạn đã sẵn sàng.</p>' +
      '<section><h2 class="h2">Hũ khoảnh khắc</h2>' +
      (list.length
        ? '<ul class="saved-list">' + list.map(function (s) { return '<li><button data-act="goto" data-n="' + (S.indexOf(s) + FIRST) + '">' + s.title + '</button></li>'; }).join('') + '</ul>'
        : '<p class="empty">Bấm “Lưu vào hũ” cuối mỗi truyện, những trang bạn thích sẽ nằm ở đây.</p>') +
      '</section>' +
      '<p class="care">Hôm nào thấy mệt, cứ làm chậm lại một chút. Nhắn cho một người bạn hay gọi về nhà cũng là một việc đáng làm.</p>' +
      '<div class="btns"><button class="btn" data-act="goto" data-n="' + FIRST + '">Đọc lại từ đầu</button><button class="btn ghost" data-act="toc">Về mục lục</button></div>' +
      '<p class="src">Các câu trích từ kinh điển (Phật giáo, Nho gia, Lão Tử, khắc kỷ) được diễn đạt lại bằng tiếng Việt hiện đại, ghi “(ý)” khi không phải bản dịch từng chữ. Truyện có nhãn “Chuyện có thật” được kể lại từ báo chí bằng lời của sách, kèm nguồn ở cuối truyện; các truyện còn lại là sáng tác.</p>' +
      '</article>';
  }

  function reflToc() {
    if (!R.length) return '';
    return '<section class="toc-part"><h2>Cuối sách · Chiêm nghiệm<span>' + R.length + ' điều</span></h2><ol class="toc-list">' +
      R.map(function (s, k) {
        return '<li><button data-act="goto" data-n="' + (REF0 + k) + '"><em>' + s.title + '</em><span class="tk"></span></button></li>';
      }).join('') + '</ol></section>';
  }

  function reflection(k) {
    var sec = R[k], last = k === R.length - 1, c = X.closing, sp = X.spirit || [];
    return '<article class="page refl">' +
      '<p class="kick">Chiêm nghiệm · ' + (k + 1) + ' trong ' + R.length + '</p>' +
      '<h1 class="h-story">' + sec.title + '</h1>' +
      '<div class="refl-body">' + sec.paras.map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div>' +
      (last && c ? '<figure class="proverb"><figcaption>' + c.label + '</figcaption><blockquote class="hand" data-pen>' + c.text + '</blockquote><p class="by">' + c.by + '</p></figure>' : '') +
      (last && sp.length ? '<ul class="spirit">' + sp.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' : '') +
      '</article>';
  }

  function pageHtml(n) {
    if (n === 0) return cover();
    if (n === 1) return toc();
    if (n === LAST) return end();
    if (n >= REF0) return reflection(n - REF0);
    return story(S[n - FIRST]);
  }

  function drawStrip() {
    var cur = -1;
    if (i >= FIRST && i < REF0) cur = ORDER.indexOf(S[i - FIRST].part);
    else if (i >= REF0) cur = ORDER.length - 1;
    stripEl.innerHTML = ORDER.map(function (k, n) {
      return '<li><button class="seg' + (n <= cur ? ' on' : '') + (n === cur ? ' cur' : '') + '" data-act="goto" data-n="' + (firstOf(k) + FIRST) + '" aria-label="' + PARTS[k].name + '">' +
        '<span class="bar"></span><span class="lbl">' + PARTS[k].name + '</span></button></li>';
    }).join('');
  }

  function go(n, dir) {
    n = Math.max(0, Math.min(LAST, n));
    dir = dir || (n >= i ? 'next' : 'prev');
    clearAll();
    penStop();
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    i = n; put('tkk-page', String(i));
    var key = (i >= FIRST && i < REF0) ? S[i - FIRST].part : (i >= REF0 ? 'night' : partNow());
    root.setAttribute('data-part', key);
    document.body.classList.toggle('reading', i > 0);
    stage.innerHTML = pageHtml(i);
    if (stage.firstElementChild) stage.firstElementChild.classList.add('turn-' + dir);
    setupPen();
    drawStrip();
    posEl.textContent = 'Trang ' + (i + 1) + ' / ' + TOTAL;
    prevB.style.visibility = i === 0 ? 'hidden' : 'visible';
    nextB.style.visibility = i === LAST ? 'hidden' : 'visible';
    window.scrollTo(0, 0);
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

  function speak() {
    var ss = window.speechSynthesis;
    if (!ss) { note('Thiết bị này chưa hỗ trợ đọc to'); return; }
    if (ss.speaking) { ss.cancel(); return; }
    var s = S[i - FIRST];
    try {
      var u = new SpeechSynthesisUtterance([s.title].concat(s.paras, [s.proverb.text]).join('. '));
      u.lang = 'vi-VN'; u.rate = .92;
      ss.speak(u);
    } catch (e) { note('Không đọc to được lúc này'); }
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
    var id = b.getAttribute('data-id'), k = saved.indexOf(id);
    if (k < 0) saved.push(id); else saved.splice(k, 1);
    put('tkk-saved', JSON.stringify(saved));
    b.setAttribute('aria-pressed', String(k < 0));
    b.querySelector('span').textContent = k < 0 ? 'Đã lưu' : 'Lưu vào hũ';
    note(k < 0 ? 'Đã cất vào hũ khoảnh khắc' : 'Đã bỏ khỏi hũ');
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
    var s = S[i - FIRST];
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
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'open') go(1);
    else if (a === 'resume') go(parseInt(get('tkk-page') || '1', 10) || 1);
    else if (a === 'goto') go(parseInt(b.getAttribute('data-n'), 10));
    else if (a === 'next') go(i + 1, 'next');
    else if (a === 'prev') go(i - 1, 'prev');
    else if (a === 'toc') go(1);
    else if (a === 'task') startTask(b);
    else if (a === 'breath') startBreath(b);
    else if (a === 'save') toggleSave(b);
    else if (a === 'speak') speak();
    else if (a === 'card') openCard();
    else if (a === 'shShare') shareCard();
    else if (a === 'shSave') saveCard();
    else if (a === 'shClose') document.getElementById('sheet').hidden = true;
    else if (a === 'rain') toggleRain();
    else if (a === 'theme') cycleTheme();
    else if (a === 'install' && deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; b.hidden = true; });
    }
  });

  var sx = 0, sy = 0;
  stage.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) go(i + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
  }, { passive: true });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.getElementById('sheet').hidden = true;
    else if (e.key === 'ArrowRight') go(i + 1, 'next');
    else if (e.key === 'ArrowLeft') go(i - 1, 'prev');
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
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
