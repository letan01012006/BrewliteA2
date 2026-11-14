# BrewliteA2

Ứng dụng BrewLite dùng Next.js cho frontend, NestJS cho API và PostgreSQL 16. Mã nguồn, ảnh, Prisma schema, migrations, seed và tests được chuyển từ `doanreal/brewlite` vào cấu trúc A2:

- `frontend/` → `apps/web/`
- `backend/` → `apps/api/`

A2 giữ package/lockfile, cấu hình local và volume database riêng `brewlite-a2_pgdata`.

## Chạy trên Windows PowerShell

Yêu cầu Node.js 24 LTS (tối thiểu 24.15), npm 11 và Docker Desktop đang chạy. Mỗi app có dependencies riêng, không có npm workspace ở root.

Nếu dependencies và database đã được chuẩn bị, tại root chạy:

```powershell
docker compose up -d --wait db
```

Mở hai terminal tại root repo:

```powershell
# Terminal backend
cd apps/api
npm.cmd run start:dev
```

```powershell
# Terminal frontend
cd apps/web
npm.cmd run dev
```

| Thành phần | Địa chỉ |
| --- | --- |
| Frontend | http://localhost:3000 |
| Menu | http://localhost:3000/menu |
| Swagger API | http://localhost:4000/api/docs |
| Health check | http://localhost:4000/api/health |

Frontend proxy `/api/*` tới `BACKEND_API_URL` trong `apps/web/.env.local`, mặc định `http://127.0.0.1:4000/api`.

Frontend dùng một giao diện responsive ưu tiên mobile, với tông kem, nâu cà phê và xanh olive cố định. Điện thoại có điều hướng dưới, lưới hai cột và bảng chọn món dạng bottom sheet; tablet dùng ba cột, desktop có header riêng, hero hai cột và lưới bốn cột. Nút và logic đổi sáng/tối đã được gỡ. Luồng đặt món, giỏ hàng, thanh toán và tài khoản dùng chung giữa các kích thước màn hình.

## Chuẩn bị lần đầu

Tại root repo, chỉ tạo các file local khi chưa tồn tại:

```powershell
if (-not (Test-Path -LiteralPath .env)) {
    Copy-Item -LiteralPath .env.example -Destination .env
}
if (-not (Test-Path -LiteralPath apps/api/.env)) {
    Copy-Item -LiteralPath apps/api/.env.example -Destination apps/api/.env
}
if (-not (Test-Path -LiteralPath apps/web/.env.local)) {
    Copy-Item -LiteralPath apps/web/.env.example -Destination apps/web/.env.local
}

npm.cmd --prefix apps/web ci
npm.cmd --prefix apps/api ci
docker compose up -d --wait db

Push-Location apps/api
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
npm.cmd run prisma:seed
Pop-Location
```

Thay các secret mẫu trong `apps/api/.env` trước khi chạy API; JWT và OTP cần secret riêng dài ít nhất 32 ký tự. File mẫu dùng OTP local và thanh toán giả lập. File local hiện có giữ cấu hình provider của máy. Xem [docs/environment.md](docs/environment.md).

Prisma Client được generate vào `apps/api/src/generated/prisma`, bị Git bỏ qua. Chạy lại `prisma:generate` sau khi sửa schema. Migrations được áp dụng bằng `prisma:migrate:deploy`; dùng `prisma:migrate:dev` khi phát triển thay đổi schema mới.

Next.js tải Inter và Geist Mono từ Google Fonts khi compile lần đầu, nên cần kết nối mạng tới Google Fonts.

## Dữ liệu và tài khoản mẫu

Seed tạo 10 sản phẩm, 3 topping, công thức/nguyên liệu, 3 mã khuyến mãi và hai tài khoản. Seed dùng upsert để có thể chạy lại.

Ở trang đăng nhập, chọn **Email** để dùng các tài khoản mẫu dưới đây. Tài khoản có cả số điện thoại và email đã đăng ký có thể dùng một trong hai để đăng nhập; tài khoản có số điện thoại cần hoàn tất OTP trước khi đăng nhập thành công.

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Khách hàng | demo@brewlite.com | Demo@1234 |
| Nhân viên pha chế | barista@brewlite.com | Barista@123 |

Seed quản lý là tùy chọn: đặt `AUTH_DEMO_SEED=true`, điền `DEMO_MANAGER_PHONE`, `DEMO_MANAGER_PASSWORD` trong API `.env`, rồi chạy lại seed trong môi trường development/test.

## Kiểm tra

```powershell
npm.cmd --prefix apps/web test
npm.cmd --prefix apps/web run lint
npm.cmd --prefix apps/web run build

npm.cmd --prefix apps/api test
npm.cmd --prefix apps/api run lint
npm.cmd --prefix apps/api run build

Push-Location apps/api
npm.cmd run test:e2e
Pop-Location
```

E2E cần PostgreSQL và `TEST_DATABASE_URL` trỏ tới database riêng `brewlite_test`. Chạy từ `apps/api` để nạp đúng `.env` và thư mục migrations. Bộ test dùng SMS local và thanh toán giả lập; các fixture database tạo schema riêng rồi dọn sau khi chạy.

Kiểm tra local ngày 14/11/2026: build hai app đạt, 157 test frontend và 82 unit test API đạt. E2E đạt 150 test trong lượt chạy chung và 43 test business/security khi chạy riêng sau khi thêm ép kiểu PostgreSQL `name` sang `text` cho adapter Prisma 6. Lint frontend đạt; lint API còn 24 cảnh báo `typescript/no-base-to-string` từ mã VNPAY gốc và bị script `--deny-warnings` đánh trượt.

## Dừng ứng dụng

Nhấn Ctrl+C ở hai terminal. Dừng database và giữ dữ liệu:

```powershell
docker compose stop db
```

A1 và A2 cùng dùng cổng PostgreSQL mặc định 5432, nên cần đổi `POSTGRES_PORT` cùng database URL nếu muốn chạy đồng thời hai stack.

## Tài liệu và công việc tiếp theo

- [Cây mã nguồn](docs/source-tree.md)
- [Cấu hình môi trường](docs/environment.md)
- [Deployment](docs/deployment.md)
- [Traceability](docs/traceability-matrix.md)

Compose hiện chạy database. Dockerfile web/API và template `.github/workflows/ci.yml.example` cần được xác minh riêng trước khi triển khai; workflow chưa được kích hoạt. Product Backlog/Sprint Board và CD vẫn là các công việc tiếp theo.
