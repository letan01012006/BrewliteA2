# Cây file chức năng

Repo được tổ chức theo các thư mục chính:

```text
.github/                 Workflow GitHub
apps/api/                Backend, Prisma, unit test và E2E của API
apps/web/                Frontend và test của web
docs/                    Tài liệu dự án
scripts/docker/          Khởi tạo PostgreSQL qua Docker
scripts/postman/         Script khởi động API test và tạo collection
tests/postman/           Postman collection/environment
```

File `docker-compose.yml` ở root chạy toàn bộ ứng dụng. Bộ test riêng của từng app nằm cạnh mã nguồn để tiếp tục dùng cấu hình và dependencies của app; `tests/` ở root chứa bộ kiểm thử API bằng Postman. Xem [scripts](../scripts/README.md) và [tests](../tests/README.md).

Các file nguồn dưới đây đã được điền nội dung từ `doanreal/brewlite`: `frontend/src` chuyển sang `apps/web/src`, `backend/src` chuyển sang `apps/api/src`. Các file `*.spec.ts` đã có unit test; test frontend và test API tích hợp nằm trong thư mục `test` của từng app.

Ảnh/icon được chép vào `apps/web/public` và `apps/web/src/app/favicon.ico`. Prisma schema, migrations và seed nằm trong `apps/api/prisma`; Prisma Client được tạo bằng `npm.cmd run prisma:generate` tại `apps/api`, không đưa output generated vào Git.

```text
apps/web/src/
|-- app/
|   |-- (auth)/
|   |   |-- login/
|   |   |   `-- page.tsx
|   |   |-- register/
|   |   |   `-- page.tsx
|   |   |-- verify-otp/
|   |   |   `-- page.tsx
|   |   `-- layout.tsx
|   |-- (shop)/
|   |   |-- cart/
|   |   |   `-- page.tsx
|   |   |-- checkout/
|   |   |   `-- page.tsx
|   |   |-- menu/
|   |   |   `-- page.tsx
|   |   |-- orders/
|   |   |   `-- page.tsx
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- barista/
|   |   |-- inventory/
|   |   |   `-- page.tsx
|   |   `-- page.tsx
|   |-- manager/
|   |   `-- page.tsx
|   |-- payment/
|   |   |-- vnpay-return/
|   |   |   `-- page.tsx
|   |   `-- layout.tsx
|   |-- globals.css
|   `-- layout.tsx
|-- components/
|   |-- auth/
|   |   |-- auth-gate.tsx
|   |   |-- customer-gate.tsx
|   |   `-- logout-button.tsx
|   |-- inventory/
|   |   `-- add-product-modal.tsx
|   |-- layout/
|   |   |-- app-header.tsx
|   |   |-- legacy-pwa-cleanup.tsx
|   |   |-- mobile-nav.tsx
|   |   `-- shop-footer.tsx
|   |-- products/
|   |   |-- product-card.tsx
|   |   `-- product-modal.tsx
|   `-- ui/
|       |-- badge.tsx
|       |-- button.tsx
|       |-- icon.tsx
|       |-- modal.tsx
|       `-- pagination.tsx
|-- lib/
|   |-- api/
|   |   |-- client.ts
|   |   |-- inventory.ts
|   |   `-- pagination.ts
|   |-- constants/
|   |   `-- product-images.ts
|   |-- auth-session.ts
|   |-- browser-storage.ts
|   |-- cart-purchase.ts
|   |-- cart-rules.ts
|   |-- checkout-flow.ts
|   |-- legacy-pwa-cleanup.ts
|   |-- loyalty.ts
|   |-- order-payload.ts
|   `-- safe-redirect.ts
|-- store/
|   |-- auth-store.ts
|   `-- cart-store.ts
`-- types/
    `-- index.ts
```

