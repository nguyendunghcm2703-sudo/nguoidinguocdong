# Từng Khoảnh Khắc

Sách điện tử PWA: 20 câu chuyện nhỏ, phương ngôn và một việc nhỏ mỗi ngày. HTML, CSS, JS thuần, không cần build.

## Cấu trúc

- `public/`: toàn bộ sách (HTML, CSS, JS, icon). Sửa nội dung ở đây.
- `worker.js`, `functions/api/`: phần API cho trang quản trị (đăng nhập, thu âm, chiêm nghiệm chung).
- `build.mjs`: chép `public/` sang `dist/`, đổi tên cache của service worker theo mỗi lần build, làm rối mức vừa `app.js` và `admin.js`.
- `wrangler.jsonc`: cấu hình Worker (thư mục `dist/`, KV namespace `STORE`).
- `tests/`: kiểm thử phần API, chạy bằng `npm test`.

## Chạy thử trên máy

```
npm install
npm run dev        # build không làm rối rồi chạy wrangler dev (cần ADMIN_PASSWORD trong .dev.vars; KV chạy giả lập trên máy)
```

Chỉ xem sách thôi thì cũng có thể chạy `python3 -m http.server 8080` trong thư mục `public/`, nhưng khi đó trang quản trị và `/api` không có.

## Đưa lên mạng (Cloudflare Workers, nối GitHub)

Giống các project khác của bạn: đẩy lên GitHub, Cloudflare tự build.

1. Cloudflare, *Storage & Databases, KV*, **Create a KV namespace**: đặt tên (ví dụ `tung-khoanh-khac`), chọn **Standard**. Tạo xong, copy cột **ID** của namespace.
2. Mở `wrangler.jsonc`, dán ID đó vào chỗ `DAN-ID-KV-VAO-DAY`. (Build sẽ dừng và báo nếu bạn quên.)
3. Workers & Pages, tạo Worker từ repo GitHub. Tên Worker phải trùng `name` trong `wrangler.jsonc` (mặc định `tung-khoanh-khac`).
4. Build command: `npm run build`. Deploy command: `npx wrangler deploy`.
5. Settings, Runtime variables and secrets, Add variable: tên `ADMIN_PASSWORD`, loại **Secret**, giá trị là mật khẩu (nên dài, khó đoán). Mật khẩu chỉ nằm ở Cloudflare, không có trong mã nguồn. Phải chọn loại Secret để mật khẩu không bị xóa khi deploy lại.
6. Đẩy code lên GitHub. Vào `https://địa-chỉ-của-bạn/admin`, nhập mật khẩu.

KV gói Free cho 100.000 lượt đọc, 1.000 lượt ghi mỗi ngày, 1 GB lưu trữ, mỗi bản thu tối đa 24 MB (vượt thì Cloudflare báo lỗi đến 00:00 UTC). Người đọc có thể thấy bản thu hoặc điều chiêm nghiệm mới chậm tối đa khoảng một phút.

Đổi mật khẩu: sửa secret rồi deploy lại, mọi phiên đăng nhập cũ tự hết hiệu lực. Phiên đăng nhập kéo dài 8 giờ. Nếu bước build báo thiếu `javascript-obfuscator`, chạy `npm install` rồi commit file `package-lock.json`.

## Trang quản trị

- **Thu âm**: chọn bài, bấm Thu âm, đọc theo chữ hiện trên màn hình, dừng, nghe lại, rồi Lưu. Bài đã có thu thì nút Nghe ở đầu bài phát giọng của bạn; bài chưa thu dùng giọng máy. Mỗi bài lưu một giá trị trong KV, thu lại sẽ thay file cũ.
- **Chiêm nghiệm chung**: thêm, sửa, đổi thứ tự, xóa những điều hiện cho mọi người đọc, nằm ở tab Chung của mục Chiêm nghiệm. Lưu trong KV, hiện ở lần mở sách kế tiếp, không cần deploy lại.
- Người đọc tự viết ở tab Của bạn, lưu trên máy họ.
- File âm thanh nghe được khi có mạng; âm thanh không lưu sẵn trong máy để nghe lúc mất mạng.

## Thêm hoặc sửa truyện

Mở `public/js/content.js`, thêm một đối tượng vào mảng `stories` (id mới, part là `dawn`, `morning`, `noon`, `dusk` hoặc `night`). Không cần sửa file nào khác.

Không cần đổi số phiên bản: mỗi lần build, `build.mjs` tự đổi tên cache của service worker để điện thoại người đọc nhận bản mới.

## Thêm điều chiêm nghiệm

Có hai cách. Các điều "có sẵn" nằm trong file `public/js/chiem-nghiem.js`: thêm một đối tượng `{ id: 'ten-ngan', title: '...', paras: ['...', '...'] }` vào `sections`, sách tự thêm một trang. `id` ngắn, không dấu, để mục Ghi tâm của người đọc không bị lệch khi bạn chèn thêm. Cách thứ hai là thêm ngay trong trang quản trị, không cần sửa file hay deploy lại. `closing` và `spirit` trong file là câu kết và các ý chính, hiện ở cuối tab Chung.

## Menu và Ghi tâm

Menu cố định ở đầu trang có hai mục: Đọc sách và Chiêm nghiệm. “Ghi tâm” là nút ở cuối mỗi truyện và mỗi điều chiêm nghiệm (thay cho “Lưu vào hũ” ở bản đầu); những điều đã ghi tâm hiện ở trang cuối sách. Dữ liệu lưu trên thiết bị (`localStorage`, khóa `tkk-tam`), dữ liệu “hũ” của bản cũ được tự chuyển sang.

## Cài đặt và cập nhật

Mục lục có phần Cài đặt: bật, tắt hiệu ứng cây bút (mặc định theo thiết bị) và chọn giao diện Cổ (mặc định), Đêm đèn dầu hoặc Hiện đại. Service worker lấy bản mới từ mạng trước, nên đưa bản mới lên host là thấy ở lần mở kế tiếp; máy đang mở sách sẽ hiện thanh “Có bản mới của sách”.

## Nghe

Nút Nghe nằm ngay dưới tiêu đề mỗi bài; “Nghe cả sách” ở trang bìa và mục lục phát liên tục từ truyện đầu đến truyện cuối và tự sang trang. Bài có file thu thì phát file; bài chưa thu dùng giọng có sẵn trên thiết bị. Chrome trên máy tính thường không có giọng tiếng Việt (Edge thì có); khi đó sách hiện hướng dẫn cài giọng hoặc dùng Edge.

## Làm lại icon

```
npm i playwright   # nếu chưa có
node make-icons.cjs
```

## Ghi chú nội dung

Sáu truyện được đánh dấu trong `content.js`: năm truyện `kind: 'real'` kể lại chuyện có thật từ báo (Tiền Phong, Báo Đại biểu Nhân dân, Tuổi Trẻ, NPR), một truyện `kind: 'idea'` lấy ý từ bài báo. Tất cả đều viết lại bằng lời của sách, không nêu tên người, và hiện nguồn cuối truyện. Các truyện còn lại là sáng tác. Các câu trích kinh điển được diễn đạt lại bằng tiếng Việt hiện đại; chỗ ghi "(ý)" nghĩa là diễn ý, không phải bản dịch từng chữ. Nếu sau này thêm truyện lấy cảm hứng từ báo chí, hãy viết lại bằng lời của mình, đổi tên người và ghi nguồn.
