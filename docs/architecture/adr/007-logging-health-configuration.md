# ADR 007 — Logging, health check và cấu hình môi trường

**Trạng thái:** Đang áp dụng ở mức local/CI; các nâng cấp nêu dưới đây là đề xuất. Ghi nhận ngày 14/11/2026.

## Bối cảnh

Khi demo và chạy container cần phân biệt lỗi nghiệp vụ, lỗi ứng dụng và lỗi kết nối database. Cấu hình giữa máy phát triển, mock test và tích hợp provider có thể khác nhau.

## Quyết định

- Dùng Nest `Logger`; `AllExceptionsFilter` chuẩn hóa lỗi HTTP và log stack cho lỗi ngoài dự kiến. Client nhận thông báo chung thay vì stack của lỗi nội bộ. Các job hết hạn/đối soát có log lỗi riêng.
- `GET /api/health` chạy `SELECT 1`, trả `status: ok, db: up` nếu thành công. Compose chờ database healthy, `api-init` hoàn thành, API healthy rồi khởi động web.
- API lấy cấu hình qua `ConfigModule`/`ConfigService` và biến môi trường; file `.env` local được Git bỏ qua, `.env.example` mô tả tên biến và giá trị mẫu.
- `DATABASE_URL` bên trong Compose dùng hostname `db`; frontend rewrite dùng `BACKEND_API_URL` lúc build. Test/Postman có profile riêng thay vì sửa file secret của môi trường đang dùng.

## Phương án cân nhắc

- **Chỉ kiểm tra tiến trình chạy:** đơn giản nhưng không phát hiện API mất kết nối database.
- **Metrics/tracing/log tập trung ngay:** có ích khi vận hành nhiều máy; cần thêm thành phần, chi phí lưu trữ và chính sách dữ liệu.

## Hệ quả

- **Ưu điểm:** có health phục vụ startup, log xem trực tiếp bằng Compose, cấu hình không phải sửa trong source theo từng máy.
- **Hạn chế:** health chỉ kiểm tra DB, không kiểm tra SMS/gateway; chưa có liveness riêng, correlation ID, metrics hay tracing tập trung. Dữ liệu lỗi HTTP có `timestamp` không đồng nghĩa tất cả log đã là structured JSON.
- **Đánh đổi:** giữ mức vận hành phù hợp local/CI. Khi triển khai public cần chốt origin CORS, TLS, lưu/che dữ liệu log và giới hạn truy cập endpoint vận hành; chưa xem các cấu hình đó là đã hoàn tất.

Đề xuất tiếp theo là validate schema biến môi trường lúc bootstrap, bổ sung request ID và tách liveness/readiness nếu mô hình triển khai cần; tránh trộn các đề xuất này với hiện trạng.

## Đối chiếu

[Bootstrap](../../../apps/api/src/main.ts), [exception filter](../../../apps/api/src/common/filters/all-exceptions.filter.ts), [health](../../../apps/api/src/health/health.controller.ts), [ConfigModule](../../../apps/api/src/app.module.ts), [env mẫu](../../../apps/api/.env.example), [Compose](../../../docker-compose.yml), [Postman launcher](../../../scripts/postman/start-postman.mjs).
