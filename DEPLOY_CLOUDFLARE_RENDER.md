# Triển khai Candlet Shop: Cloudflare Pages + Render

Kiến trúc đề xuất:

- `https://candlet.shop`: React/Vite trên Cloudflare Pages.
- `https://api.candlet.shop`: Node/Express trên Render.
- MongoDB Atlas lưu dữ liệu và Cloudinary lưu ảnh.

## 1. Đổi khóa đã lộ trước khi triển khai

1. Trong MongoDB Atlas, mở **Database Access**.
2. Chọn tài khoản cơ sở dữ liệu đang dùng, bấm **Edit** rồi tạo mật khẩu mạnh mới.
3. Cập nhật `MONGODB_URI` trong file `.env` cục bộ và sau này trong Render.
4. Không dùng lại mật khẩu cũ. File `.env` không được commit.

Khóa Goong trong `.env` frontend là khóa phía trình duyệt nên người dùng có thể đọc được. Hãy giới hạn khóa theo tên miền `candlet.shop` trong trang quản trị Goong và dùng một khóa riêng cho localhost nếu nhà cung cấp hỗ trợ.

## 2. Đưa backend lên Render

1. Đăng nhập Render và chọn **New > Blueprint**.
2. Kết nối repository `candletsales-be`. Render sẽ đọc `render.yaml` ở thư mục gốc.
3. Điền tất cả biến có `sync: false` trong màn hình tạo Blueprint. Không nhập bí mật vào `render.yaml`.
4. Với MongoDB Atlas, thêm địa chỉ outbound của Render vào **Network Access**. Nếu gói Render không có IP cố định, có thể tạm dùng `0.0.0.0/0`, đồng thời bắt buộc dùng mật khẩu mạnh, tài khoản DB riêng cho ứng dụng và quyền tối thiểu.
5. Kiểm tra `https://<ten-dich-vu>.onrender.com/api/health` trả về HTTP 200.
6. Trong Render, thêm custom domain `api.candlet.shop`. Render sẽ hiển thị đích DNS cần cấu hình.

Không tự đặt biến `PORT`; Render cung cấp biến này cho ứng dụng.

Webhook thanh toán dùng URL:

`https://api.candlet.shop/api/sepay/webhook`

Sau khi domain hoạt động, cập nhật URL callback trong Google/Facebook tương ứng với các giá trị trong `render.yaml`.

## 3. Đưa frontend lên Cloudflare Pages

1. Chuyển nameserver của `candlet.shop` sang Cloudflare theo hướng dẫn trong dashboard Cloudflare.
2. Vào **Workers & Pages > Create > Pages > Connect to Git** và chọn repository `candletsales-fe`.
3. Đặt **Build command** là `npm run build`, **Build output directory** là `dist`.
4. Thêm biến môi trường production:
   - `VITE_API_URL=https://api.candlet.shop/api`
   - `VITE_GOONG_API_KEY=<khoa-da-gioi-han-ten-mien>`
5. Deploy, sau đó thêm custom domain `candlet.shop` trong dự án Pages.
6. Tạo bản ghi DNS cho `api` theo chính xác hướng dẫn custom domain của Render.

Cloudflare Pages tự xử lý fallback cho ứng dụng SPA khi dự án không có `404.html`. Hàm `functions/s/[token].js` tạo thẻ Open Graph cho link theo dõi `/s/<ma>` và tự dùng đúng domain đang truy cập.

## 4. Kiểm tra trước khi mở bán

- Mở trang chủ, đăng nhập, giỏ hàng, thanh toán và tra cứu đơn trên điện thoại.
- Gửi một link `/s/<ma>` qua Facebook Messenger và kiểm tra ảnh preview.
- Tạo một đơn thử có giá trị nhỏ, xác nhận webhook SePay và email thông báo.
- Kiểm tra ảnh mới được lưu trên Cloudinary, không phụ thuộc ổ đĩa tạm của Render.
- Bật sao lưu MongoDB Atlas và xác thực hai lớp cho GitHub, Cloudflare, Render, MongoDB, Cloudinary.
