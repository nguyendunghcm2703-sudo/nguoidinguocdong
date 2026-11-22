/* Tạo icon PNG từ SVG bằng Playwright. Chạy: node make-icons.js */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function svg(size, maskable) {
  const pad = maskable ? 0 : size * 0.0;
  const s = size / 512;
  // người đi bộ hướng sang trái trước mặt trời, nằm gọn trong vùng an toàn 80%
  const k = maskable ? 0.78 : 0.92;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17132b"/><stop offset=".6" stop-color="#3a2a63"/><stop offset="1" stop-color="#b45a3c"/></linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd9a0"/><stop offset=".5" stop-color="#ff9f5a" stop-opacity=".5"/><stop offset="1" stop-color="#ff7a45" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="512" height="512" ${maskable ? '' : 'rx="104"'} fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${k}) translate(-256 -256)">
    <circle cx="256" cy="340" r="190" fill="url(#sun)"/>
    <circle cx="256" cy="330" r="64" fill="#ffe3b3"/>
    <path d="M70 410H442" stroke="#fff" stroke-opacity=".25" stroke-width="5" stroke-linecap="round"/>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M256 300 L238 370" stroke="#f2b25e" stroke-width="22"/>
      <path d="M256 300 L292 330" stroke="#f2b25e" stroke-width="22"/>
      <path d="M256 300 L226 410" stroke="#f2b25e" stroke-width="22"/>
      <path d="M244 205 L256 300" stroke="#ffd98a" stroke-width="42"/>
      <path d="M244 215 C300 190 340 215 392 196" stroke="#e8543c" stroke-width="14"/>
    </g>
    <circle cx="232" cy="172" r="26" fill="#ffd98a"/>
  </g>
</svg>`;
}

(async () => {
  const out = path.join(__dirname, 'public', 'icons');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const jobs = [
    ['icon-192.png', 192, false],
    ['icon-512.png', 512, false],
    ['icon-maskable-512.png', 512, true],
    ['apple-touch-icon.png', 180, true]
  ];
  for (const [name, size, mask] of jobs) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<body style="margin:0;background:transparent">${svg(size, mask)}</body>`);
    await p.screenshot({ path: path.join(out, name), omitBackground: true });
    await p.close();
  }
  fs.writeFileSync(path.join(out, 'icon.svg'), svg(512, false));
  await b.close();
  console.log('ok');
})();
