/* Trang quản trị: thu âm cho từng bài, thêm và sửa truyện, thêm chiêm nghiệm chung.
   Mọi thao tác ghi đều đi qua /api và chỉ chạy khi đã đăng nhập bằng mật khẩu (secret ADMIN_PASSWORD trên Cloudflare). */
(function () {
  'use strict';
  var BASE_S = window.BOOK.stories, S = BASE_S.slice(), ORDER = window.BOOK.order, PN = {};
  ORDER.forEach(function (k) { PN[k] = window.BOOK.parts[k].name; });
  var stRemote = false, stEditing = null;
  var BASE = (window.CHIEM_NGHIEM && window.CHIEM_NGHIEM.sections) || [];
  var $ = function (id) { return document.getElementById(id); };
  var AUD = {}, remote = [], editing = null;

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function slug(t) { return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function rid(s, k) { return s.id || slug(s.title || 'r' + k); }
  var nt;
  function note(m) {
    var n = $('note'); n.textContent = m; n.classList.add('show');
    clearTimeout(nt); nt = setTimeout(function () { n.classList.remove('show'); }, 2600);
  }
  function api(path, opt) {
    opt = opt || {}; opt.credentials = 'same-origin';
    return fetch('api/' + path, opt);
  }
  function fatal(msg) { var f = $('fatal'); f.textContent = msg; f.hidden = false; }
  function fatalFor(res) {
    if (res.status === 503) fatal('Máy chủ chưa được cấu hình. Cần gắn KV namespace tên STORE và đặt secret ADMIN_PASSWORD trên Cloudflare (xem README).');
    else if (res.status === 404) fatal('Trang này cần chạy trên Cloudflare Workers (có /api). Trên máy chủ tĩnh thông thường thì chưa dùng được.');
    else fatal('Có lỗi từ máy chủ (' + res.status + '). Thử tải lại trang.');
  }

  /* ---------- danh sách bài ---------- */
  function items() {
    var out = S.map(function (s) { return { id: s.id, title: s.title, group: 'Truyện', chunks: [s.title].concat(s.paras, [s.proverb.text]) }; });
    BASE.concat(remote).forEach(function (r, k) {
      out.push({ id: 'r-' + rid(r, k), title: r.title, group: 'Chiêm nghiệm', chunks: [r.title].concat(r.paras) });
    });
    return out;
  }
  var player = new Audio(), playing = null;
  function renderRec() {
    var last = '', html = '';
    items().forEach(function (it) {
      if (it.group !== last) { html += '<h2 class="h2" style="margin-top:1rem">' + it.group + '</h2>'; last = it.group; }
      var has = !!AUD[it.id];
      html += '<div class="adm-row"><span class="t">' + esc(it.title) + '</span>' +
        '<span class="st' + (has ? ' ok' : '') + '">' + (has ? 'Đã có thu' : 'Chưa thu') + '</span>' +
        '<span class="ops"><button class="mini" data-a="rec" data-id="' + it.id + '">' + (has ? 'Thu lại' : 'Thu âm') + '</button>' +
        (has ? '<button class="mini" data-a="play" data-id="' + it.id + '">' + (playing === it.id ? 'Dừng' : 'Nghe') + '</button>' +
          '<button class="mini" data-a="del" data-id="' + it.id + '">Xóa</button>' : '') + '</span></div>';
    });
    $('recList').innerHTML = html;
  }
  function loadAudio() {
    return api('audio-list?fresh=1').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d && d.items) AUD = d.items; renderRec(); });
  }

  $('recList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var id = b.getAttribute('data-id'), a = b.getAttribute('data-a');
    if (a === 'rec') openRec(id);
    else if (a === 'play') {
      if (playing === id) { player.pause(); playing = null; renderRec(); return; }
      playing = id; player.src = 'api/audio/' + id + '?v=' + AUD[id]; player.play().catch(function () {});
      player.onended = function () { playing = null; renderRec(); };
      renderRec();
    } else if (a === 'del') {
      if (b.getAttribute('data-arm') !== '1') {
        b.setAttribute('data-arm', '1'); b.textContent = 'Bấm lần nữa để xóa';
        setTimeout(function () { if (b.isConnected) { b.removeAttribute('data-arm'); b.textContent = 'Xóa'; } }, 3000);
        return;
      }
      api('audio/' + id, { method: 'DELETE' }).then(function (r) {
        if (r.ok) { delete AUD[id]; renderRec(); note('Đã xóa bản thu'); } else note('Không xóa được (' + r.status + ')');
      });
    }
  });

  /* ---------- thu âm ---------- */
  var rec = { id: null, mr: null, chunks: [], stream: null, blob: null, t0: 0, tick: 0, ac: null, raf: 0, url: '' };
  function recMsg(m) { var el = $('recMsg'); el.textContent = m || ''; el.hidden = !m; }
  function recUi(state) {
    $('recStart').hidden = state !== 'idle';
    $('recStop').hidden = state !== 'rec';
    $('recSave').hidden = state !== 'review';
    $('recAgain').hidden = state !== 'review';
    $('recPlayer').hidden = state !== 'review';
    $('rec').classList.toggle('adm-recording', state === 'rec');
  }
  function openRec(id) {
    var it = items().filter(function (x) { return x.id === id; })[0]; if (!it) return;
    if (playing) { player.pause(); playing = null; renderRec(); }
    rec.id = id; rec.blob = null; recMsg('');
    $('recTitle').textContent = it.title;
    $('recScript').innerHTML = it.chunks.slice(1).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
    $('recTime').textContent = '0:00'; $('recLevel').style.width = '0';
    recUi('idle');
    $('rec').hidden = false;
  }
  function cleanup() {
    cancelAnimationFrame(rec.raf); clearInterval(rec.tick);
    if (rec.stream) rec.stream.getTracks().forEach(function (t) { t.stop(); });
    if (rec.ac) { try { rec.ac.close(); } catch (e) {} rec.ac = null; }
    rec.stream = null;
  }
  function closeRec() {
    if (rec.mr && rec.mr.state === 'recording') { rec.mr.onstop = null; try { rec.mr.stop(); } catch (e) {} }
    cleanup();
    if (rec.url) { URL.revokeObjectURL(rec.url); rec.url = ''; }
    $('recPlayer').removeAttribute('src');
    $('rec').hidden = true;
  }
  function startRec() {
    recMsg('');
    if (!navigator.mediaDevices || !window.MediaRecorder) { recMsg('Trình duyệt này không thu âm được. Hãy dùng Chrome, Edge, Firefox hoặc Safari mới.'); return; }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (stream) {
      rec.stream = stream; rec.chunks = [];
      var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      var mt = types.filter(function (t) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); })[0] || '';
      var mr = new MediaRecorder(stream, mt ? { mimeType: mt, audioBitsPerSecond: 64000 } : { audioBitsPerSecond: 64000 });
      rec.mr = mr;
      mr.ondataavailable = function (e) { if (e.data && e.data.size) rec.chunks.push(e.data); };
      mr.onstop = function () {
        cleanup();
        rec.blob = new Blob(rec.chunks, { type: (mr.mimeType || mt || 'audio/webm') });
        if (rec.url) URL.revokeObjectURL(rec.url);
        rec.url = URL.createObjectURL(rec.blob);
        $('recPlayer').src = rec.url;
        $('recLevel').style.width = '0';
        recUi('review');
      };
      /* thanh mức âm để biết micro có nghe thấy không */
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        rec.ac = new AC();
        var an = rec.ac.createAnalyser(); an.fftSize = 512;
        rec.ac.createMediaStreamSource(stream).connect(an);
        var buf = new Uint8Array(an.fftSize);
        (function loop() {
          an.getByteTimeDomainData(buf);
          var sum = 0; for (var k = 0; k < buf.length; k++) { var v = (buf[k] - 128) / 128; sum += v * v; }
          $('recLevel').style.width = Math.min(100, Math.sqrt(sum / buf.length) * 320) + '%';
          rec.raf = requestAnimationFrame(loop);
        })();
      } catch (e) {}
      rec.t0 = Date.now();
      rec.tick = setInterval(function () {
        var s = Math.floor((Date.now() - rec.t0) / 1000);
        $('recTime').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        if (s >= 15 * 60) $('recStop').click();
      }, 250);
      mr.start(1000);
      recUi('rec');
    }).catch(function (err) {
      recMsg(err && err.name === 'NotAllowedError'
        ? 'Chưa được phép dùng micro. Hãy bấm vào biểu tượng ổ khóa cạnh địa chỉ trang, cho phép micro rồi thử lại.'
        : 'Không mở được micro. Kiểm tra micro đã cắm và không bị ứng dụng khác chiếm.');
    });
  }
  function saveRec() {
    if (!rec.blob || !rec.id) return;
    $('recSave').disabled = true; recMsg('Đang lưu…');
    api('audio/' + rec.id, { method: 'PUT', headers: { 'content-type': rec.blob.type || 'audio/webm' }, body: rec.blob })
      .then(function (r) { return r.json().then(function (d) { return { r: r, d: d }; }); })
      .then(function (x) {
        $('recSave').disabled = false;
        if (x.r.ok) { AUD[rec.id] = x.d.v; renderRec(); closeRec(); note('Đã lưu bản thu'); }
        else if (x.r.status === 401) recMsg('Phiên đăng nhập đã hết hạn. Hãy tải lại trang và đăng nhập lại.');
        else if (x.r.status === 413) recMsg('File quá lớn (tối đa 24 MB). Hãy thu ngắn hơn.');
        else recMsg('Không lưu được (' + x.r.status + ').');
      }).catch(function () { $('recSave').disabled = false; recMsg('Không kết nối được. Kiểm tra mạng rồi bấm lưu lại.'); });
  }
  $('recStart').addEventListener('click', startRec);
  $('recStop').addEventListener('click', function () { if (rec.mr && rec.mr.state === 'recording') rec.mr.stop(); });
  $('recAgain').addEventListener('click', function () { rec.blob = null; recMsg(''); $('recTime').textContent = '0:00'; recUi('idle'); });
  $('recSave').addEventListener('click', saveRec);
  $('recClose').addEventListener('click', closeRec);

  /* ---------- chiêm nghiệm chung ---------- */
  function renderCn() {
    $('cnList').innerHTML = remote.length ? remote.map(function (r, k) {
      return '<div class="adm-cn"><b>' + esc(r.title) + '</b><p>' + esc(r.paras[0]).slice(0, 140) + (r.paras[0].length > 140 ? '…' : '') + '</p>' +
        '<span class="ops"><button class="mini" data-a="edit" data-k="' + k + '">Sửa</button><button class="mini" data-a="up" data-k="' + k + '">Lên</button><button class="mini" data-a="cdel" data-k="' + k + '">Xóa</button></span></div>';
    }).join('') : '<p class="empty">Chưa có điều nào được thêm từ trang này.</p>';
    $('cnBase').innerHTML = BASE.map(function (r) { return '<div class="adm-cn"><b>' + esc(r.title) + '</b></div>'; }).join('');
  }
  function saveRemote() {
    return api('chiem-nghiem', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sections: remote }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); });
  }
  function resetCn() { editing = null; $('cnTitle').value = ''; $('cnText').value = ''; $('cnSave').textContent = 'Thêm điều này'; $('cnCancel').hidden = true; }
  $('cnForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var title = $('cnTitle').value.trim();
    var paras = $('cnText').value.split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean);
    if (!title || !paras.length) { note('Cần có tiêu đề và nội dung'); return; }
    var before = remote.slice();
    if (editing !== null) remote[editing] = { id: remote[editing].id, title: title, paras: paras };
    else {
      var taken = BASE.map(rid).concat(remote.map(function (r) { return r.id; }));
      var id = (slug(title).slice(0, 40) || 'dieu') + '-' + Math.random().toString(36).slice(2, 6);
      while (taken.indexOf(id) >= 0) id += 'x';
      remote.push({ id: id, title: title, paras: paras });
    }
    saveRemote().then(function () { renderCn(); renderRec(); resetCn(); note('Đã lưu'); })
      .catch(function () { remote = before; note('Không lưu được. Kiểm tra đăng nhập và mạng.'); });
  });
  $('cnCancel').addEventListener('click', resetCn);
  $('cnList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var k = parseInt(b.getAttribute('data-k'), 10), a = b.getAttribute('data-a'), before = remote.slice();
    if (a === 'edit') {
      editing = k; $('cnTitle').value = remote[k].title; $('cnText').value = remote[k].paras.join('\n\n');
      $('cnSave').textContent = 'Lưu thay đổi'; $('cnCancel').hidden = false; $('cnTitle').focus(); return;
    }
    if (a === 'up' && k > 0) { var t = remote[k - 1]; remote[k - 1] = remote[k]; remote[k] = t; }
    else if (a === 'cdel') {
      if (b.getAttribute('data-arm') !== '1') {
        b.setAttribute('data-arm', '1'); b.textContent = 'Bấm lần nữa để xóa';
        setTimeout(function () { if (b.isConnected) { b.removeAttribute('data-arm'); b.textContent = 'Xóa'; } }, 3000);
        return;
      }
      remote.splice(k, 1);
    } else return;
    saveRemote().then(function () { renderCn(); renderRec(); }).catch(function () { remote = before; renderCn(); note('Không lưu được.'); });
  });

  /* ---------- truyện ---------- */
  function stSort() {
    S = S.map(function (s, k) { return { s: s, k: k }; }).sort(function (a, b) {
      return ORDER.indexOf(a.s.part) - ORDER.indexOf(b.s.part) || a.k - b.k;
    }).map(function (o) { return o.s; });
  }
  function renderSt() {
    $('stState').textContent = stRemote
      ? 'Danh sách dưới đây lưu trên máy chủ và là bản người đọc đang thấy.'
      : 'Chưa sửa lần nào: đang hiện bản có sẵn trong sách. Lần lưu đầu tiên sẽ chuyển cả danh sách lên máy chủ, từ đó sửa ở đây.';
    var last = '', html = '';
    S.forEach(function (s, k) {
      if (s.part !== last) { html += '<h2 class="h2" style="margin-top:1rem">' + esc(PN[s.part]) + '</h2>'; last = s.part; }
      var same = (S[k - 1] && S[k - 1].part === s.part), sameN = (S[k + 1] && S[k + 1].part === s.part);
      html += '<div class="adm-cn"><b>' + esc(s.title) + (s.kind === 'real' ? ' · có thật' : '') + '</b><p>' + esc(s.paras[0]).slice(0, 120) + '…</p>' +
        '<span class="ops"><button class="mini" data-a="sedit" data-k="' + k + '">Sửa</button>' +
        (same ? '<button class="mini" data-a="sup" data-k="' + k + '">Lên</button>' : '') +
        (sameN ? '<button class="mini" data-a="sdown" data-k="' + k + '">Xuống</button>' : '') +
        '<button class="mini" data-a="sdel" data-k="' + k + '">Xóa</button></span></div>';
    });
    $('stList').innerHTML = html;
  }
  function saveStories() {
    stSort();
    return api('stories', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stories: S }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); stRemote = true; });
  }
  function nextStoryId() {
    var n = 0; S.forEach(function (s) { var m = /^s(\d+)$/.exec(s.id); if (m) n = Math.max(n, +m[1]); });
    return 's' + (n + 1 < 10 ? '0' : '') + (n + 1);
  }
  function resetSt() {
    stEditing = null; $('stForm').reset(); $('stSrc').hidden = true;
    $('stSave').textContent = 'Thêm truyện này'; $('stCancel').hidden = true;
  }
  $('stKind').addEventListener('change', function () { $('stSrc').hidden = !$('stKind').value; });
  $('stForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var title = $('stTitle').value.trim(), prov = $('stProv').value.trim();
    var paras = $('stText').value.split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean);
    if (!title || !paras.length || !prov) { note('Cần có tiêu đề, nội dung và phương ngôn'); return; }
    var o = { id: stEditing !== null ? S[stEditing].id : nextStoryId(), part: $('stPart').value, title: title };
    var kind = $('stKind').value;
    if (kind) {
      var url = $('stSrcUrl').value.trim(), name = $('stSrcName').value.trim();
      if (!/^https?:\/\/\S+$/i.test(url) || !name) { note('Truyện lấy từ báo cần tên nguồn và đường dẫn bắt đầu bằng https://'); return; }
      o.kind = kind;
    }
    o.paras = paras; o.proverb = { text: prov };
    if ($('stBy').value.trim()) o.proverb.by = $('stBy').value.trim();
    o.task = $('stTask').value.trim();
    if (kind) { o.source = { name: name, url: url }; if ($('stSrcIdea').value.trim()) o.source.idea = $('stSrcIdea').value.trim(); }
    var before = S.slice(), was = stRemote;
    if (stEditing !== null) S[stEditing] = o; else S.push(o);
    saveStories().then(function () { renderSt(); renderRec(); resetSt(); note('Đã lưu'); })
      .catch(function () { S = before; stRemote = was; note('Không lưu được. Kiểm tra đăng nhập và mạng.'); });
  });
  $('stCancel').addEventListener('click', resetSt);
  $('stList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var k = parseInt(b.getAttribute('data-k'), 10), a = b.getAttribute('data-a'), before = S.slice(), was = stRemote, gone = null;
    if (a === 'sedit') {
      var s = S[k]; stEditing = k;
      $('stPart').value = s.part; $('stTitle').value = s.title; $('stText').value = s.paras.join('\n\n');
      $('stProv').value = s.proverb.text; $('stBy').value = s.proverb.by || ''; $('stTask').value = s.task || '';
      $('stKind').value = s.kind || ''; $('stSrc').hidden = !s.kind;
      $('stSrcName').value = s.source ? s.source.name : ''; $('stSrcUrl').value = s.source ? s.source.url : ''; $('stSrcIdea').value = s.source && s.source.idea || '';
      $('stSave').textContent = 'Lưu thay đổi'; $('stCancel').hidden = false; $('stForm').scrollIntoView({ behavior: 'smooth' }); $('stTitle').focus(); return;
    }
    if (a === 'sup' && k > 0) { var t = S[k - 1]; S[k - 1] = S[k]; S[k] = t; }
    else if (a === 'sdown' && k < S.length - 1) { var u = S[k + 1]; S[k + 1] = S[k]; S[k] = u; }
    else if (a === 'sdel') {
      if (S.length <= 1) { note('Sách cần còn ít nhất một truyện'); return; }
      if (b.getAttribute('data-arm') !== '1') {
        b.setAttribute('data-arm', '1'); b.textContent = 'Bấm lần nữa để xóa';
        setTimeout(function () { if (b.isConnected) { b.removeAttribute('data-arm'); b.textContent = 'Xóa'; } }, 3000);
        return;
      }
      gone = S.splice(k, 1)[0];
    } else return;
    saveStories().then(function () {
      renderSt(); renderRec();
      if (gone && AUD[gone.id]) api('audio/' + gone.id, { method: 'DELETE' }).then(function () { delete AUD[gone.id]; renderRec(); });
    }).catch(function () { S = before; stRemote = was; renderSt(); note('Không lưu được.'); });
  });

  /* ---------- đăng nhập và khởi động ---------- */
  function showPanel() {
    $('login').hidden = true; $('panel').hidden = false; $('logout').hidden = false;
    Promise.all([
      loadAudio(),
      api('stories?fresh=1').then(function (r) { return r.ok ? r.json() : { stories: null }; }).then(function (d) {
        if (Array.isArray(d.stories) && d.stories.length) { S = d.stories; stRemote = true; }
        renderSt(); renderRec();
      }),
      api('chiem-nghiem?fresh=1').then(function (r) { return r.ok ? r.json() : { sections: [] }; }).then(function (d) { remote = d.sections || []; renderCn(); renderRec(); })
    ]);
  }
  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var m = $('loginMsg'); m.hidden = true;
    api('login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: $('pw').value }) })
      .then(function (r) {
        if (r.ok) { $('pw').value = ''; showPanel(); }
        else if (r.status === 401) { m.textContent = 'Mật khẩu chưa đúng.'; m.hidden = false; }
        else fatalFor(r);
      }).catch(function () { m.textContent = 'Không kết nối được.'; m.hidden = false; });
  });
  $('logout').addEventListener('click', function () {
    api('logout', { method: 'POST' }).then(function () { location.reload(); });
  });
  [].forEach.call(document.querySelectorAll('[data-tab]'), function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-tab');
      [].forEach.call(document.querySelectorAll('[data-tab]'), function (x) { x.setAttribute('aria-selected', String(x === b)); });
      $('tabRec').hidden = t !== 'rec'; $('tabSt').hidden = t !== 'st'; $('tabCn').hidden = t !== 'cn';
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('rec').hidden) closeRec(); });

  api('me').then(function (r) {
    if (!r.ok) { fatalFor(r); return null; }
    return r.json();
  }).then(function (d) {
    if (!d) return;
    if (d.admin) showPanel(); else $('login').hidden = false;
  }).catch(function () { fatal('Không kết nối được máy chủ.'); });
})();
