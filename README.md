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

Trong `apps/api/.env`, thay `JWT_SECRET` và `OTP_HASH_SECRET` bằng hai secret riêng dài ít nhất 32 ký tự. Các biến cấu hình được liệt kê trong [file mẫu](apps/api/.env.example).

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

## Quản lý và nhân viên

Đăng nhập bằng tài khoản `MANAGER` để vào `/manager`, tạo tài khoản nhân viên bằng họ tên, SĐT, mật khẩu ban đầu và email tùy chọn. Bên dưới form là danh sách nhân viên có phân trang, hiển thị mới nhất trước và tự cập nhật sau khi tạo tài khoản. Nhân viên được cấp quyền `BARISTA`, có thể đăng nhập ngay. Trang quản lý có liên kết tới quầy pha chế và kho; trong hai trang này, quản lý có thể quay lại mục quản lý nhân viên.

Tài khoản nhân viên do quản lý cấp **không cần OTP**: hệ thống đặt `isPhoneVerified=true` để cho phép đăng nhập ngay. Cơ chế này không xác minh quyền sở hữu SĐT qua SMS; quản lý chịu trách nhiệm nhập đúng SĐT. Khách hàng tự đăng ký vẫn phải xác thực OTP như trước.

| Chức năng | Nhân viên (`BARISTA`) | Quản lý (`MANAGER`) |
| --- | --- | --- |
| Xem và xử lý đơn, hủy đơn, xem giao dịch và yêu cầu hoàn tiền theo trạng thái cho phép | Có | Có |
| Quản lý nguyên liệu, nhập/điều chỉnh kho, sản phẩm, topping và công thức | Có | Có |
| Xem sản phẩm đang tạm dừng bán | Có | Có |
| Bật/tắt bán sản phẩm | Không | Có |
| Tạo tài khoản nhân viên | Không | Có |

Quyền được kiểm tra tại API theo vai trò hiện tại trong database. Nhân viên không có nút bật/tắt sản phẩm và gọi trực tiếp `PATCH /api/products/:id/status` sẽ nhận `403`. Các thao tác kho và xử lý đơn vẫn tuân theo quy tắc nghiệp vụ hiện có.

Để tạo quản lý demo ở môi trường development/test, đặt `AUTH_DEMO_SEED=true`, `DEMO_MANAGER_PHONE` và `DEMO_MANAGER_PASSWORD` trong `apps/api/.env`, rồi chạy seed với `NODE_ENV=development` hoặc `test`. Seed này không chạy ở production. Thay đổi phân quyền này dùng các vai trò hiện có, không cần migration mới.

## Kiểm thử API bằng Postman

Sau khi cài dependencies của API, chạy profile test riêng:

```powershell
npm.cmd --prefix apps/api run postman:dev
```

Import hai file JSON trong `tests/postman/`, chọn environment **BrewLite A2 — Postman Demo**, rồi chạy folder **01. Luồng test tự động**. Profile dùng cổng **4001**, database test riêng, OTP **123456** và thanh toán giả lập; token được lưu tự động. Xem [hướng dẫn Postman](tests/postman/README.md).

## Quy ước làm việc

[Product Backlog](docs/BACKLOG.md): [Sprint 1](docs/BACKLOG.md#sprint-1) · [Sprint 2](docs/BACKLOG.md#sprint-2). Bản tổng hợp lưu trực tiếp trong repo.

| Nội dung | Quy ước |
| --- | --- |
| Branch | Tạo từ `main` mới nhất, đặt tên `a2/task-<mã>-<mô-tả>`, ví dụ `a2/task-4.4-ci`. |
| Commit | Dạng `<type>: <nội dung tiếng Việt>`, ví dụ `feat: thêm chức năng đặt món`. Type dùng `feat`, `fix`, `docs`, `refactor`, `test`, `ci` hoặc `chore`. |
| Pull Request | Một PR tập trung vào một task, mở vào `main`; ghi mã task, thay đổi chính và cách kiểm tra. Merge qua PR khi `CI (api)` và `CI (web)` pass, nhánh đã cập nhật với `main`. |

### Definition of Done

Một task được đánh dấu **Done** khi:

- Đáp ứng tiêu chí chấp nhận của task.
- Lint, test và build liên quan đạt; các check CI bắt buộc đều pass.
- Thay đổi giao diện đã kiểm tra trên mobile và desktop; thay đổi API có request/response hoặc bộ Postman để đối chiếu.
- Tài liệu, migration và cấu hình mẫu được cập nhật nếu có thay đổi tương ứng.
- PR đã được kiểm tra diff và merge vào `main`; trạng thái task được cập nhật.

## Tài liệu

- [CD và triển khai Vercel / Render](docs/deployment.md)
- [Task 3.1 — Kiến trúc và ADR](docs/architecture/README.md)
- [CI và bằng chứng kiểm tra](docs/ci.md)
- [Kiểm thử](tests/README.md)
