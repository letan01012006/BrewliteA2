# ADR 002 — Modular Monolith và phân lớp cho NestJS

**Trạng thái:** Đang áp dụng, ghi nhận lại ngày 14/11/2026.

## Bối cảnh

Đơn hàng, thanh toán, giữ kho và điểm thưởng có quan hệ chặt chẽ. Phạm vi hiện tại cần dễ chạy, debug và kiểm tra transaction, nhưng vẫn phân biệt trách nhiệm theo nghiệp vụ.

## Quyết định

Chạy một ứng dụng NestJS, chia Auth, Products, Orders, Payments, Inventory/Recipes, Promotions/Pricing và các module dùng chung. Tổ chức đường đi `Controller/DTO → Service → PrismaService → PostgreSQL`, kết hợp helper cho quy tắc nghiệp vụ và provider cho tích hợp ngoài.

Giao tiếp module bằng dependency injection và import/export. Service hiện truy cập Prisma trực tiếp; đây là kiến trúc phân lớp thực dụng, chưa phải hệ thống domain hoàn toàn độc lập ORM. Logic điểm đang ở helper Orders, không có module Loyalty riêng.

## Phương án cân nhắc

- **Microservices:** có thể tách triển khai và tài nguyên từng dịch vụ, nhưng phải xử lý lỗi mạng, hợp đồng giữa dịch vụ và tính nhất quán dữ liệu phân tán.
- **Clean Architecture/ports-adapters:** có thể áp dụng bên trong monolith; tăng khả năng thay thế một số phụ thuộc nhưng cần thêm interface/adapter và kiểm tra ranh giới.

## Hệ quả

- **Ưu điểm:** ít thành phần vận hành; transaction dùng chung database; dễ theo dõi luồng nghiệp vụ trong một tiến trình.
- **Hạn chế:** chia sẻ tiến trình/database; `OrdersService` và `PaymentsService` có phụ thuộc điều phối; ranh giới module chưa có kiểm tra kiến trúc tự động.
- **Đánh đổi:** chưa tách dịch vụ chỉ để tăng số container. Khi có nhu cầu scale hoặc phát hành độc lập, phải đánh giá cả quyền sở hữu dữ liệu, idempotency và cơ chế đối soát; không giả định chỉ chuyển file là tách được service.

## Đối chiếu

[AppModule](../../../apps/api/src/app.module.ts), [OrdersModule](../../../apps/api/src/orders/orders.module.ts), [PaymentsModule](../../../apps/api/src/payments/payments.module.ts). Cách đóng gói provider dựa trên [NestJS Modules](https://docs.nestjs.com/modules).
