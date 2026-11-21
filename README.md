# Từng Khoảnh Khắc

Sách điện tử PWA: 20 câu chuyện nhỏ, phương ngôn và một việc nhỏ mỗi ngày. HTML, CSS, JS thuần, không cần build.

## Chạy thử trên máy

```
python3 -m http.server 8080
```

Mở http://localhost:8080. Service worker chỉ chạy trên localhost hoặc HTTPS.

## Đưa lên mạng

- **Netlify**: kéo thả cả thư mục này vào https://app.netlify.com/drop, hoặc nối với repo GitHub (build command để trống, publish directory là `/`).
- **Cloudflare Pages**: nối repo GitHub, build command để trống, output directory là `/`.

## Thêm hoặc sửa truyện

Mở `js/content.js`, thêm một đối tượng vào mảng `stories` (id mới, part là `dawn`, `morning`, `noon`, `dusk` hoặc `night`). Không cần sửa file nào khác.

Sau mỗi lần sửa nội dung hoặc giao diện, đổi số trong `sw.js` (`var VERSION = 'tkk-v1'` thành `tkk-v2`...) để điện thoại người đọc tải bản mới.

## Thêm điều chiêm nghiệm

Trong `js/content.js`, thêm một đối tượng `{ title: '...', paras: ['...', '...'] }` vào `reflections.sections`. Sách tự thêm một trang cho mỗi mục, hiện sau truyện cuối và trước trang kết. Câu kết (`closing`) và các ý chính (`spirit`) tự hiện ở trang chiêm nghiệm cuối cùng; nhớ sửa chữ "bốn điều" trong câu kết nếu số mục thay đổi.

## Làm lại icon

```
npm i playwright   # nếu chưa có
node make-icons.js
```

## Ghi chú nội dung

Sáu truyện được đánh dấu trong `content.js`: năm truyện `kind: 'real'` kể lại chuyện có thật từ báo (Tiền Phong, Báo Đại biểu Nhân dân, Tuổi Trẻ, NPR), một truyện `kind: 'idea'` lấy ý từ bài báo. Tất cả đều viết lại bằng lời của sách, không nêu tên người, và hiện nguồn cuối truyện. Các truyện còn lại là sáng tác. Các câu trích kinh điển được diễn đạt lại bằng tiếng Việt hiện đại; chỗ ghi "(ý)" nghĩa là diễn ý, không phải bản dịch từng chữ. Nếu sau này thêm truyện lấy cảm hứng từ báo chí, hãy viết lại bằng lời của mình, đổi tên người và ghi nguồn.
