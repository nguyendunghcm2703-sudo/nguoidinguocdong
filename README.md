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

Các điều chiêm nghiệm nằm ở file riêng `js/chiem-nghiem.js`. Thêm một đối tượng `{ id: 'ten-ngan', title: '...', paras: ['...', '...'] }` vào `sections`; sách tự thêm một trang cho mỗi mục. `id` ngắn, không dấu, giúp mục Ghi tâm của người đọc không bị lệch khi bạn chèn thêm hoặc đổi thứ tự. `closing` (câu kết) và `spirit` (các ý chính) hiện ở cuối danh sách. Chiêm nghiệm là một khu riêng, mở từ mục lục hoặc trang cuối, không nằm trong dòng lật trang của 20 truyện.

## Ghi tâm

Nút “Ghi tâm” (biểu tượng trái tim ở đầu trang) là nơi người đọc giữ lại các truyện, điều chiêm nghiệm đã chạm vào mình và tự viết điều của riêng mình. Dữ liệu lưu trên thiết bị (`localStorage`, khóa `tkk-tam`), có nút “Sao chép tất cả”. Dữ liệu “hũ” của bản cũ được tự chuyển sang.

## Cài đặt và cập nhật

Mục lục có phần Cài đặt để bật, tắt hiệu ứng cây bút (mặc định theo thiết bị). Service worker lấy bản mới từ mạng trước, nên đưa bản mới lên host là thấy ở lần mở kế tiếp; máy đang mở sách sẽ hiện thanh “Có bản mới của sách”. Vẫn nên đổi `VERSION` trong `sw.js` sau mỗi lần sửa.

## Giọng đọc

Nút “Đọc to” dùng giọng có sẵn trên thiết bị. Chrome trên máy tính thường không có giọng tiếng Việt (Edge thì có); khi đó sách hiện hướng dẫn cài giọng hoặc dùng Edge.

## Làm lại icon

```
npm i playwright   # nếu chưa có
node make-icons.js
```

## Ghi chú nội dung

Sáu truyện được đánh dấu trong `content.js`: năm truyện `kind: 'real'` kể lại chuyện có thật từ báo (Tiền Phong, Báo Đại biểu Nhân dân, Tuổi Trẻ, NPR), một truyện `kind: 'idea'` lấy ý từ bài báo. Tất cả đều viết lại bằng lời của sách, không nêu tên người, và hiện nguồn cuối truyện. Các truyện còn lại là sáng tác. Các câu trích kinh điển được diễn đạt lại bằng tiếng Việt hiện đại; chỗ ghi "(ý)" nghĩa là diễn ý, không phải bản dịch từng chữ. Nếu sau này thêm truyện lấy cảm hứng từ báo chí, hãy viết lại bằng lời của mình, đổi tên người và ghi nguồn.
