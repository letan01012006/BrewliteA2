# Phát triển bằng Node.js

Yêu cầu Node.js 24 (tối thiểu 24.15), npm 11 và Docker Desktop. Mỗi app có package và lockfile riêng; các lệnh dưới đây chạy tại root repo bằng PowerShell.

## Chuẩn bị

Tạo `.env` ở root và `apps/api/.env` theo [README](../README.md), chỉnh secret và kết nối database theo [cấu hình môi trường](environment.md).

Nếu đang chạy toàn bộ ứng dụng bằng Docker, chạy `docker compose stop api web` để giải phóng cổng 3000/4000. Sau đó cài dependencies, chạy database và chuẩn bị Prisma:

```powershell
npm.cmd --prefix apps/api ci
npm.cmd --prefix apps/web ci
docker compose up -d --wait db
npm.cmd --prefix apps/api run prisma:generate
npm.cmd --prefix apps/api run prisma:migrate:deploy
npm.cmd --prefix apps/api run prisma:seed
```

Frontend mặc định proxy `/api/*` tới `http://127.0.0.1:4000/api`. Để đổi backend, tạo `apps/web/.env.local` từ `apps/web/.env.example` rồi chỉnh `BACKEND_API_URL`.

## Chạy với hot reload

Mở hai terminal tại root repo:

```powershell
# Terminal backend
npm.cmd --prefix apps/api run start:dev
```

```powershell
# Terminal frontend
npm.cmd --prefix apps/web run dev
```

Web chạy tại http://localhost:3000, Swagger tại http://localhost:4000/api/docs. Nhấn Ctrl+C ở từng terminal để dừng; dùng `docker compose stop db` nếu muốn dừng cả database.

## Prisma và kiểm thử

Prisma Client nằm trong `apps/api/src/generated/prisma`, được Git bỏ qua. Sau khi sửa schema, chạy lại `prisma:generate`; dùng `prisma:migrate:dev` để tạo migration và `prisma:migrate:deploy` để áp dụng migration đã có.

Hướng dẫn chạy unit test, E2E và Postman nằm trong [tests/README.md](../tests/README.md). E2E dùng `TEST_DATABASE_URL`, tách biệt với database chính.
