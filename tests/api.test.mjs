import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/[[path]].js';
import worker from '../worker.js';
import { fakeKV } from './fake-kv.mjs';

const env = { STORE: fakeKV(), ADMIN_PASSWORD: 'mat-khau-thu', ASSETS: { fetch: async () => new Response('tinh') } };
const call = (p, o = {}) => onRequest({ request: new Request('https://x.test/api/' + p, o), env });
let cookie = '';

test('thiếu cấu hình thì 503', async () => {
  assert.equal((await onRequest({ request: new Request('https://x.test/api/me'), env: {} })).status, 503);
});
test('sai mật khẩu 401, đúng mật khẩu cấp cookie an toàn', async () => {
  assert.equal((await call('login', { method: 'POST', body: JSON.stringify({ password: 'sai' }) })).status, 401);
  const r = await call('login', { method: 'POST', body: JSON.stringify({ password: 'mat-khau-thu' }) });
  assert.equal(r.status, 200);
  const set = r.headers.get('set-cookie');
  assert.match(set, /HttpOnly/); assert.match(set, /Secure/); assert.match(set, /SameSite=Strict/);
  cookie = set.split(';')[0];
});
test('cookie giả bị từ chối, cookie thật được nhận', async () => {
  assert.equal((await (await call('me', { headers: { cookie: 'tkk_admin=9999999999.abc' } })).json()).admin, false);
  assert.equal((await (await call('me', { headers: { cookie } })).json()).admin, true);
});
test('ghi cần đăng nhập và đúng origin', async () => {
  assert.equal((await call('audio/s01', { method: 'PUT', headers: { 'content-type': 'audio/webm' }, body: new Uint8Array([1]) })).status, 401);
  assert.equal((await call('audio/s01', { method: 'PUT', headers: { cookie, origin: 'https://evil.test', 'content-type': 'audio/webm' }, body: new Uint8Array([1]) })).status, 403);
  assert.equal((await call('audio/s02', { method: 'PUT', headers: { cookie, 'content-type': 'text/html' }, body: 'x' })).status, 415);
});
test('thu âm: lưu, liệt kê, đọc, tua, xóa', async () => {
  const put = await call('audio/s01', { method: 'PUT', headers: { cookie, 'content-type': 'audio/webm;codecs=opus' }, body: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) });
  assert.equal(put.status, 200);
  assert.equal(typeof (await (await call('audio-list')).json()).items.s01, 'number');
  assert.equal((await (await call('audio/s01')).arrayBuffer()).byteLength, 10);
  const r = await call('audio/s01', { headers: { range: 'bytes=2-5' } });
  assert.equal(r.status, 206); assert.equal(r.headers.get('content-range'), 'bytes 2-5/10');
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [3, 4, 5, 6]);
  const tail = await call('audio/s01', { headers: { range: 'bytes=-3' } });
  assert.equal(tail.status, 206); assert.equal(tail.headers.get('content-range'), 'bytes 7-9/10');
  assert.equal((await call('audio/s01', { headers: { range: 'bytes=50-60' } })).status, 416);
  assert.equal((await call('audio/zz')).status, 404);
  assert.equal((await call('audio/s01', { method: 'DELETE', headers: { cookie } })).status, 200);
  assert.equal((await call('audio/s01')).status, 404);
  assert.equal((await (await call('audio-list?fresh=1')).json()).items.s01, undefined);
});
test('chiêm nghiệm chung: lưu, làm sạch, từ chối dữ liệu sai', async () => {
  const ok = await call('chiem-nghiem', { method: 'PUT', headers: { cookie }, body: JSON.stringify({ sections: [{ id: 'a-1', title: 'Điều mới', paras: ['Đoạn một', ' ', 'Đoạn hai'] }] }) });
  assert.equal(ok.status, 200);
  assert.equal((await (await call('chiem-nghiem')).json()).sections[0].paras.length, 2);
  assert.equal((await call('chiem-nghiem', { method: 'PUT', headers: { cookie }, body: JSON.stringify({ sections: [{ id: 'Sai Id', title: 't', paras: ['x'] }] }) })).status, 400);
  assert.equal((await call('chiem-nghiem', { method: 'PUT', body: '{}' })).status, 401);
});
test('worker: /api đi vào API, còn lại trả file tĩnh', async () => {
  assert.equal((await worker.fetch(new Request('https://x.test/api/me'), env, {})).status, 200);
  assert.equal(await (await worker.fetch(new Request('https://x.test/admin'), env, {})).text(), 'tinh');
});
