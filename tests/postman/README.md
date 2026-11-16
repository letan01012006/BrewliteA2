# Test toàn bộ API BrewLite A2 bằng Postman

## Khởi động

Tại root repo, sau khi cài dependencies của `apps/api` và chuẩn bị `.env`:

```powershell
docker compose up -d --wait db
npm.cmd --prefix apps/api run postman:dev
```

Giữ terminal chạy. API test: **http://localhost:4101/api**; Swagger: **http://localhost:4101/api/docs**. Mặc định dùng **4101** vì 4000 là API A2 và 4001 thuộc dự án BrewLite khác trên máy. Có thể đổi bằng `POSTMAN_PORT`.

Launcher generate Prisma, migrate và seed `TEST_DATABASE_URL` (database `brewlite_test`, PostgreSQL A2 tại port 5433 trong thiết lập hiện tại). Database phải tồn tại và khác `DATABASE_URL`. Profile dùng OTP local **123456**, WALLET/CARD giả lập và secret riêng mỗi lần khởi động; không sửa secret trong `.env`. Khởi động lại profile thì đăng nhập lại.

## Import vào Postman

Chọn **Import** và chọn ba file cùng thư mục:

| File | Sử dụng |
| --- | --- |
| `BrewLiteA2.postman_collection.json` | **BrewLite A2 — Swagger (46 API)**: Send từng API như Swagger |
| `BrewLiteA2.auto.postman_collection.json` | **BrewLite A2 — Chạy toàn bộ API**: Run theo thứ tự |
| `BrewLiteA2.postman_environment.json` | Environment **BrewLite A2 — Postman Demo**, base_url `http://localhost:4101/api` |

Collection thủ công có đúng **46 method/path**, chia **10 nhóm giống Swagger**: App, ingredients, products, inventory, auth, admin/staff, orders, payments, promotions, Health. Có cả API sửa và xóa nhân viên mới.

## Chạy toàn bộ

1. Chọn environment **BrewLite A2 — Postman Demo**.
2. Chọn collection **BrewLite A2 — Chạy toàn bộ API** → **Run**.
3. Giữ đủ **79 request**, **1 iteration**, chạy theo thứ tự.

Kết quả đã xác nhận bằng Newman: **79/79 request, 124/124 assertions, 0 lỗi**. Luồng gọi đủ 46 endpoint và tự lưu token/ID:

- Đăng ký, OTP, đăng nhập SĐT/email, quyền CUSTOMER/BARISTA/MANAGER và giới hạn gửi lại OTP.
- Thực đơn, topping, nguyên liệu, nhập/hao hụt, chống nhập trùng, lịch sử kho, công thức và bật/tắt bán.
- Tạo đơn, khuyến mãi, WALLET/CARD giả lập, chống thanh toán trùng, pha chế/hoàn tất, hủy, hoàn tiền và thanh toán/hoàn điểm.
- Quản lý thêm/sửa/xóa nhân viên, thu hồi JWT và chặn đăng nhập sau xóa; tạo nhân viên mới còn hoạt động để thử tiếp.
- Callback VNPAY sai chữ ký bị từ chối và thiếu cấu hình VNPAY trả lỗi đúng.

Các response **400/401/403/404/429/503** có tên mô tả từ chối hoặc thiếu cấu hình là test có chủ đích: assertions vẫn phải xanh. Resend-OTP thử nhánh giới hạn 60 giây, không tự đợi để gửi lại thành công. Thanh toán ngân hàng VNPAY thật không nằm trong kết quả 79/124; cần sandbox và callback có chữ ký hợp lệ. Profile này không gửi SMS hoặc giao dịch ngân hàng thật.

Mỗi lượt Run tạo dữ liệu mới trong database test. Collection tự động kiểm tra địa chỉ API test trước khi gửi. Chạy xong có token các vai trò và một đơn PENDING trong environment để thử Send thủ công. Collection Swagger dùng gọi riêng, không Run theo thứ tự nhóm vì các thao tác phụ thuộc trạng thái đơn/kho.

## Đăng nhập và gọi từng API

Mở **auth → POST /api/auth/login**. Đổi `login_role` trong environment rồi Send:

| login_role | Đăng nhập mẫu | Mật khẩu | Token lưu |
| --- | --- | --- | --- |
| `CUSTOMER` | Email `demo@brewlite.com` hoặc khách mới từ Run | `Demo@1234` hoặc `customer_password` | `customer_token` |
| `BARISTA` | Email `barista@brewlite.com` | `Barista@123` | `barista_token` |
| `MANAGER` | SĐT `0900000001` | `Manager@123` | `manager_token` |
| `STAFF` | `staff_phone` của nhân viên mới | `staff_password` | `staff_token` |

`STAFF` là lựa chọn đăng nhập nhân viên; quyền backend vẫn là **BARISTA**. A2 dùng **MANAGER** để thêm/sửa/xóa nhân viên và bật/tắt bán sản phẩm. `GET /api/auth/me` dùng `auth_token` của lần đăng nhập/xác thực OTP gần nhất. Mỗi API khác dùng token đúng vai trò, không cần chép JWT thủ công.

`CUSTOMER` giữ body đang hiển thị để bạn sửa email/phone và mật khẩu. Các lựa chọn khác tự điền từ biến tương ứng. Nếu không chọn environment, collection có giá trị mặc định và lưu token/ID vào collection variables.

GET danh sách thực đơn/nguyên liệu/topping chọn ID nếu đang trống. POST tạo mới lưu ID tương ứng. API kho dùng `quantity` dạng chuỗi thập phân, ví dụ `"1000.000"`. Tạo nguyên liệu → nhập kho → tạo món/topping → gắn công thức trước khi đặt món mới.

Request tạo đơn/thanh toán/nhập/điều chỉnh giữ Idempotency-Key khi Send lại. Khi muốn làm thao tác mới hoặc đổi body, xóa `order_key`, `payment_key`, `receipt_key` hoặc `adjustment_key` để sinh khóa mới. Hủy/hoàn tiền cần đơn ở trạng thái cho phép; đơn COMPLETED không hủy được.

VNPAY IPN/return cần tham số và chữ ký thật từ sandbox; không dùng query của URL khởi tạo thanh toán thay callback. Để gọi ứng dụng cổng 4000, sao chép environment và đổi base_url, rồi đăng nhập bằng tài khoản thuộc database đó. OTP/mô phỏng chỉ được bảo đảm ở profile 4101.

## Kiểm tra và cập nhật

Giữ API test chạy, mở terminal thứ hai tại root:

```powershell
# Đối chiếu collection, nhóm, biến và script với Swagger snapshot.
npm.cmd --prefix apps/api run postman:verify

# Chạy 79 request bằng Newman (tải từ npm vào cache lần đầu).
npm.cmd --prefix apps/api run postman:test

# Khi API đổi: lấy Swagger mới và tạo lại collection/environment.
npm.cmd --prefix apps/api run postman:generate
```

Generate lưu snapshot `BrewLiteA2.openapi.json`, kiểm tra mọi route có ví dụ và có trong luồng tự động. Token trong các file import luôn trống. Để dùng cổng khác, khởi động profile với POSTMAN_PORT tương ứng rồi generate bằng URL đó, ví dụ `npm.cmd --prefix apps/api run postman:generate -- http://localhost:4102`.
