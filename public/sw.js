/* Service worker: lưu sách để đọc khi không có mạng.
   Trang, mã nguồn và nội dung lấy bản mới từ mạng trước (tối đa 4 giây), chỉ khi không có mạng
   mới dùng bản đã lưu. Nhờ vậy đưa bản mới lên host là thấy ngay ở lần mở kế tiếp.
   Mỗi lần sửa, nên đổi VERSION để máy người đọc dọn bộ nhớ cũ. */
var VERSION = 'tkk-v6';
var FONTS = 'tkk-fonts-v1';
var SHELL = [
  './', 'index.html', 'css/style.css', 'js/content.js', 'js/chiem-nghiem.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function networkFirst(req) {
  var fromCache = caches.match(req).then(function (hit) {
    return hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined);
  });
  return new Promise(function (resolve) {
    var settled = false;
    var timer = setTimeout(function () {
      fromCache.then(function (hit) { if (hit && !settled) { settled = true; resolve(hit); } });
    }, 4000);
    fetch(req, { cache: 'no-cache' }).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
      }
      if (!settled) { settled = true; resolve(res); }
    }).catch(function () {
      clearTimeout(timer);
      fromCache.then(function (hit) { if (!settled) { settled = true; resolve(hit || Response.error()); } });
    });
  });
}

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin && /\/api\//.test(url.pathname)) {
    /* chỉ lưu danh sách bài và chiêm nghiệm chung để đọc khi mất mạng; âm thanh và đăng nhập đi thẳng ra mạng */
    if (/\/api\/(audio-list|chiem-nghiem)$/.test(url.pathname)) e.respondWith(networkFirst(req));
    return;
  }
  if (url.origin === self.location.origin && /\/admin(\.html)?$|\/js\/admin\.js$/.test(url.pathname)) return;
  if (url.origin === self.location.origin) {
    e.respondWith(networkFirst(req));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(req, FONTS));
  }
});
