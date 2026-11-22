/* Build: chép thư mục public/ sang dist/, đổi tên cache của service worker theo mỗi lần build,
   rồi làm rối ở mức vừa các file logic (app.js, admin.js). File nội dung và sw.js để nguyên.
   node build.mjs            đầy đủ, có làm rối (Cloudflare chạy lệnh này)
   node build.mjs --plain    không làm rối, để thử trên máy (npm run dev)
   node build.mjs --no-obfuscate */
import fs from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const plain = args.has('--plain');
const noObf = plain || args.has('--no-obfuscate');
const SRC = 'public';
const OUT = 'dist';

if (!plain && /"id"\s*:\s*"DAN-ID-KV-VAO-DAY"/.test(fs.readFileSync('wrangler.jsonc', 'utf8'))) {
  console.error('Chưa điền ID của KV namespace vào wrangler.jsonc (chỗ DAN-ID-KV-VAO-DAY). Xem README.');
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true });

// Đổi tên cache của service worker để máy người đọc nhận bản mới sau mỗi lần deploy.
const swPath = path.join(OUT, 'sw.js');
const stamp = Date.now().toString(36);
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace(/tkk-v\d+/, `tkk-${stamp}`));

if (noObf) {
  console.log(plain ? 'build:plain xong, không làm rối -> dist/' : 'Bỏ qua bước làm rối (--no-obfuscate) -> dist/');
  process.exit(0);
}

let JavaScriptObfuscator;
try {
  ({ default: JavaScriptObfuscator } = await import('javascript-obfuscator'));
} catch (e) {
  console.error('Thiếu gói javascript-obfuscator. Chạy "npm install" trước, hoặc dùng "node build.mjs --no-obfuscate".');
  process.exit(1);
}

const options = {
  sourceType: 'script',               // app.js và admin.js là script thường, không phải module
  compact: true,
  simplify: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,               // giữ window.BOOK, window.CHIEM_NGHIEM
  renameProperties: false,            // giữ tên thuộc tính để không hỏng API trình duyệt và dữ liệu
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  rotateStringArray: true,
  shuffleStringArray: true,
  stringArrayWrappersCount: 1,
  splitStrings: false,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.15,
  controlFlowFlattening: false,       // nặng và làm chậm trên điện thoại cũ
  selfDefending: false,
  debugProtection: false,
  disableConsoleOutput: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  target: 'browser'
};

for (const f of ['app.js', 'admin.js']) {
  const file = path.join(OUT, 'js', f);
  const before = fs.statSync(file).size;
  const out = JavaScriptObfuscator.obfuscate(fs.readFileSync(file, 'utf8'), options).getObfuscatedCode();
  fs.writeFileSync(file, out);
  console.log(`  làm rối ${f}: ${before} -> ${out.length} byte`);
}
console.log('build xong -> dist/');
