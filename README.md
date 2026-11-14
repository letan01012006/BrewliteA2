# BrewliteA2

Ứng dụng BrewLite dùng Next.js cho frontend, NestJS cho API và PostgreSQL 16. Mã nguồn, ảnh, Prisma schema, migrations, seed và tests được chuyển từ `doanreal/brewlite` vào cấu trúc A2:

- `frontend/` → `apps/web/`
- `backend/` → `apps/api/`

A2 giữ package/lockfile, cấu hình local và volume database riêng `brewlite-a2_pgdata`.

## Cấu trúc repo

```text
brewliteA2/
├── .github/               # Workflow và cấu hình GitHub
├── apps/
│   ├── api/               # NestJS, Prisma và test riêng của API
│   └── web/               # Next.js và test riêng của frontend
├── docs/                  # Tài liệu, sơ đồ, yêu cầu và cấu hình môi trường
├── scripts/
│   ├── docker/            # Script khởi tạo PostgreSQL cho Docker
│   └── postman/           # Khởi động API test và tạo collection
├── tests/
│   └── postman/           # Collection, environment và hướng dẫn test API
├── .env.example
├── .gitattributes
├── .gitignore
├── README.md
└── docker-compose.yml
```

`.gitattributes` giữ quy tắc xuống dòng cho Git/Docker. Các file `.env`, dependencies, cache và bản sao local được Git bỏ qua. Xem [scripts](scripts/README.md) và [tests](tests/README.md) để chạy các công cụ tương ứng.

## Chạy frontend và backend cùng lúc bằng Docker

Mở Docker Desktop. Khi `.env` ở root và `apps/api/.env` đã được chuẩn bị, tại root repo chạy:

```powershell
docker compose up --build -d
```

Lệnh chạy nền PostgreSQL, tự áp dụng migration và seed dữ liệu mẫu, sau đó mở backend và frontend. Đợi các dịch vụ khởi động xong rồi truy cập:

- Frontend: http://localhost:3000
- Swagger: http://localhost:4000/api/docs
- Health: http://localhost:4000/api/health

Database tiếp tục dùng volume `brewlite-a2_pgdata` hiện có. Frontend trong Docker gọi backend qua `http://api:4000/api`. Không cần chạy thêm các lệnh `npm run dev` hoặc `npm run start:dev` trên máy. Docker chạy bản build; chạy lại lệnh trên sau khi sửa code. Xem [hướng dẫn Docker](docs/deployment.md) để chuẩn bị lần đầu, xem logs và đổi cổng.

## Chạy bằng Node.js trên Windows PowerShell

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

## Test API bằng Postman

Tại root repo, chạy profile test riêng:

```powershell
npm.cmd --prefix apps/api run postman:dev
```

API test chạy tại `http://localhost:4001/api`, dùng `TEST_DATABASE_URL`, OTP `123456` và thanh toán giả lập. Import hai file JSON trong [tests/postman/](tests/postman/README.md), chọn environment **BrewLite A2 — Postman Demo** rồi chạy folder **01. Luồng test tự động**. Bộ mẫu tự lưu JWT/ID và kiểm tra luồng đăng ký, đăng nhập bằng SĐT/email, đặt món, thanh toán, barista xử lý đơn và quản lý tạo nhân viên. Xem [hướng dẫn Postman](tests/postman/README.md) để gọi riêng đủ 43 endpoint.

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

Nếu chạy bằng Docker, dừng các container và giữ database:

```powershell
docker compose stop
```

Nếu chạy bằng Node.js, nhấn Ctrl+C ở hai terminal. Dừng database và giữ dữ liệu:

```powershell
docker compose stop db
```

A1 và A2 cùng dùng cổng PostgreSQL mặc định 5432, nên cần đổi `POSTGRES_PORT` cùng database URL nếu muốn chạy đồng thời hai stack.

## Tài liệu và công việc tiếp theo

- [Cây mã nguồn](docs/source-tree.md)
- [Cấu hình môi trường](docs/environment.md)
- [Deployment](docs/deployment.md)
- [Traceability](docs/traceability-matrix.md)

Compose chạy đầy đủ frontend, backend và database; `api-init` chạy migration/seed trước backend. Template `.github/workflows/ci.yml.example` chưa được kích hoạt. Product Backlog/Sprint Board và CD vẫn là các công việc tiếp theo.
