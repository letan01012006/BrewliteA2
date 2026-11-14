# Chạy ứng dụng bằng Docker Compose

## Chuẩn bị lần đầu

Cài và mở Docker Desktop, dùng Linux containers. Không cần cài Node.js/dependencies trên máy khi chỉ chạy ứng dụng bằng Docker.

Tại root repo, tạo file môi trường nếu chưa có:

```powershell
if (-not (Test-Path -LiteralPath .env)) {
    Copy-Item -LiteralPath .env.example -Destination .env
}
if (-not (Test-Path -LiteralPath apps/api/.env)) {
    Copy-Item -LiteralPath apps/api/.env.example -Destination apps/api/.env
}
```

Trong `apps/api/.env`, thay `JWT_SECRET` và `OTP_HASH_SECRET` bằng hai secret riêng dài ít nhất 32 ký tự. Giữ cấu hình SMS/thanh toán theo nhu cầu của bạn. Các giá trị từ file này chỉ được nạp khi tạo container, không được chép vào image.

File `.env` ở root cấu hình tài khoản database và các cổng được mở ra máy. Compose tạo `DATABASE_URL` nội bộ từ `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, dùng hostname `db` và cổng 5432.

## Chạy cả frontend, backend và database

```powershell
docker compose up --build -d
```

| Service | Vai trò | Địa chỉ trên máy |
| --- | --- | --- |
| `db` | PostgreSQL 16, volume `brewlite-a2_pgdata` | `localhost:5432` |
| `api-init` | Chạy migrations và seed, sau đó thoát với mã 0 | Không mở cổng |
| `api` | NestJS và Swagger | http://localhost:4000/api/docs |
| `web` | Next.js standalone | http://localhost:3000 |

Backend chờ database healthy và `api-init` thành công. Frontend chờ backend healthy. Đây là các điều kiện [`depends_on` của Compose](https://docs.docker.com/compose/how-tos/startup-order/). Seed dùng upsert và không xóa database hiện có.

Script tạo database test nằm ở `scripts/docker/postgres/init/01-create-test-db.sql`, được mount chỉ đọc vào `/docker-entrypoint-initdb.d`. PostgreSQL chỉ chạy script khởi tạo khi volume còn trống; volume hiện có được giữ nguyên khi sắp xếp lại repo.

`api`/`api-init` dùng chung image. Image API chứa Prisma CLI và tsx để thực hiện migration/seed. API chạy JavaScript đã compile; `NODE_ENV` được nạp từ `apps/api/.env` và được giữ là `development` trong cấu hình mẫu để dùng OTP local. Frontend chạy bản production bằng [Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).

Next.js rewrite `/api/*` tới `http://api:4000/api` trong mạng Docker. URL này được dùng lúc build và chạy; trình duyệt vẫn gọi `/api` tại `localhost:3000`. `apps/web/.env.local` chỉ dùng khi chạy frontend trực tiếp trên máy. Lần build đầu cần mạng để tải base image, npm packages và Google Fonts.

Dừng frontend/backend đang chạy bằng Node.js trước khi chuyển sang Docker để giải phóng cổng 3000/4000. Profile Postman cổng 4001 có thể chạy riêng.

## Xem trạng thái và logs

```powershell
docker compose ps -a
docker compose logs --tail 100 api-init api web
docker compose logs -f api web
```

`api-init` hiển thị `Exited (0)` là bình thường. `db`, `api` và `web` cần hiển thị `healthy`. Nếu migration/seed lỗi, xem logs `api-init`; backend sẽ chờ thay vì khởi động với schema chưa sẵn sàng.

## Cập nhật code hoặc cấu hình

Sau khi sửa code, Dockerfile hoặc `.env`, chạy lại:

```powershell
docker compose up --build -d
```

Không có bind mount/hot reload trong cấu hình này. Muốn phát triển với hot reload, xem [hướng dẫn chạy bằng Node.js](development.md) và chỉ chạy database bằng Docker.

Đổi `WEB_PORT`, `API_PORT` hoặc `POSTGRES_PORT` trong `.env` ở root khi cần đổi cổng trên máy; cổng trong mạng Docker giữ nguyên. Khi đổi cổng web, cập nhật `VNPAY_RETURN_URL` trong `apps/api/.env` nếu sử dụng VNPAY. URL database của các tiến trình Node.js chạy ngoài Docker cũng cần khớp `POSTGRES_PORT`.

## Dừng và chạy lại

```powershell
docker compose stop
docker compose up -d
```

Volume database được giữ lại khi dừng hoặc tạo lại container. Lệnh khởi động ở trên dùng lại image đã build; thêm `--build` khi code thay đổi.
