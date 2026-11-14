# ADR 003 — PostgreSQL, Prisma và migrations có phiên bản

**Trạng thái:** Đang áp dụng, ghi nhận lại ngày 14/11/2026.

## Bối cảnh

User, đơn hàng, các dòng món, thanh toán, điểm và kho cần quan hệ/ràng buộc rõ ràng. Thay đổi schema phải có thể review và áp dụng nhất quán giữa các môi trường.

## Quyết định

Sử dụng PostgreSQL 16 và Prisma 6 với adapter `pg`. Lưu schema trong `apps/api/prisma/schema.prisma`, SQL thay đổi trong `prisma/migrations`. Client generated được tạo trước lint/build và không commit vào Git.

Phát triển dùng `prisma migrate dev`; áp dụng migration đã lưu dùng `prisma migrate deploy`. Compose chạy `api-init` để migrate/seed trước API. Seed phục vụ dữ liệu demo local, không xem là quy trình nạp dữ liệu production mặc định. Xem [quy trình Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production).

Dùng transaction cho các thay đổi dữ liệu liên quan, khóa dòng đơn khi cập nhật cạnh tranh và version cho một số thao tác kho/công thức. `User.id` là khóa số nguyên; phone/email unique không thay thế khóa chính. Giữ database test riêng với database chính.

## Phương án cân nhắc

- **SQL trực tiếp/ORM khác:** cho cách kiểm soát truy vấn khác, nhưng sẽ phát sinh chi phí thay toàn bộ truy cập và công cụ migration hiện có.
- **Database tài liệu:** hữu ích với dữ liệu ít cấu trúc; các quan hệ/ràng buộc hiện tại vẫn phù hợp mô hình quan hệ.

## Hệ quả

- **Ưu điểm:** SQL migrations có lịch sử; Prisma Client hỗ trợ kiểm tra kiểu truy vấn; database thực thi khóa ngoại và unique constraint.
- **Hạn chế:** cần generate client; một số SQL khóa dòng/check constraint vẫn phải quản lý trực tiếp; type checking không thay thế validate dữ liệu ở runtime.
- **Đánh đổi:** chấp nhận phụ thuộc Prisma để giảm công việc truy cập dữ liệu. Cần đánh giá SQL và kế hoạch triển khai khi migration tác động dữ liệu lớn; chưa có quy trình rollback dữ liệu tự động hoặc bằng chứng backup/restore production trong phạm vi này.

## Đối chiếu

[Schema](../../../apps/api/prisma/schema.prisma), [migrations](../../../apps/api/prisma/migrations/), [PrismaService](../../../apps/api/src/prisma/prisma.service.ts), [transaction kho](../../../apps/api/src/inventory/transaction.ts), [khóa đơn](../../../apps/api/src/orders/order-lock.ts).
