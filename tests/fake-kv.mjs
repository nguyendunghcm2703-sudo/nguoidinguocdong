// KV giả trong bộ nhớ, đủ dùng cho bài kiểm thử và server dev
export function fakeKV() {
  const m = new Map();
  const asType = (v, type) => type === 'json' ? JSON.parse(Buffer.from(v).toString()) : type === 'text' ? Buffer.from(v).toString() : v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength);
  return {
    m,
    async put(k, v, o) { m.set(k, { buf: typeof v === 'string' ? new Uint8Array(Buffer.from(v)) : new Uint8Array(v), meta: o?.metadata }); },
    async get(k, o) { const e = m.get(k); if (!e) return null; return asType(e.buf, o?.type || 'text'); },
    async getWithMetadata(k, o) { const e = m.get(k); if (!e) return { value: null, metadata: null }; return { value: asType(e.buf, o?.type || 'text'), metadata: e.meta }; },
    async delete(k) { m.delete(k); }
  };
}
