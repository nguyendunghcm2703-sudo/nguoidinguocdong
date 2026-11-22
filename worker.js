/* Worker của sách: /api/* chạy mã quản trị (đăng nhập, thu âm, chiêm nghiệm chung),
   mọi đường dẫn khác do Cloudflare phục vụ từ thư mục dist/ (xem wrangler.jsonc).
   Mật khẩu là secret ADMIN_PASSWORD, kho lưu là KV namespace gắn với tên STORE. */
import { onRequest } from './functions/api/[[path]].js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return onRequest({ request, env, ctx });
    }
    return env.ASSETS.fetch(request);
  }
};
