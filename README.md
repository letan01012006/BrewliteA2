# BrewLite A2

Ứng dụng đặt đồ uống, quản lý đơn hàng và nguyên liệu. Frontend dùng Next.js, backend dùng NestJS và PostgreSQL 16; giao diện responsive ưu tiên mobile.

## Cấu trúc

```text
.github/        Workflow GitHub
apps/api/       Backend và Prisma
apps/web/       Frontend
docs/           Tài liệu dự án
scripts/        Script Docker và Postman
tests/          Bộ kiểm thử Postman
```

## Chạy bằng Docker

Yêu cầu Docker Desktop đang chạy với Linux containers. Thực hiện các lệnh tại root repo.

Lần đầu, tạo file môi trường nếu chưa có:

```powershell
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
}
if (-not (Test-Path apps/api/.env)) {
    Copy-Item apps/api/.env.example apps/api/.env
}
```

Trong `apps/api/.env`, thay `JWT_SECRET` và `OTP_HASH_SECRET` bằng hai secret riêng dài ít nhất 32 ký tự. Xem [cấu hình môi trường](docs/environment.md).

Khởi động toàn bộ ứng dụng:

```powershell
docker compose up --build -d
```

Docker tự chạy database, migration, seed, backend và frontend. Đợi các dịch vụ khởi động xong rồi truy cập:

| Thành phần | Địa chỉ |
| --- | --- |
| Web | http://localhost:3000 |
| Swagger | http://localhost:4000/api/docs |
| Health check | http://localhost:4000/api/health |

Chạy lại lệnh trên sau khi sửa code. Các lệnh quản lý:

```powershell
docker compose ps -a                # Xem trạng thái
docker compose logs -f api web      # Xem logs
docker compose stop                # Dừng, giữ dữ liệu database
```

## Tài khoản mẫu

Seed tự tạo các tài khoản sau, đăng nhập bằng **Email**:

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Khách hàng | demo@brewlite.com | Demo@1234 |
| Barista | barista@brewlite.com | Barista@123 |

Tài khoản có cả SĐT và email có thể dùng một trong hai để đăng nhập. Tài khoản có SĐT cần hoàn tất OTP.

## Kiểm thử API bằng Postman

Sau khi cài dependencies của API, chạy profile test riêng:

```powershell
npm.cmd --prefix apps/api run postman:dev
```

Import hai file JSON trong `tests/postman/`, chọn environment **BrewLite A2 — Postman Demo**, rồi chạy folder **01. Luồng test tự động**. Profile dùng cổng **4001**, database test riêng, OTP **123456** và thanh toán giả lập; token được lưu tự động. Xem [hướng dẫn Postman](tests/postman/README.md).

## Tài liệu

- [Phát triển bằng Node.js](docs/development.md)
- [Docker Compose](docs/deployment.md)
- [Kiểm thử](tests/README.md)
- [Cây mã nguồn](docs/source-tree.md)
- [Traceability matrix](docs/traceability-matrix.md)
