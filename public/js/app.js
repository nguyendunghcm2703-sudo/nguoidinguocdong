(function () {
  'use strict';
  var L = window.Lunar;
  // build.js thay chuỗi này khi deploy; chạy trực tiếp từ src/ thì hiện "dev"
  var APP_VERSION = '__APP_VERSION__';
  if (APP_VERSION.indexOf('__') === 0) APP_VERSION = 'dev';

  /* ---------- Hằng số & tiện ích ---------- */
  var KEY_CACHE = 'gp_cache_v1', KEY_OK = 'gp_ok_v1', KEY_PW = 'gp_pw_v1', KEY_COL = 'gp_col_v1';
  var DOW = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  var LOTUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8c2.3 2.4 3.3 4 3.3 5.4a3.3 3.3 0 0 1-6.6 0c0-1.4 1-3 3.3-5.4z" fill="#F59E0B"/><path d="M12 4.6c1 1.2 1.5 2 1.5 2.7a1.5 1.5 0 0 1-3 0c0-.7.5-1.5 1.5-2.7z" fill="#FDE68A"/><path d="M12 10.5v2" stroke="#5b3a1a" stroke-width="1.4" stroke-linecap="round"/><rect x="8" y="12.3" width="8" height="8.6" rx="1.4" fill="#FFF3D6" stroke="#B3801F" stroke-width="1.2"/><path d="M6 22.2h12" stroke="#B3801F" stroke-width="1.6" stroke-linecap="round"/></svg>';

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var LS = {
    get: function (k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  var emptyTree = function () { return { roots: [], people: [] }; };

  // Luôn tính theo giờ Việt Nam (UTC+7)
  function vnToday() {
    var t = new Date(Date.now() + 7 * 3600 * 1000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }
  function fold(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd'); }

  var state = {
    tab: 'tree', today: vnToday(),
    tree: emptyTree(), version: 0, loaded: false, locked: false, offline: false,
    viewPw: null, edit: false, editPw: null,
    dirty: false, saving: false, rev: 0,
    tsel: null, troot: null, collapsed: {}, installEvt: null
  };
  var dlg = $('#dlg');

  /* ---------- Lịch âm: ngày giỗ = trước ngày mất 1 ngày ---------- */
  function resolveLunar(d, m, ly, leap) {
    var r = null;
    if (leap) r = L.lunarToSolar(d, m, ly, true);
    if (!r) r = L.lunarToSolar(d, m, ly, false);
    if (!r) return d > 29 ? resolveLunar(d - 1, m, ly, leap) : null;
    var b = L.solarToLunar(r.d, r.m, r.y);
    if (b.m !== m || b.d !== d) return d > 29 ? resolveLunar(d - 1, m, ly, leap) : null; // tháng thiếu: lùi về 29
    return r;
  }
  function deathLunar(p) {
    var dd = p.dead && p.death; if (!dd) return null;
    return { d: dd.d, m: dd.m, y: dd.y || null, leap: !!dd.leap };
  }
  // Lần giỗ gần nhất (từ hôm nay trở đi): { date (dương), dd (số ngày còn lại), n (giỗ lần thứ n) }
  function gioNext(dl, from) {
    var ly0 = L.solarToLunar(from.d, from.m, from.y).y, best = null;
    for (var ly = Math.max(ly0 - 1, dl.y ? dl.y + 1 : 0); ly <= ly0 + 2; ly++) {
      var r = resolveLunar(dl.d, dl.m, ly, dl.leap); if (!r) continue;
      var g = L.addDays(r, -1), dd = L.diff(from, g);
      if (dd >= 0 && (!best || dd < best.dd)) best = { date: g, dd: dd, n: dl.y ? ly - dl.y : null };
    }
    return best;
  }
  function lunarOf(date) { return L.solarToLunar(date.d, date.m, date.y); }
  function lunTxt(l) { return l.d + '/' + l.m + (l.leap ? ' nhuận' : '') + ' âm'; }

  /* ---------- Dữ liệu cây ---------- */
  function personById(id) { var a = state.tree.people; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function rootById(id) { return state.tree.roots.filter(function (r) { return r.id === id; })[0] || null; }
  function headOf(p) { return p.isSpouse && p.spouse ? (personById(p.spouse) || p) : p; }
  function childrenOf(hid) { return state.tree.people.filter(function (x) { return x.parent === hid && !x.isSpouse; }); }
  function rootDepth(p) {
    var h = headOf(p), depth = 0, guard = 0;
    while (h.parent && guard++ < 80) { var up = personById(h.parent); if (!up) break; h = headOf(up); depth++; }
    var r = state.tree.roots.filter(function (x) { return x.personId === h.id; })[0] || null;
    return { root: r, depth: depth };
  }
  function genOf(p) { var rd = rootDepth(p); return rd.root ? rd.root.gen + rd.depth : null; }
  function descOf(root, gen) {
    var a = [root.clan, root.branch].filter(Boolean).join(' ');
    return (a ? a + ' · ' : '') + 'đời thứ ' + gen;
  }
  function collect(hid, out, seen) {
    seen = seen || {};
    if (seen[hid]) return out; seen[hid] = 1;
    var h = personById(hid); if (!h) return out;
    out.push(h.id); if (h.spouse) out.push(h.spouse);
    childrenOf(hid).forEach(function (c) { collect(c.id, out, seen); });
    return out;
  }
  // duyệt các "đầu" (người không phải vợ/chồng nhập vào) của một nhánh
  function walk(hid, fn, depth, seen) {
    seen = seen || {}; depth = depth || 0;
    if (seen[hid]) return; seen[hid] = 1;
    var h = personById(hid); if (!h) return;
    fn(h, depth);
    childrenOf(hid).forEach(function (c) { walk(c.id, fn, depth + 1, seen); });
  }

  function sanitizeTree(t) {
    if (!t || !Array.isArray(t.people) || !Array.isArray(t.roots)) return null;
    var int = function (v, a, b) { var n = parseInt(v, 10); return n >= a && n <= b ? n : null; };
    var str = function (v, n) { return typeof v === 'string' ? v.trim().slice(0, n) : ''; };
    var people = t.people.slice(0, 5000).map(function (x) {
      if (!x || typeof x.id !== 'string' || x.id.length > 60 || !str(x.name, 60)) return null;
      var death = null;
      if (x.dead && x.death && int(x.death.d, 1, 31) && int(x.death.m, 1, 12)) {
        var dd = x.death, d = int(dd.d, 1, 31), m = int(dd.m, 1, 12), y = int(dd.y, 1000, 2199);
        if (dd.cal === 'solar') { // dữ liệu cũ nhập ngày mất theo dương lịch: đổi sang âm lịch
          var Y = y || state.today.y;
          if (d <= L.daysInMonth(m, Y)) { var l = L.solarToLunar(d, m, Y); death = { d: l.d, m: l.m, y: y ? l.y : null, leap: !!l.leap }; }
        } else death = { d: d, m: m, y: y, leap: !!dd.leap };
      }
      return {
        id: x.id, name: str(x.name, 60), sex: x.sex === 'f' ? 'f' : 'm', note: str(x.note, 60),
        bd: int(x.bd, 1, 31), bm: int(x.bm, 1, 12), by: int(x.by, 1000, 2199),
        dead: !!death, death: death,
        spouse: typeof x.spouse === 'string' ? x.spouse : null, isSpouse: !!x.isSpouse,
        parent: typeof x.parent === 'string' ? x.parent : null
      };
    }).filter(Boolean);
    var roots = t.roots.slice(0, 200).map(function (r) {
      if (!r || typeof r.id !== 'string' || typeof r.personId !== 'string') return null;
      return { id: r.id, name: str(r.name, 30) || 'Nhánh', clan: str(r.clan, 30), branch: str(r.branch, 30), gen: int(r.gen, 1, 99) || 1, personId: r.personId };
    }).filter(Boolean);
    return { roots: roots, people: people };
  }

  /* ---------- Đồng bộ với máy chủ (Cloudflare Worker + KV) ---------- */
  function api(method, path, pw, body) {
    var o = { method: method, cache: 'no-store', headers: { 'X-Password': encodeURIComponent(pw || '') } };
    if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(path, o).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, data: d || {} }; });
    });
  }
  function errText(r) {
    if (r.status === 401) return 'Sai mật khẩu.';
    if (r.status === 429) return 'Nhập sai quá nhiều lần. Hãy thử lại sau khoảng 10 phút.';
    if (r.status === 503) return 'Máy chủ chưa được cấu hình mật khẩu hoặc KV (xem README).';
    return 'Máy chủ gặp lỗi (' + r.status + '). Hãy thử lại.';
  }
  function saveCache() { LS.set(KEY_CACHE, { version: state.version, tree: state.tree }); LS.set(KEY_OK, true); }
  function saveCol() { LS.set(KEY_COL, state.collapsed); }

  function applyServer(data) {
    var t = sanitizeTree(data.tree) || emptyTree();
    state.tree = t; state.version = data.version || 0; state.loaded = true; state.offline = false;
    if (state.tsel && !personById(state.tsel)) state.tsel = null;
    if (!rootById(state.troot)) state.troot = t.roots.length ? t.roots[0].id : null;
    if (!state.colInit && t.people.length > 40) autoCollapse();
    saveCache();
  }
  // lần đầu mở cây lớn: thu gọn từ đời thứ 4 trở xuống
  function autoCollapse() {
    var col = {};
    state.tree.roots.forEach(function (r) { walk(r.personId, function (h, depth) { if (depth >= 3 && childrenOf(h.id).length) col[h.id] = 1; }); });
    state.collapsed = col; state.colInit = true; saveCol();
  }

  function refresh(manual) {
    var pw = state.viewPw || state.editPw;
    if (!pw) {
      if (manual) askPw('Nhập mật khẩu để cập nhật', 'Mật khẩu xem hoặc mật khẩu sửa.', function (p) { return fetchTree(p, true); });
      return;
    }
    if (state.dirty) { if (manual) toast('Còn thay đổi chưa lưu, hãy lưu trước.'); return; }
    fetchTree(pw, manual).then(function (msg) { if (msg && manual) toast(msg); });
  }
  // trả về Promise<null | thông báo lỗi>
  function fetchTree(pw, manual) {
    return api('GET', '/api/tree' + (state.loaded ? '?v=' + state.version : ''), pw).then(function (r) {
      if (r.status === 200) {
        state.locked = false; state.offline = false;
        if (!state.viewPw) state.viewPw = pw;
        if (r.data.role === 'view') LS.set(KEY_PW, pw);
        if (r.data.unchanged) { if (manual) toast('Đã là bản mới nhất'); }
        else { applyServer(r.data); if (manual) toast('Đã cập nhật'); }
        render();
        return null;
      }
      if (r.status === 401 && !manual) { lockOut(); return null; }
      return errText(r);
    }).catch(function () {
      state.offline = true; updateStatus();
      return state.loaded ? 'Không có mạng. Đang dùng bản đã lưu trên máy.' : 'Không kết nối được máy chủ.';
    });
  }
  function lockOut() {
    state.viewPw = null; state.edit = false; state.editPw = null; LS.del(KEY_PW);
    state.locked = true; render();
  }

  function persistTree() { state.rev++; state.dirty = true; saveCache(); push(); }
  function push() {
    if (!state.edit || !state.editPw || !state.dirty) return;
    if (state.saving) return;
    state.saving = true; updateStatus();
    var rev = state.rev;
    api('PUT', '/api/tree', state.editPw, { base: state.version, tree: state.tree }).then(function (r) {
      state.saving = false;
      if (r.status === 200) {
        state.version = r.data.version; state.offline = false; saveCache();
        state.dirty = state.rev !== rev;
        updateStatus();
        if (state.dirty) push();
        return;
      }
      if (r.status === 409) {
        applyServer(r.data); state.dirty = false; state.tsel = null;
        toast('Gia phả vừa được cập nhật ở nơi khác. Đã tải bản mới nhất, hãy làm lại thay đổi vừa rồi.');
        render(); return;
      }
      if (r.status === 401 || r.status === 403) {
        state.edit = false; state.editPw = null; state.dirty = false;
        toast('Mật khẩu sửa không còn đúng. Đã tắt chế độ sửa, thay đổi cuối chưa được lưu.');
        render(); return;
      }
      toast(r.status === 413 ? 'Dữ liệu quá lớn, không lưu được.' : r.status === 429 ? errText(r) : 'Chưa lưu được lên máy chủ. Bấm “Chưa lưu” để thử lại.');
      updateStatus();
    }).catch(function () {
      state.saving = false; state.offline = true;
      toast('Chưa lưu lên máy chủ (không có mạng). Bấm “Chưa lưu” để lưu lại.');
      updateStatus();
    });
  }
  function updateStatus() {
    var b = $('#bstat'); if (!b) return;
    var t = '', c = 'bstat';
    if (state.edit && state.saving) { t = 'Đang lưu…'; c += ' edit'; }
    else if (state.edit && state.dirty) { t = 'Chưa lưu ↻'; c += ' warn'; }
    else if (state.edit) { t = 'Đang sửa'; c += ' edit'; }
    else if (state.offline) { t = 'Bản đã lưu trên máy'; c += ' warn'; }
    else if (state.loaded) t = 'Chỉ xem';
    b.textContent = state.locked ? '' : t; b.className = c;
  }

  /* ---------- Bố cục cây ---------- */
  var FW = 120, FP = 3, SG = 14, LG = 46, PAD = 20;
  var tv = { x: 0, y: 0, k: 1 }, tvFit = true, tsize = null, tpos = {}, pendingCenter = null;
  var pctx = null, dctx = null, rctx = null, pDeadFlag = false, pwCb = null;

  function frameRows(h) {
    var sp = h.spouse ? personById(h.spouse) : null;
    if (!sp) return [h];
    return h.sex === 'f' && sp.sex === 'm' ? [sp, h] : [h, sp];
  }
  var mctx = null, TREE_FONT = 'Georgia, "Times New Roman", serif';
  function wrapLines(text, maxW, px) {
    if (!mctx) mctx = document.createElement('canvas').getContext('2d');
    mctx.font = '700 ' + px + 'px ' + TREE_FONT;
    var words = String(text).split(/\s+/).filter(Boolean), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (cur && mctx.measureText(t).width * 1.04 > maxW) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }
  function yearsOf(p) {
    if (p.dead) { var dy = p.death && p.death.y; return p.by || dy ? (p.by || '?') + ' – ' + (dy || '?') : ''; }
    return p.by ? String(p.by) : '';
  }
  // đo tên để hiện đủ: xuống dòng, quá 3 dòng thì giảm cỡ chữ
  function rowInfo(p, solo) {
    var maxW = FW - 14 - (p.dead ? 14 : 0) - (solo ? 8 : 0), fs = 10.5, lines = wrapLines(p.name, maxW, fs);
    if (lines.length > 3) { fs = 9; lines = wrapLines(p.name, maxW, fs); }
    var lh = Math.round(fs * 1.15), yr = yearsOf(p) ? 13 : 0;
    return { p: p, lines: lines, fs: fs, lh: lh, h: 8 + lines.length * lh + yr };
  }
  function layoutTree(head) {
    var items = [], lines = [], seen = {}, maxH = [];
    function build(h, depth) {
      seen[h.id] = 1;
      var ps = frameRows(h), rows = ps.map(function (q) { return rowInfo(q, ps.length === 1); });
      var fh = rows.reduce(function (a, r) { return a + r.h; }, FP);
      maxH[depth] = Math.max(maxH[depth] || 0, fh);
      var all = childrenOf(h.id).filter(function (c) { return !seen[c.id]; });
      var col = !!state.collapsed[h.id] && all.length > 0;
      var kids = col ? [] : all.map(function (c) { return build(c, depth + 1); });
      var kw = kids.reduce(function (a, k) { return a + k.w; }, 0) + Math.max(0, kids.length - 1) * SG;
      return { h: h, rows: rows, fh: fh, kids: kids, kw: kw, w: Math.max(FW, kw), nAll: all.length, col: col, hidden: col ? collect(h.id, []).length - ps.length : 0 };
    }
    var root = build(head, 0), ys = [PAD];
    for (var d = 1; d < maxH.length; d++) ys[d] = ys[d - 1] + maxH[d - 1] + LG;
    tpos = {};
    function place(n, left, depth) {
      var y = ys[depth], cx = left + n.w / 2;
      n.cx = cx; n.y = y;
      items.push({ rows: n.rows, x: cx - FW / 2, y: y, cx: cx, fh: n.fh, hid: n.h.id, nAll: n.nAll, col: n.col, hidden: n.hidden });
      tpos[n.h.id] = { cx: cx, y: y };
      if (n.kids.length) {
        var cur = cx - n.kw / 2, ym = y + maxH[depth] + LG / 2;
        n.kids.forEach(function (k) { place(k, cur, depth + 1); cur += k.w + SG; });
        lines.push([cx, y + n.fh, cx, ym]);
        lines.push([Math.min(cx, n.kids[0].cx), ym, Math.max(cx, n.kids[n.kids.length - 1].cx), ym]);
        n.kids.forEach(function (k) { lines.push([k.cx, ym, k.cx, k.y]); });
      }
    }
    place(root, PAD, 0);
    var total = 2 * PAD + 8 + (maxH.length - 1) * LG; maxH.forEach(function (v) { total += v; });
    return { items: items, lines: lines, w: root.w + 2 * PAD, h: total };
  }

  function personInfo(p) {
    var a = [];
    if (p.note) a.push(p.note);
    if (p.by) a.push('sinh ' + (p.bd && p.bm ? p.bd + '/' + p.bm + '/' : '') + p.by);
    var dl = deathLunar(p);
    if (dl) {
      a.push('mất ' + lunTxt(dl) + (dl.y ? ' ' + dl.y : ''));
      var g = gioNext(dl, state.today);
      if (g) { var gl = lunarOf(g.date); a.push('giỗ ' + lunTxt(gl)); }
    }
    return a.join(' · ');
  }

  function maxGenOf(root) { var m = root.gen; walk(root.personId, function (h, d) { m = Math.max(m, root.gen + d); }); return m; }

  function renderTree() {
    var T = state.tree, cur = rootById(state.troot) || T.roots[0] || null;
    var top = ($('.appbar') || { offsetHeight: 56 }).offsetHeight;
    var html = '<div class="tree-screen" style="top:' + top + 'px">';
    if (!cur || !personById(cur.personId)) {
      var msg;
      if (!state.loaded) msg = '<p class="note" style="margin:0">Đang tải gia phả…</p>' + (state.offline ? '<p class="note">Chưa kết nối được máy chủ và chưa có bản lưu trên máy này.</p>' : '');
      else if (state.edit) msg = '<p class="note" style="margin:0 0 12px">Chưa có gia phả. Bắt đầu từ người đời đầu tiên mà bạn muốn ghi, rồi thêm vợ/chồng và con cháu.</p><button class="btn primary block" data-act="tAddRoot">＋ Thêm gốc</button>';
      else msg = '<p class="note" style="margin:0">Chưa có gia phả. Vào Cài đặt, bật chế độ sửa (cần mật khẩu sửa) để tạo.</p>';
      $('#view').innerHTML = html + '<div class="tree-empty"><section class="card"><h2>Gia phả</h2>' + msg + '</section></div></div>';
      tsize = null; return;
    }
    state.troot = cur.id;
    var sel = state.tsel ? personById(state.tsel) : null;
    if (sel && (!rootDepth(sel).root || rootDepth(sel).root.id !== cur.id)) { sel = null; state.tsel = null; }
    var lay = layoutTree(personById(cur.personId));
    tsize = { w: lay.w, h: lay.h };
    var mg = maxGenOf(cur), lv = '';
    for (var g = cur.gen + 2; g < mg; g++) lv += '<option value="' + g + '">Đến đời ' + g + '</option>';

    html += '<div class="tree-top">' + T.roots.map(function (r) {
      return '<button class="fchip" data-act="tBranch" data-id="' + esc(r.id) + '" aria-pressed="' + (r.id === cur.id) + '">' + esc(r.name) + '</button>';
    }).join('') + (state.edit ? '<button class="fchip add" data-act="tAddRoot">＋ Thêm gốc</button>' : '') + '</div>';
    html += '<div class="tree-desc"><span>' + esc(sel ? descOf(cur, genOf(sel)) : descOf(cur, cur.gen) + ' (người gốc)') + '</span>' + (state.edit ? '<button class="linkbtn" data-act="tEditRoot">Sửa nhánh</button>' : '') + '</div>';
    html += '<div class="tree-tools"><div class="sbox"><input type="search" id="tq" placeholder="Tìm tên…" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Tìm tên"><div class="sres" id="sres" hidden></div></div>' +
      '<select id="lvl" aria-label="Mức hiển thị"><option value="">Hiển thị</option><option value="all">Mở hết</option><option value="min">Thu gọn</option>' + lv + '</select></div>';

    html += '<div class="tree-stage"><div class="tree-vp" id="tvp"><div class="tree-world" id="tworld" style="width:' + lay.w + 'px;height:' + lay.h + 'px">' +
      '<svg width="' + lay.w + '" height="' + lay.h + '" aria-hidden="true">' + lay.lines.map(function (l) {
        return '<line x1="' + l[0] + '" y1="' + l[1] + '" x2="' + l[2] + '" y2="' + l[3] + '"/>';
      }).join('') + '</svg>' + lay.items.map(function (it) {
        var s = '<div class="pf" style="left:' + it.x + 'px;top:' + it.y + 'px">' + it.rows.map(function (r) {
          var p = r.p;
          return '<div class="pr ' + p.sex + (it.rows.length === 1 ? ' solo' : '') + (p.dead ? ' dead' : '') + (sel && sel.id === p.id ? ' sel' : '') + '" data-pid="' + esc(p.id) + '" style="height:' + r.h + 'px">' +
            '<b style="font-size:' + r.fs + 'px;line-height:' + r.lh + 'px">' + r.lines.map(esc).join('<br>') + '</b>' + (yearsOf(p) ? '<i>' + esc(yearsOf(p)) + '</i>' : '') + (p.dead ? '<span class="pl">' + LOTUS + '</span>' : '') + '</div>';
        }).join('') + '</div>';
        if (it.nAll) s += '<div class="tog' + (it.col ? ' closed' : '') + '" data-tog="' + esc(it.hid) + '" style="left:' + it.cx + 'px;top:' + (it.y + it.fh + 1) + 'px" role="button" aria-label="' + (it.col ? 'Mở rộng' : 'Thu gọn') + '">' + (it.col ? '+' + it.hidden : '−') + '</div>';
        return s;
      }).join('') + '</div></div>';
    html += '<div class="tree-fabs"><button data-act="tZoomIn" aria-label="Phóng to">＋</button><button data-act="tZoomOut" aria-label="Thu nhỏ">−</button><button data-act="tFit" aria-label="Vừa khung">⤢</button></div></div>';
    if (!sel) html += '<div class="tree-hint">Kéo để di chuyển · Chụm hai ngón để phóng to · Chạm vào một người · Chạm vòng tròn dưới khung để thu gọn / mở rộng</div>';
    else {
      var gn = genOf(sel);
      html += '<div class="tree-bar"><div class="tb-name">' + esc(sel.name) + (sel.dead ? '<span class="pl">' + LOTUS + '</span>' : '') + '</div>' +
        '<div class="tb-sub">' + esc(personInfo(sel) || '—') + '</div>' +
        '<div class="tb-sub">' + esc(gn ? descOf(cur, gn) : '') + '</div>' +
        (state.edit ? '<div class="tb-btns"><button data-act="tEdit">Sửa</button><button data-act="tDeath">Ngày mất</button>' +
        '<button data-act="tSpouse"' + (sel.spouse ? ' disabled' : '') + '>＋ Vợ/chồng</button><button data-act="tChild">＋ Con</button></div>' : '') + '</div>';
    }
    html += '</div>';
    $('#view').innerHTML = html;
    if (pendingCenter) { centerOn(pendingCenter); pendingCenter = null; tvFit = false; }
    else if (tvFit) { fitTree(); tvFit = false; } else applyTv();
    bindTree();
  }

  function applyTv() {
    var w = $('#tworld'); if (!w) return;
    w.style.transform = 'translate(' + tv.x + 'px,' + tv.y + 'px) scale(' + tv.k + ')';
  }
  function fitTree() {
    var vp = $('#tvp'); if (!vp || !tsize) return;
    var vw = vp.clientWidth, vh = vp.clientHeight;
    var cap = vw >= 820 ? 1.6 : 1; // máy tính: cho phép phóng to hơn để cây ít người không bị nhỏ
    var k = Math.max(0.2, Math.min(vw / tsize.w, vh / tsize.h, cap));
    tv = { k: k, x: (vw - tsize.w * k) / 2, y: Math.max(0, (vh - tsize.h * k) / 2) };
    applyTv();
  }
  function centerOn(pid) {
    var vp = $('#tvp'); if (!vp) return;
    var els = document.querySelectorAll('[data-pid]'), el = null;
    for (var i = 0; i < els.length; i++) if (els[i].dataset.pid === pid) { el = els[i]; break; }
    if (!el) return;
    var pf = el.parentNode, cx = pf.offsetLeft + FW / 2, cy = pf.offsetTop + pf.offsetHeight / 2;
    var k = Math.max(tv.k, 0.9);
    tv = { k: k, x: vp.clientWidth / 2 - cx * k, y: vp.clientHeight / 2 - cy * k };
    applyTv();
  }
  function zoomAt(f, cx, cy) {
    var k = Math.max(0.2, Math.min(3, tv.k * f)), r = k / tv.k;
    tv.x = cx - (cx - tv.x) * r; tv.y = cy - (cy - tv.y) * r; tv.k = k; applyTv();
  }
  function zoomBy(f) { var vp = $('#tvp'); if (vp) zoomAt(f, vp.clientWidth / 2, vp.clientHeight / 2); }

  function bindTree() {
    var vp = $('#tvp'); if (!vp) return;
    var ptrs = {}, drag = null, pinch = null;
    var rel = function (e) { var r = vp.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    var ids = function () { return Object.keys(ptrs); };
    var startPinch = function () {
      var a = ptrs[ids()[0]], b = ptrs[ids()[1]];
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: tv.k, wx: (mx - tv.x) / tv.k, wy: (my - tv.y) / tv.k };
    };
    vp.addEventListener('pointerdown', function (e) {
      ptrs[e.pointerId] = rel(e);
      try { vp.setPointerCapture(e.pointerId); } catch (x) {}
      if (ids().length === 1) {
        var c = e.target.closest ? e.target.closest('[data-pid]') : null;
        var tg = e.target.closest ? e.target.closest('[data-tog]') : null;
        drag = { sx: ptrs[e.pointerId].x, sy: ptrs[e.pointerId].y, ox: tv.x, oy: tv.y, moved: false, pid: c ? c.dataset.pid : null, tog: tg ? tg.dataset.tog : null };
      } else if (ids().length === 2) { drag = null; startPinch(); }
    });
    vp.addEventListener('pointermove', function (e) {
      if (!ptrs[e.pointerId]) return;
      ptrs[e.pointerId] = rel(e);
      if (pinch && ids().length >= 2) {
        var a = ptrs[ids()[0]], b = ptrs[ids()[1]];
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        var k = Math.max(0.2, Math.min(3, pinch.k * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
        tv.k = k; tv.x = mx - pinch.wx * k; tv.y = my - pinch.wy * k; applyTv();
      } else if (drag) {
        var p = ptrs[e.pointerId], dx = p.x - drag.sx, dy = p.y - drag.sy;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 8) drag.moved = true;
        if (drag.moved) { tv.x = drag.ox + dx; tv.y = drag.oy + dy; applyTv(); }
      }
    });
    var up = function (e) {
      if (!ptrs[e.pointerId]) return;
      var d = drag; delete ptrs[e.pointerId];
      if (ids().length < 2) pinch = null;
      if (ids().length === 1) { var q = ptrs[ids()[0]]; drag = { sx: q.x, sy: q.y, ox: tv.x, oy: tv.y, moved: true, pid: null, tog: null }; }
      else drag = null;
      if (e.type === 'pointerup' && d && !d.moved && ids().length === 0) {
        if (d.tog) toggleNode(d.tog);
        else if (d.pid) { state.tsel = d.pid; renderTree(); }
        else if (state.tsel) { state.tsel = null; renderTree(); }
      }
    };
    vp.addEventListener('pointerup', up);
    vp.addEventListener('pointercancel', up);
    vp.addEventListener('wheel', function (e) {
      e.preventDefault();
      var p = rel(e); zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
    }, { passive: false });
  }

  /* --- thu gọn / mở rộng --- */
  function toggleNode(hid) {
    var old = tpos[hid];
    if (state.collapsed[hid]) delete state.collapsed[hid];
    else {
      state.collapsed[hid] = 1;
      if (state.tsel) { var sub = collect(hid, []), self = frameRows(personById(hid)).map(function (p) { return p.id; }); if (sub.indexOf(state.tsel) >= 0 && self.indexOf(state.tsel) < 0) state.tsel = null; }
    }
    saveCol(); state.colInit = true; renderTree();
    // giữ nguyên vị trí khung vừa bấm trên màn hình
    var nw = tpos[hid];
    if (old && nw) { tv.x += (old.cx - nw.cx) * tv.k; tv.y += (old.y - nw.y) * tv.k; applyTv(); }
  }
  function applyLevel(v) {
    var root = rootById(state.troot); if (!root) return;
    walk(root.personId, function (h) { delete state.collapsed[h.id]; });
    if (v !== 'all') {
      var G = v === 'min' ? root.gen + 1 : parseInt(v, 10);
      walk(root.personId, function (h, d) { if (root.gen + d >= G && childrenOf(h.id).length) state.collapsed[h.id] = 1; });
    }
    state.colInit = true; saveCol(); state.tsel = null; tvFit = true; renderTree();
  }
  // mở đường tới một người, chọn và đưa vào giữa màn hình
  function reveal(pid) {
    var p = personById(pid); if (!p) return;
    var h = headOf(p), guard = 0;
    while (h.parent && guard++ < 80) { var up = personById(h.parent); if (!up) break; h = headOf(up); delete state.collapsed[h.id]; }
    var rd = rootDepth(p); if (rd.root) state.troot = rd.root.id;
    saveCol(); state.tsel = p.id; state.tab = 'tree'; pendingCenter = p.id;
    render(); window.scrollTo(0, 0);
  }
  function searchPeople(q) {
    var f = fold(q.trim()); if (!f) return [];
    return state.tree.people.filter(function (p) { return fold(p.name).indexOf(f) >= 0; }).slice(0, 8);
  }
  function updateSearch(q) {
    var box = $('#sres'); if (!box) return;
    if (!q.trim()) { box.hidden = true; box.innerHTML = ''; return; }
    var res = searchPeople(q);
    box.hidden = false;
    box.innerHTML = res.length ? res.map(function (p) {
      var rd = rootDepth(p), g = rd.root ? descOf(rd.root, rd.root.gen + rd.depth) : '';
      return '<button type="button" data-act="reveal" data-id="' + esc(p.id) + '"><b>' + esc(p.name) + '</b><small>' + esc([g, p.note].filter(Boolean).join(' · ')) + '</small></button>';
    }).join('') : '<div class="none">Không thấy người nào có tên này.</div>';
  }

  /* ---------- Tab Giỗ ---------- */
  function renderGio() {
    var t = state.today, out = [];
    state.tree.people.forEach(function (p) {
      var dl = deathLunar(p); if (!dl) return;
      var g = gioNext(dl, t); if (!g) return;
      out.push({ p: p, dl: dl, g: g, root: rootDepth(p) });
    });
    out.sort(function (a, b) { return a.g.dd - b.g.dd || a.p.name.localeCompare(b.p.name, 'vi'); });
    var html = '<p class="sect">Ngày giỗ tính theo âm lịch, là ngày liền trước ngày mất.</p>';
    if (!state.loaded) html += '<section class="card"><p class="note" style="margin:0">Đang tải gia phả…</p></section>';
    else if (!out.length) html += '<section class="card"><p class="note" style="margin:0">Chưa có ai được nhập ngày mất. Chọn một người trên cây, bấm “Ngày mất” (ở chế độ sửa).</p></section>';
    else html += '<ul class="rows cards">' + out.map(function (o) {
      var gl = lunarOf(o.g.date), dw = DOW[L.dow(o.g.date.d, o.g.date.m, o.g.date.y)];
      var r = o.root.root, gen = r ? r.gen + o.root.depth : null;
      var left = o.g.dd === 0 ? 'Hôm nay' : o.g.dd === 1 ? 'Ngày mai' : 'còn ' + o.g.dd + ' ngày';
      return '<li><button class="row' + (o.g.dd === 0 ? ' today' : '') + '" data-act="reveal" data-id="' + esc(o.p.id) + '"><span class="ico">' + LOTUS + '</span><span class="row-body">' +
        '<span class="row-name">' + esc(o.p.name) + (o.g.n && o.g.n >= 1 ? '<span class="badge">Giỗ lần thứ ' + o.g.n + '</span>' : '') + '</span>' +
        '<span class="row-sub" style="display:block">Mất ' + esc(lunTxt(o.dl)) + (o.dl.y ? ' năm ' + o.dl.y : '') + '</span>' +
        '<span class="row-sub" style="display:block">Giỗ ' + esc(lunTxt(gl)) + ' · ' + esc(dw) + ' ' + pad(o.g.date.d) + '/' + pad(o.g.date.m) + '/' + o.g.date.y + '</span>' +
        (gen ? '<span class="row-sub" style="display:block">' + esc(descOf(r, gen)) + '</span>' : '') +
        '</span><span class="row-right"><b>' + left + '</b></span></button></li>';
    }).join('') + '</ul>';
    $('#view').innerHTML = html;
  }

  /* ---------- Form: nhánh / gốc ---------- */
  function sexSeg(v) {
    return '<div class="seg" role="group" aria-label="Giới tính"><label><input type="radio" name="sex" value="m"' + (v !== 'f' ? ' checked' : '') + '><span>Nam</span></label>' +
      '<label><input type="radio" name="sex" value="f"' + (v === 'f' ? ' checked' : '') + '><span>Nữ</span></label></div>';
  }
  function needEdit() { if (state.edit) return false; toast('Đang ở chế độ xem. Bật chế độ sửa trong Cài đặt.'); return true; }
  function openRootForm(id) {
    if (needEdit()) return;
    var r = id ? rootById(id) : null; if (id && !r) return;
    rctx = r ? r.id : null;
    var v = r || { name: state.tree.roots.length ? 'Nhánh ' + (state.tree.roots.length + 1) : 'Nhánh nội', clan: '', branch: '', gen: 1 };
    dlg.innerHTML = '<form class="form" id="rForm" novalidate autocomplete="off"><h2>' + (r ? 'Sửa nhánh' : 'Thêm gốc') + '</h2>' +
      '<label>Tên nhánh<input type="text" name="rname" maxlength="30" placeholder="VD: Nhánh nội" value="' + esc(v.name) + '"></label>' +
      '<div class="row2"><label>Họ / tộc<input type="text" name="clan" maxlength="30" placeholder="VD: Nguyễn" value="' + esc(v.clan) + '"></label>' +
      '<label>Chi / phái<input type="text" name="branch" maxlength="30" placeholder="VD: đệ ngũ" value="' + esc(v.branch) + '"></label></div>' +
      '<label>Người gốc ở đời thứ<input type="number" name="gen" inputmode="numeric" min="1" max="99" value="' + esc(v.gen) + '"></label>' +
      '<p class="note" style="margin:0">Hiển thị dạng: “Nguyễn đệ ngũ · đời thứ 10”. Đời của con cháu tự tính theo người gốc.</p>' +
      (r ? '' : '<div class="lbl">Người gốc</div><label>Họ tên<input type="text" name="pname" maxlength="60" placeholder="VD: Nguyễn Văn An"></label>' + sexSeg('m')) +
      '<p class="err" id="formErr"></p><div class="actions">' + (r ? '<button type="button" class="btn danger" id="rDel">Xoá nhánh</button><span class="grow"></span>' : '') +
      '<button type="button" class="btn" id="cancelBtn">Huỷ</button><button type="submit" class="btn primary">Lưu</button></div></form>';
    if (!dlg.open) dlg.showModal();
  }
  function saveRoot() {
    var f = $('#rForm').elements, err = $('#formErr');
    var name = f.rname.value.trim(), gen = parseInt(f.gen.value, 10);
    if (!name) { err.textContent = 'Hãy nhập tên nhánh.'; return; }
    if (!(gen >= 1 && gen <= 99)) { err.textContent = 'Đời phải từ 1 đến 99.'; return; }
    var vals = { name: name, clan: f.clan.value.trim(), branch: f.branch.value.trim(), gen: gen };
    if (rctx) Object.assign(rootById(rctx), vals);
    else {
      var pn = f.pname.value.trim();
      if (!pn) { err.textContent = 'Hãy nhập họ tên người gốc.'; return; }
      var p = { id: uid(), name: pn, sex: f.sex.value === 'f' ? 'f' : 'm', note: '', bd: null, bm: null, by: null, dead: false, death: null, spouse: null, isSpouse: false, parent: null };
      var r = Object.assign({ id: uid(), personId: p.id }, vals);
      state.tree.people.push(p); state.tree.roots.push(r);
      state.troot = r.id; state.tsel = null; tvFit = true;
    }
    persistTree(); dlg.close(); toast('Đã lưu'); render();
  }
  function removePeople(idSet) {
    state.tree.people = state.tree.people.filter(function (p) { return !idSet[p.id]; });
    if (idSet[state.tsel]) state.tsel = null;
  }
  function deleteRoot() {
    var r = rootById(rctx); if (!r) return;
    var ids = collect(r.personId, []);
    if (!confirm('Xoá nhánh “' + r.name + '” và ' + ids.length + ' người trong nhánh này?')) return;
    var set = {}; ids.forEach(function (i) { set[i] = 1; });
    removePeople(set);
    state.tree.roots = state.tree.roots.filter(function (x) { return x.id !== r.id; });
    state.troot = state.tree.roots.length ? state.tree.roots[0].id : null; tvFit = true;
    persistTree(); dlg.close(); toast('Đã xoá nhánh'); render();
  }

  /* ---------- Form: người ---------- */
  function openPersonForm(id, ctx) {
    if (needEdit()) return;
    var p = id ? personById(id) : null; if (id && !p) return;
    pctx = { id: id || null, kind: ctx && ctx.kind, of: ctx && ctx.of };
    var base = p || { name: '', sex: 'm', note: '', bd: '', bm: '', by: '' };
    if (!p && ctx && ctx.kind === 'spouse') { var o = personById(ctx.of); if (!o || o.spouse) return; base = Object.assign({}, base, { sex: o.sex === 'm' ? 'f' : 'm' }); }
    if (!p && ctx && ctx.kind === 'child' && !personById(ctx.of)) return;
    var title = p ? 'Sửa thông tin' : (ctx && ctx.kind === 'spouse' ? 'Thêm vợ/chồng' : 'Thêm con');
    dlg.innerHTML = '<form class="form" id="pForm" novalidate autocomplete="off"><h2>' + title + '</h2>' +
      '<label>Họ tên<input type="text" name="pname" maxlength="60" placeholder="VD: Nguyễn Văn Bình" value="' + esc(base.name) + '"></label>' + sexSeg(base.sex) +
      '<label>Quan hệ / ghi chú<input type="text" name="note" maxlength="60" placeholder="VD: Ông nội, con trưởng…" value="' + esc(base.note || '') + '"></label>' +
      '<div class="lbl">Ngày sinh (không bắt buộc)</div><div class="row3"><label>Ngày<input type="number" name="bd" inputmode="numeric" min="1" max="31" value="' + esc(base.bd || '') + '"></label>' +
      '<label>Tháng<input type="number" name="bm" inputmode="numeric" min="1" max="12" value="' + esc(base.bm || '') + '"></label>' +
      '<label>Năm<input type="number" name="by" inputmode="numeric" min="1000" max="2199" value="' + esc(base.by || '') + '"></label></div>' +
      '<p class="err" id="formErr"></p>' +
      '<button type="button" class="ghost" id="pDead">Người đã mất? Nhập ngày mất</button><div class="actions">' + (p ? '<button type="button" class="btn danger" id="pDel">Xoá</button><span class="grow"></span>' : '') +
      '<button type="button" class="btn" id="cancelBtn">Huỷ</button><button type="submit" class="btn primary">Lưu</button></div></form>';
    if (!dlg.open) dlg.showModal();
  }
  function savePerson() {
    var goDeath = pDeadFlag; pDeadFlag = false;
    var f = $('#pForm').elements, err = $('#formErr');
    var num = function (n) { var x = parseInt(f[n].value, 10); return isNaN(x) ? null : x; };
    var name = f.pname.value.trim(), bd = num('bd'), bm = num('bm'), by = num('by');
    if (!name) { err.textContent = 'Hãy nhập họ tên.'; return; }
    if ((bd && (bd < 1 || bd > 31)) || (bm && (bm < 1 || bm > 12))) { err.textContent = 'Ngày hoặc tháng sinh không hợp lệ.'; return; }
    if (by != null && (by < 1000 || by > 2199)) { err.textContent = 'Năm sinh không hợp lệ.'; return; }
    var vals = { name: name, sex: f.sex.value === 'f' ? 'f' : 'm', note: f.note.value.trim(), bd: bd, bm: bm, by: by };
    var p;
    if (pctx.id) { p = personById(pctx.id); Object.assign(p, vals); }
    else {
      var of = personById(pctx.of);
      p = Object.assign({ id: uid(), dead: false, death: null, spouse: null, isSpouse: false, parent: null }, vals);
      if (pctx.kind === 'spouse') { if (!of || of.spouse) return; p.isSpouse = true; p.spouse = of.id; of.spouse = p.id; }
      else { if (!of) return; p.parent = headOf(of).id; delete state.collapsed[headOf(of).id]; saveCol(); }
      state.tree.people.push(p); tvFit = true;
    }
    state.tsel = p.id;
    persistTree(); dlg.close(); toast('Đã lưu'); render();
    if (goDeath) openDeathForm(p.id);
  }
  function deletePerson() {
    var p = personById(pctx.id); if (!p) return;
    var ids, set = {};
    if (p.isSpouse) ids = [p.id]; else ids = collect(p.id, []);
    if (!confirm(ids.length > 1 ? 'Xoá “' + p.name + '” và ' + (ids.length - 1) + ' người liên quan (vợ/chồng, con cháu)?' : 'Xoá “' + p.name + '”?')) return;
    ids.forEach(function (i) { set[i] = 1; });
    if (p.isSpouse) { var h = personById(p.spouse); if (h) h.spouse = null; }
    removePeople(set);
    var r = state.tree.roots.filter(function (x) { return set[x.personId]; })[0];
    if (r) { state.tree.roots = state.tree.roots.filter(function (x) { return x.id !== r.id; }); state.troot = state.tree.roots.length ? state.tree.roots[0].id : null; tvFit = true; }
    persistTree(); dlg.close(); toast('Đã xoá'); render();
  }

  /* ---------- Form: ngày mất (chỉ âm lịch) ---------- */
  function openDeathForm(id) {
    if (needEdit()) return;
    var p = personById(id); if (!p) return;
    dctx = p.id;
    var dd = deathLunar(p) || { d: '', m: '', y: '', leap: false };
    dlg.innerHTML = '<form class="form" id="dForm" novalidate autocomplete="off"><h2>Ngày mất · ' + esc(p.name) + '</h2>' +
      '<p class="note" style="margin:0">Nhập ngày mất theo <b>âm lịch</b>. Ngày giỗ tự tính: luôn là ngày liền trước ngày mất.</p>' +
      '<div class="row3"><label>Ngày mất (âm)<input type="number" name="d" inputmode="numeric" min="1" max="30" value="' + esc(dd.d || '') + '"></label>' +
      '<label>Tháng<input type="number" name="m" inputmode="numeric" min="1" max="12" value="' + esc(dd.m || '') + '"></label>' +
      '<label>Năm mất (âm)<input type="number" name="y" inputmode="numeric" min="1000" max="2199" placeholder="VD: 2022" value="' + esc(dd.y || '') + '"></label></div>' +
      '<label class="chk"><input type="checkbox" name="leap"' + (dd.leap ? ' checked' : '') + '> Tháng nhuận</label>' +
      '<p class="preview" id="dprev"></p>' +
      '<p class="err" id="formErr"></p><div class="actions">' + (p.dead ? '<button type="button" class="btn danger" id="dClear">Xoá ngày mất</button><span class="grow"></span>' : '') +
      '<button type="button" class="btn" id="cancelBtn">Huỷ</button><button type="submit" class="btn primary">Lưu</button></div></form>';
    syncDeath();
    if (!dlg.open) dlg.showModal();
  }
  function readDeath() {
    var f = $('#dForm').elements, num = function (n) { var x = parseInt(f[n].value, 10); return isNaN(x) ? null : x; };
    return { d: num('d'), m: num('m'), y: num('y'), leap: f.leap.checked };
  }
  function validDeath(v) {
    if (!v.d || !v.m) return 'Hãy nhập ngày và tháng.';
    if (v.m < 1 || v.m > 12 || v.d < 1) return 'Ngày hoặc tháng không hợp lệ.';
    if (v.d > 30) return 'Ngày âm lịch tối đa là 30.';
    if (v.y != null && (v.y < 1000 || v.y > 2199)) return 'Năm mất không hợp lệ.';
    if (v.y != null && v.y >= 1900 && !resolveLunar(v.d, v.m, v.y, v.leap)) return 'Ngày âm lịch này không tồn tại ở năm ' + v.y + '.';
    return '';
  }
  function syncDeath() {
    if (!$('#dForm')) return;
    var v = readDeath(), pv = $('#dprev');
    if (!v.d || !v.m || validDeath(v)) { pv.textContent = 'Nhập ngày và tháng để xem ngày giỗ.'; return; }
    var Y = v.y || state.today.y, r = resolveLunar(v.d, v.m, Y, v.leap);
    if (!r) { pv.textContent = 'Không tìm được ngày tương ứng.'; return; }
    var gr = L.addDays(r, -1), gl = lunarOf(gr);
    pv.textContent = 'Ngày mất tương đương ' + pad(r.d) + '/' + pad(r.m) + '/' + r.y + ' dương. Ngày giỗ: ' + lunTxt(gl) + ' (' + pad(gr.d) + '/' + pad(gr.m) + '/' + gr.y + ' dương)' + (v.y ? '' : ' · tính theo năm ' + Y);
  }
  function saveDeath() {
    var v = readDeath(), msg = validDeath(v), p = personById(dctx);
    if (msg) { $('#formErr').textContent = msg; return; }
    if (!p) return;
    p.dead = true; p.death = { d: v.d, m: v.m, y: v.y, leap: v.leap };
    persistTree(); dlg.close(); toast('Đã lưu'); render();
  }
  function clearDeath() {
    var p = personById(dctx); if (!p) return;
    if (!confirm('Xoá ngày mất của “' + p.name + '”?')) return;
    p.dead = false; p.death = null;
    persistTree(); dlg.close(); toast('Đã xoá ngày mất'); render();
  }

  /* ---------- Hộp nhập mật khẩu ---------- */
  function askPw(title, note, cb) {
    pwCb = cb;
    dlg.innerHTML = '<form class="form" id="pwForm" novalidate autocomplete="off"><h2>' + esc(title) + '</h2>' + (note ? '<p class="note" style="margin:0">' + esc(note) + '</p>' : '') +
      '<label>Mật khẩu<input type="password" name="pw" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></label>' +
      '<p class="err" id="formErr"></p><div class="actions"><button type="button" class="btn" id="cancelBtn">Huỷ</button><button type="submit" class="btn primary" id="pwOk">Xác nhận</button></div></form>';
    if (!dlg.open) dlg.showModal();
  }
  function submitPw() {
    var pw = $('#pwForm').elements.pw.value, err = $('#formErr'), ok = $('#pwOk');
    if (!pw) { err.textContent = 'Hãy nhập mật khẩu.'; return; }
    ok.disabled = true; err.textContent = '';
    pwCb(pw).then(function (msg) {
      if (msg) { err.textContent = msg; ok.disabled = false; } else dlg.close();
    });
  }

  /* ---------- Chế độ sửa ---------- */
  function enableEdit(pw) {
    return api('POST', '/api/auth', pw).then(function (r) {
      if (r.status !== 200) return errText(r);
      if (r.data.role !== 'edit') return 'Đây là mật khẩu xem. Cần nhập mật khẩu sửa.';
      state.edit = true; state.editPw = pw;
      toast('Đã bật chế độ sửa');
      render();
      fetchTree(pw, false); // lấy bản mới nhất để lưu không bị lệch phiên bản
      return null;
    }).catch(function () { return 'Không kết nối được máy chủ.'; });
  }
  function disableEdit() {
    if (state.dirty && !confirm('Còn thay đổi chưa lưu lên máy chủ. Vẫn tắt chế độ sửa?')) { render(); return; }
    state.edit = false; state.editPw = null; state.dirty = false;
    toast('Đã tắt chế độ sửa'); refresh(false); render();
  }

  /* ---------- Cài đặt ---------- */
  function renderSettings() {
    var n = state.tree.people.length, e = state.edit;
    var stat = !state.loaded ? 'Chưa tải' : state.offline ? 'Bản đã lưu trên máy (không có mạng)' : state.dirty ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ';
    var html = '<section class="card"><h2>Dữ liệu</h2>' +
      '<div class="set-line"><span>Số người</span><span>' + n + '</span></div>' +
      '<div class="set-line"><span>Phiên bản dữ liệu</span><span>' + state.version + '</span></div>' +
      '<div class="set-line"><span>Trạng thái</span><span>' + esc(stat) + '</span></div>' +
      '<div class="btns"><button class="btn" data-act="refresh">Cập nhật từ máy chủ</button>' + (e && state.dirty ? '<button class="btn primary" data-act="retry">Lưu lại</button>' : '') + '</div></section>';
    html += '<section class="card"><h2>Chỉnh sửa</h2>' +
      '<label class="set-line sw"><span>Chế độ sửa</span><input type="checkbox" data-set="edit"' + (e ? ' checked' : '') + '></label>' +
      '<p class="note">Cần mật khẩu sửa. Mọi thay đổi được lưu lên máy chủ ngay, người khác mở app sẽ thấy sau khi cập nhật.</p>' +
      (e ? '<div class="btns"><button class="btn danger" data-act="wipe">Xoá toàn bộ gia phả</button></div>' : '') + '</section>';
    html += '<section class="card"><h2>Sao lưu</h2><div class="btns"><button class="btn" data-act="export">Xuất file JSON</button>' + (e ? '<button class="btn" data-act="import">Nhập từ file</button>' : '') + '</div>' +
      '<p class="note">File xuất ra không được mã hoá. Hãy giữ riêng tư, đừng đưa lên GitHub hay nơi công khai. Nhập file được cả bản sao lưu từ Lịch Việt.</p></section>';
    html += '<section class="card"><h2>Thiết bị này</h2><div class="btns"><button class="btn danger" data-act="forget">Khoá và xoá dữ liệu trên máy này</button></div>' +
      '<p class="note">Xoá bản lưu và mật khẩu đã nhớ trên máy này. Lần sau phải nhập lại mật khẩu. Dữ liệu trên máy chủ không bị ảnh hưởng.</p></section>';
    html += '<section class="card"><h2>Ứng dụng</h2><div class="set-line"><span>Phiên bản</span><span>' + esc(APP_VERSION) + '</span></div>' +
      '<div class="btns"><button class="btn" data-act="checkApp">Kiểm tra bản mới</button>' + (state.installEvt ? '<button class="btn primary" data-act="install">Cài lên màn hình chính</button>' : '') + '</div></section>';
    $('#view').innerHTML = html;
  }
  function exportData() {
    var obj = { app: 'giapha', exportedAt: new Date().toISOString(), tree: state.tree };
    var blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
    var t = state.today, a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'giapha-' + t.y + '-' + pad(t.m) + '-' + pad(t.d) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast('Đã xuất file');
  }
  function importData(file) {
    if (needEdit()) return;
    var rd = new FileReader();
    rd.onload = function () {
      var obj; try { obj = JSON.parse(rd.result); } catch (e) { toast('File không đọc được'); return; }
      var t = sanitizeTree(obj && obj.tree ? obj.tree : obj);
      if (!t || !t.people.length || !t.roots.length) { toast('File không có gia phả hợp lệ'); return; }
      if (!confirm('Thay toàn bộ gia phả hiện tại bằng file này (' + t.people.length + ' người)?')) return;
      state.tree = t; state.troot = t.roots[0].id; state.tsel = null; tvFit = true; state.collapsed = {}; state.colInit = false;
      if (t.people.length > 40) autoCollapse();
      persistTree(); toast('Đã nhập ' + t.people.length + ' người'); render();
    };
    rd.onerror = function () { toast('File không đọc được'); };
    rd.readAsText(file);
  }
  function wipeTree() {
    if (needEdit()) return;
    if (!confirm('Xoá toàn bộ gia phả (' + state.tree.people.length + ' người) khỏi máy chủ?\nNên xuất file sao lưu trước. Không hoàn tác được.')) return;
    state.tree = emptyTree(); state.troot = null; state.tsel = null; state.collapsed = {}; saveCol(); tvFit = true;
    persistTree(); toast('Đã xoá gia phả'); render();
  }
  function forgetDevice() {
    if (!confirm('Khoá app và xoá dữ liệu gia phả đã lưu trên máy này?')) return;
    [KEY_CACHE, KEY_OK, KEY_PW, KEY_COL].forEach(LS.del);
    state.tree = emptyTree(); state.version = 0; state.loaded = false; state.viewPw = null; state.edit = false; state.editPw = null;
    state.dirty = false; state.collapsed = {}; state.colInit = false; state.tsel = null; state.troot = null; state.locked = true; state.tab = 'tree';
    render();
  }

  /* ---------- Màn hình khoá ---------- */
  function renderLock() {
    $('#view').innerHTML = '<div class="lock"><form class="lock-card" id="lockForm" novalidate autocomplete="off"><div class="seal"><span>Họ</span></div><h1>Gia phả</h1><small class="sub">Cội nguồn dòng họ</small><p>Nhập mật khẩu để xem</p>' +
      '<input type="password" name="pw" id="lpw" aria-label="Mật khẩu" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">' +
      '<p class="err" id="lerr" role="alert"></p><button class="btn" type="submit" id="lbtn">Mở</button></form></div>';
    var i = $('#lpw'); if (i) i.focus();
  }
  function doLogin() {
    var pw = $('#lpw').value, err = $('#lerr'), btn = $('#lbtn');
    if (!pw) { err.textContent = 'Hãy nhập mật khẩu.'; return; }
    btn.disabled = true; err.textContent = 'Đang kiểm tra…';
    state.loaded = false; // luôn lấy bản đầy đủ khi đăng nhập
    api('GET', '/api/tree', pw).then(function (r) {
      if (r.status !== 200) { err.textContent = errText(r); btn.disabled = false; return; }
      state.viewPw = pw; state.locked = false; state.tab = 'tree';
      if (r.data.role === 'view') LS.set(KEY_PW, pw);
      applyServer(r.data); tvFit = true; render();
    }).catch(function () { err.textContent = 'Không kết nối được máy chủ.'; btn.disabled = false; });
  }

  /* ---------- Điều khiển chung ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }
  function render() {
    document.body.classList.toggle('locked', state.locked);
    if (state.locked) { updateStatus(); renderLock(); return; }
    document.body.classList.toggle('on-tree', state.tab === 'tree');
    $('#title').textContent = { tree: 'Gia phả', gio: 'Ngày giỗ sắp tới', settings: 'Cài đặt' }[state.tab];
    document.querySelectorAll('#tabs button').forEach(function (b) { b.setAttribute('aria-current', b.dataset.tab === state.tab ? 'page' : 'false'); });
    updateStatus();
    ({ tree: renderTree, gio: renderGio, settings: renderSettings })[state.tab]();
  }
  function goTab(tab) { state.tab = tab; if (tab === 'tree') tvFit = true; render(); window.scrollTo(0, 0); }

  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]'); if (b) goTab(b.dataset.tab);
  });
  $('#bstat').addEventListener('click', function () { if (state.edit && state.dirty) push(); else if (state.offline) refresh(true); });

  var main = $('#view');
  main.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) { var sb = $('#sres'); if (sb && !e.target.closest('.sbox')) sb.hidden = true; return; }
    switch (el.dataset.act) {
      case 'tBranch': state.troot = el.dataset.id; state.tsel = null; tvFit = true; renderTree(); break;
      case 'tAddRoot': openRootForm(null); break;
      case 'tEditRoot': openRootForm(state.troot); break;
      case 'tZoomIn': zoomBy(1.25); break;
      case 'tZoomOut': zoomBy(0.8); break;
      case 'tFit': fitTree(); break;
      case 'tEdit': openPersonForm(state.tsel); break;
      case 'tDeath': openDeathForm(state.tsel); break;
      case 'tSpouse': openPersonForm(null, { kind: 'spouse', of: state.tsel }); break;
      case 'tChild': openPersonForm(null, { kind: 'child', of: state.tsel }); break;
      case 'reveal': reveal(el.dataset.id); break;
      case 'refresh': refresh(true); break;
      case 'retry': push(); break;
      case 'export': exportData(); break;
      case 'import': $('#importFile').click(); break;
      case 'wipe': wipeTree(); break;
      case 'forget': forgetDevice(); break;
      case 'checkApp': checkAppUpdate(true); break;
      case 'install': if (state.installEvt) { state.installEvt.prompt(); state.installEvt = null; } break;
    }
  });
  main.addEventListener('submit', function (e) { if (e.target.id === 'lockForm') { e.preventDefault(); doLogin(); } });
  main.addEventListener('input', function (e) { if (e.target.id === 'tq') updateSearch(e.target.value); });
  main.addEventListener('change', function (e) {
    if (e.target.id === 'lvl') { if (e.target.value) applyLevel(e.target.value); return; }
    if (e.target.dataset && e.target.dataset.set === 'edit') {
      if (e.target.checked) {
        e.target.checked = false;
        askPw('Bật chế độ sửa', 'Nhập mật khẩu sửa.', enableEdit);
      } else disableEdit();
    }
  });
  $('#importFile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (f) importData(f); e.target.value = '';
  });

  dlg.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = e.target.id;
    if (id === 'rForm') saveRoot();
    else if (id === 'pForm') savePerson();
    else if (id === 'dForm') saveDeath();
    else if (id === 'pwForm') submitPw();
  });
  dlg.addEventListener('click', function (e) {
    var id = e.target.id;
    if (id === 'cancelBtn') dlg.close();
    else if (id === 'rDel') deleteRoot();
    else if (id === 'pDel') deletePerson();
    else if (id === 'dClear') clearDeath();
    else if (id === 'pDead') { pDeadFlag = true; savePerson(); }
  });
  dlg.addEventListener('input', function (e) { if (e.target.form && e.target.form.id === 'dForm') syncDeath(); });
  dlg.addEventListener('close', function () { if (dlg.open) return; /* đã mở form khác ngay sau khi đóng */ dlg.innerHTML = ''; pwCb = null; if (state.tab === 'settings' && !state.locked) renderSettings(); });

  document.addEventListener('keydown', function (e) {
    if (state.tab !== 'tree' || state.locked || dlg.open || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
    if (e.key === '+' || e.key === '=') { zoomBy(1.2); e.preventDefault(); }
    else if (e.key === '-' || e.key === '_') { zoomBy(1 / 1.2); e.preventDefault(); }
    else if (e.key === '0') { fitTree(); e.preventDefault(); }
  });

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); state.installEvt = e; if (state.tab === 'settings') render();
  });

  /* ---------- Qua nửa đêm & quay lại app ---------- */
  function rollover() {
    var n = vnToday();
    if (n.y === state.today.y && n.m === state.today.m && n.d === state.today.d) return;
    state.today = n;
    if (!dlg.open && !state.locked) render();
  }
  function scheduleMidnight() {
    var ms = 86400000 - ((Date.now() + 7 * 3600 * 1000) % 86400000) + 1000;
    setTimeout(function () { rollover(); scheduleMidnight(); }, ms);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    rollover(); checkAppUpdate(false);
    if (!state.locked && !state.dirty && !state.saving && !dlg.open) refresh(false);
  });
  window.addEventListener('focus', rollover);

  /* ---------- Cập nhật phiên bản app (service worker) ---------- */
  var swReg = null, updating = false;
  function showUpdateBar(worker) {
    if ($('#updateBar')) return;
    var bar = document.createElement('div');
    bar.id = 'updateBar';
    bar.setAttribute('role', 'alert');
    bar.innerHTML = '<span>Có phiên bản mới của app</span><button class="btn primary" type="button">Cập nhật</button>';
    bar.querySelector('button').addEventListener('click', function () {
      updating = true;
      worker.postMessage({ type: 'SKIP_WAITING' });
    });
    document.body.appendChild(bar);
  }
  function watchWorker(reg) {
    var w = reg.installing;
    if (!w) return;
    w.addEventListener('statechange', function () {
      if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdateBar(w);
    });
  }
  function checkAppUpdate(manual) {
    if (!swReg) { if (manual) toast('Chưa bật chế độ offline trên trình duyệt này'); return; }
    swReg.update().then(function () {
      if (!manual) return;
      return new Promise(function (resolve) {
        var t0 = Date.now();
        (function poll() {
          var el = Date.now() - t0;
          if ((el > 600 && !swReg.installing) || el > 8000) return resolve();
          setTimeout(poll, 200);
        })();
      }).then(function () {
        toast(swReg.waiting ? 'Có phiên bản mới, bấm Cập nhật' : 'Bạn đang dùng bản mới nhất');
      });
    }).catch(function () { if (manual) toast('Không kiểm tra được, hãy thử lại khi có mạng'); });
  }
  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      swReg = reg;
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateBar(reg.waiting);
      reg.addEventListener('updatefound', function () { watchWorker(reg); });
      setInterval(function () { checkAppUpdate(false); }, 2 * 3600 * 1000);
    }).catch(function () {});
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (updating) location.reload();
    });
  }

  /* ---------- Khởi động ---------- */
  (function boot() {
    var cache = LS.get(KEY_CACHE, null), pw = LS.get(KEY_PW, null), col = LS.get(KEY_COL, null);
    state.collapsed = col && typeof col === 'object' ? col : {}; state.colInit = col !== null;
    if (cache && LS.get(KEY_OK, false)) {
      var t = sanitizeTree(cache.tree);
      if (t) { state.tree = t; state.version = cache.version || 0; state.loaded = true; state.troot = t.roots.length ? t.roots[0].id : null; }
    }
    state.viewPw = pw;
    state.locked = !state.loaded && !pw;
    render();
    if (!state.locked) refresh(false);
  })();
  scheduleMidnight();
  window.addEventListener('load', initServiceWorker);
})();
