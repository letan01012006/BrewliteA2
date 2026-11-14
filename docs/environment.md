# Cấu hình môi trường

## File cần chỉnh

| File | Vai trò | Đưa vào Git |
| --- | --- | --- |
| `.env` ở root | Docker Compose/PostgreSQL | Không |
| `apps/api/.env` | Đầy đủ cấu hình API: 29 biến | Không |
| `apps/web/.env.local` | URL backend cho proxy Next.js | Không |
| Ba file `.env.example` tương ứng | Tên biến và giá trị mẫu để thiết lập máy khác | Có |

`apps/api/.env` là file tương ứng với `brewlite/backend/.env` của A1. `.env` ở root chỉ phục vụ Compose, không cần lặp lại khóa JWT, OTP, eSMS hoặc VNPAY.

## Nhóm biến API

| Nhóm | Biến |
| --- | --- |
| Runtime | `PORT`, `NODE_ENV` |
| Database | `DATABASE_URL`, `TEST_DATABASE_URL` |
| JWT và OTP | `JWT_SECRET`, `JWT_EXPIRES_IN`, `OTP_HASH_SECRET`, `AUTH_OTP_DEMO` |
| SMS/eSMS | `SMS_PROVIDER`, `ESMS_API_KEY`, `ESMS_SECRET_KEY`, `ESMS_BRANDNAME`, `ESMS_OTP_TEMPLATE`, `ESMS_TIMEOUT_MS` |
| Demo seed tùy chọn | `AUTH_DEMO_SEED`, `DEMO_MANAGER_PHONE`, `DEMO_MANAGER_PASSWORD` |
| VNPAY | `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_PAY_URL`, `VNPAY_API_URL`, `VNPAY_RETURN_URL`, `VNPAY_DEFAULT_BANKCODE` |
| Thanh toán/đơn hàng | `PAYMENT_EXPIRE_MINUTES`, `PAYMENT_MOCK_ENABLED`, `PAYMENT_RECONCILE_INTERVAL_MS`, `ORDER_PENDING_EXPIRE_MINUTES`, `TRUST_PROXY` |
| Loyalty | `LOYALTY_WELCOME_POINTS` |

Các biến được đối chiếu với `.env`, `.env.example` và nơi đọc cấu hình trong A1. Biến của các script nâng cấp/test riêng của A1 chưa được mang sang vì những script đó không có trong bộ khung A2.

## Thiết lập local hiện tại

- Database giữ nguyên kết nối A2: `brewlite` và `brewlite_test`, volume `brewlite-a2_pgdata`. Không chuyển URL sang database của A1.
- JWT và OTP có secret ngẫu nhiên riêng của A2, khác nhau và khác secret A1.
- Cấu hình VNPAY/eSMS, thời hạn token/thanh toán và loyalty được kế thừa từ file local A1 vào `apps/api/.env`. Giá trị truy cập không được đưa vào file mẫu hay tài liệu.
- `PAYMENT_RECONCILE_INTERVAL_MS` mặc định 60000 và `ORDER_PENDING_EXPIRE_MINUTES` mặc định 15 theo mã cấu hình A1.
- Các trường demo manager được để trống khi `AUTH_DEMO_SEED=false`. Khi tự triển khai seed demo, điền các trường này trước khi bật cờ.

File mẫu dùng `SMS_PROVIDER=local`, `AUTH_OTP_DEMO=true` và `PAYMENT_MOCK_ENABLED=true`; các khóa provider là giá trị mẫu hoặc để trống. File `.env` local hiện tại giữ các cờ provider theo A1, nên có thể khác file mẫu.

## Phạm vi đã kiểm tra

Đã kiểm tra đủ tên biến, định dạng, các trường bắt buộc theo cờ provider, sự tách biệt của secret và việc Git bỏ qua file local. Prisma/database tiếp tục dùng cấu hình A2. Thiết lập này không gửi OTP, không gọi API eSMS/VNPAY và không tạo giao dịch.

Các file chức năng trong `src` vẫn trống. Cấu hình đầy đủ chưa triển khai chức năng auth, thanh toán, callback hoặc seed.
