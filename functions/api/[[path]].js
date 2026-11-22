/* API của sách, chạy trên Cloudflare Pages Functions.
   Cần: một KV namespace gắn với tên STORE, và một secret tên ADMIN_PASSWORD.
   Công khai (ai cũng đọc được):
     GET  /api/audio-list        danh sách bài đã có thu âm
     GET  /api/audio/<id>        file thu âm (hỗ trợ tua)
     GET  /api/chiem-nghiem      các điều chiêm nghiệm chung do admin thêm
   Chỉ admin (cần đăng nhập bằng mật khẩu):
     POST /api/login, POST /api/logout, GET /api/me
     PUT/DELETE /api/audio/<id>, PUT /api/chiem-nghiem */

var MAX_AUDIO = 24 * 1024 * 1024;     /* KV cho tối đa 25 MiB mỗi giá trị */
var SESSION_SECONDS = 8 * 3600;
var ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
var enc = new TextEncoder();

function json(data, status, extra) {
  var h = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  if (extra) for (var k in extra) h.set(k, extra[k]);
  return new Response(JSON.stringify(data), { status: status || 200, headers: h });
}

function hex(buf) {
  return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
}
async function sha256(text) { return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text))); }
function same(a, b) {            /* so sánh không phụ thuộc thời gian */
  if (a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}
async function sign(secret, msg) {
  var key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
function getCookie(req, name) {
  var m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : '';
}
async function makeToken(secret) {
  var exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return exp + '.' + (await sign(secret, 'tkk-admin.' + exp));
}
async function isAdmin(req, env) {
  if (!env.ADMIN_PASSWORD) return false;
  var t = getCookie(req, 'tkk_admin').split('.');
  if (t.length !== 2 || !/^\d+$/.test(t[0]) || +t[0] < Date.now() / 1000) return false;
  var want = await sign(env.ADMIN_PASSWORD, 'tkk-admin.' + t[0]);
  return same(enc.encode(want), enc.encode(t[1]));
}
function cookie(value, maxAge) {
  return 'tkk_admin=' + value + '; Path=/; Max-Age=' + maxAge + '; HttpOnly; Secure; SameSite=Strict';
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function cleanSections(list) {
  if (!Array.isArray(list) || list.length > 200) return null;
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    if (!s || typeof s.title !== 'string' || !Array.isArray(s.paras)) return null;
    var id = String(s.id || '');
    var title = s.title.trim().slice(0, 200);
    var paras = s.paras.map(function (p) { return String(p).trim().slice(0, 4000); }).filter(Boolean).slice(0, 30);
    if (!ID_RE.test(id) || !title || !paras.length) return null;
    out.push({ id: id, title: title, paras: paras });
  }
  return out;
}

export async function onRequest(context) {
  var req = context.request, env = context.env;
  var url = new URL(req.url);
  var path = url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  var method = req.method;

  if (!env.STORE || !env.ADMIN_PASSWORD) {
    return json({ error: 'not-configured' }, 503);
  }

  /* chặn gọi chéo trang với các thao tác ghi */
  if (method !== 'GET' && method !== 'HEAD') {
    var origin = req.headers.get('origin');
    if (origin && origin !== url.origin) return json({ error: 'forbidden' }, 403);
  }

  if (path === 'login' && method === 'POST') {
    var body;
    try { body = await req.json(); } catch (e) { return json({ error: 'bad-request' }, 400); }
    var ok = same(await sha256(String(body.password || '')), await sha256(env.ADMIN_PASSWORD));
    if (!ok) { await sleep(600); return json({ error: 'wrong-password' }, 401); }
    return json({ ok: true }, 200, { 'set-cookie': cookie(await makeToken(env.ADMIN_PASSWORD), SESSION_SECONDS) });
  }
  if (path === 'logout' && method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });
  }
  if (path === 'me' && method === 'GET') {
    return json({ admin: await isAdmin(req, env) });
  }

  /* ?fresh=1 bỏ qua bộ nhớ đệm 60 giây của KV, dùng cho trang quản trị */
  var cacheOpt = url.searchParams.get('fresh') ? {} : { cacheTtl: 60 };

  /* chỉ mục các bài đã thu: { id: mốc thời gian }. Một lần đọc thay vì liệt kê (gói Free chỉ cho 1.000 lần liệt kê mỗi ngày). */
  async function readIndex(opt) {
    var raw = await env.STORE.get('audio-index', Object.assign({ type: 'json' }, opt || {}));
    return raw && typeof raw === 'object' ? raw : {};
  }

  if (path === 'audio-list' && method === 'GET') {
    return json({ items: await readIndex(cacheOpt) }, 200, { 'cache-control': 'no-cache' });
  }

  var am = path.match(/^audio\/([^/]+)$/);
  if (am) {
    var id = am[1];
    if (!ID_RE.test(id)) return json({ error: 'bad-id' }, 400);
    var key = 'audio:' + id;
    if (method === 'GET' || method === 'HEAD') {
      var got = await env.STORE.getWithMetadata(key, { type: 'arrayBuffer', cacheTtl: 60 });
      if (!got || !got.value) return json({ error: 'not-found' }, 404);
      var data = got.value, size = data.byteLength;
      var h = new Headers();
      h.set('content-type', (got.metadata && got.metadata.type) || 'audio/webm');
      h.set('accept-ranges', 'bytes');
      h.set('cache-control', 'public, max-age=31536000, immutable');
      var rm = (req.headers.get('range') || '').match(/^bytes=(\d*)-(\d*)$/);
      var status = 200, body = data;
      if (rm && (rm[1] || rm[2])) {
        var start, end;
        if (rm[1]) { start = +rm[1]; end = rm[2] ? Math.min(+rm[2], size - 1) : size - 1; }
        else { start = Math.max(0, size - +rm[2]); end = size - 1; }
        if (start > end || start >= size) {
          return new Response(null, { status: 416, headers: { 'content-range': 'bytes */' + size } });
        }
        status = 206; body = data.slice(start, end + 1);
        h.set('content-range', 'bytes ' + start + '-' + end + '/' + size);
      }
      h.set('content-length', String(body.byteLength));
      return new Response(method === 'HEAD' ? null : body, { status: status, headers: h });
    }
    if (!(await isAdmin(req, env))) return json({ error: 'unauthorized' }, 401);
    if (method === 'PUT') {
      var type = (req.headers.get('content-type') || '').split(';')[0];
      if (!/^audio\//.test(type) && type !== 'video/webm' && type !== 'video/mp4') return json({ error: 'bad-type' }, 415);
      var buf = await req.arrayBuffer();
      if (!buf.byteLength) return json({ error: 'empty' }, 400);
      if (buf.byteLength > MAX_AUDIO) return json({ error: 'too-large' }, 413);
      var v = Date.now();
      await env.STORE.put(key, buf, { metadata: { type: req.headers.get('content-type') || type, v: v } });
      var idx = await readIndex();
      idx[id] = v;
      await env.STORE.put('audio-index', JSON.stringify(idx));
      return json({ ok: true, v: v, size: buf.byteLength });
    }
    if (method === 'DELETE') {
      await env.STORE.delete(key);
      var idx2 = await readIndex();
      delete idx2[id];
      await env.STORE.put('audio-index', JSON.stringify(idx2));
      return json({ ok: true });
    }
    return json({ error: 'method' }, 405);
  }

  if (path === 'chiem-nghiem') {
    var dkey = 'data:chiem-nghiem';
    if (method === 'GET') {
      var text = await env.STORE.get(dkey, Object.assign({ type: 'text' }, cacheOpt));
      return new Response(text || '{"sections":[]}', { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache' } });
    }
    if (method === 'PUT') {
      if (!(await isAdmin(req, env))) return json({ error: 'unauthorized' }, 401);
      var payload;
      try { payload = await req.json(); } catch (e) { return json({ error: 'bad-request' }, 400); }
      var clean = cleanSections(payload && payload.sections);
      if (!clean) return json({ error: 'bad-data' }, 400);
      await env.STORE.put(dkey, JSON.stringify({ sections: clean }));
      return json({ ok: true, count: clean.length });
    }
    return json({ error: 'method' }, 405);
  }

  return json({ error: 'not-found' }, 404);
}