```text
apps/api/src/
|-- auth/
|   |-- dto/
|   |   |-- index.ts
|   |   |-- login.dto.ts
|   |   |-- otp.dto.ts
|   |   `-- register.dto.ts
|   |-- interfaces/
|   |   `-- jwt-payload.interface.ts
|   |-- auth.controller.ts
|   |-- auth.module.ts
|   |-- auth.service.ts
|   |-- jwt.strategy.ts
|   |-- otp.service.spec.ts
|   |-- otp.service.ts
|   `-- staff.controller.ts
|-- common/
|   |-- decorators/
|   |   |-- current-user.decorator.ts
|   |   `-- roles.decorator.ts
|   |-- filters/
|   |   `-- all-exceptions.filter.ts
|   |-- guards/
|   |   |-- jwt-auth.guard.ts
|   |   `-- roles.guard.ts
|   `-- pricing/
|       |-- pricing.constants.ts
|       |-- pricing.module.ts
|       |-- pricing.service.spec.ts
|       `-- pricing.service.ts
|-- generated/
|   `-- prisma/
|       `-- .gitkeep
|-- health/
|   |-- health.controller.ts
|   `-- health.module.ts
|-- inventory/
|   |-- dto/
|   |   |-- ingredient.dto.ts
|   |   |-- recipe.dto.ts
|   |   `-- stock-adjustment.dto.ts
|   |-- inventory.controller.ts
|   |-- inventory.module.ts
|   |-- inventory.service.spec.ts
|   |-- inventory.service.ts
|   |-- inventory.swagger.ts
|   |-- positive-id.pipe.ts
|   |-- quantity.spec.ts
|   |-- quantity.ts
|   |-- recipes.controller.ts
|   |-- recipes.module.ts
|   |-- recipes.service.ts
|   `-- transaction.ts
|-- orders/
|   |-- dto/
|   |   |-- create-order.dto.ts
|   |   |-- index.ts
|   |   |-- order-item.dto.ts
|   |   |-- query-order.dto.ts
|   |   `-- update-order-status.dto.ts
|   |-- order-expiry.job.ts
|   |-- order-lock.ts
|   |-- order-loyalty.ts
|   |-- order-state.spec.ts
|   |-- order-state.ts
|   |-- order-voucher.ts
|   |-- orders.controller.ts
|   |-- orders.module.ts
|   `-- orders.service.ts
|-- payments/
|   |-- dto/
|   |   |-- index.ts
|   |   `-- process-payment.dto.ts
|   |-- vnpay/
|   |   |-- vnpay-reconcile.job.ts
|   |   |-- vnpay.gateway.spec.ts
|   |   |-- vnpay.gateway.ts
|   |   |-- vnpay.util.spec.ts
|   |   `-- vnpay.util.ts
|   |-- client-ip.spec.ts
|   |-- client-ip.ts
|   |-- mock-payment.service.ts
|   |-- payments.controller.ts
|   |-- payments.module.ts
|   `-- payments.service.ts
|-- prisma/
|   |-- prisma.module.ts
|   `-- prisma.service.ts
|-- products/
|   |-- dto/
|   |   |-- create-product.dto.ts
|   |   |-- create-topping.dto.ts
|   |   |-- query-product.dto.ts
|   |   `-- update-product-toppings.dto.ts
|   |-- guards/
|   |   `-- product-visibility.guard.ts
|   |-- legacy-toppings.controller.ts
|   |-- products.controller.ts
|   |-- products.module.ts
|   |-- products.service.ts
|   |-- toppings.controller.ts
|   `-- toppings.service.ts
|-- promotions/
|   |-- dto/
|   |   |-- apply-promotion.dto.ts
|   |   `-- index.ts
|   |-- promotions.controller.ts
|   |-- promotions.module.ts
|   |-- promotions.service.ts
|   |-- voucher-rules.spec.ts
|   `-- voucher-rules.ts
|-- app.controller.spec.ts
|-- app.controller.ts
|-- app.module.ts
|-- app.service.ts
|-- configure-app.ts
`-- main.ts
```
