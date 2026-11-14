# Script hỗ trợ dự án

| Thư mục | Nội dung |
| --- | --- |
| `docker/postgres/init/` | SQL khởi tạo database test khi PostgreSQL tạo volume lần đầu |
| `postman/` | Khởi động API test và tạo collection từ Swagger |
| `deploy/` | Blueprint Render, xác nhận CI và kiểm tra API/web sau triển khai |

Các lệnh dưới đây chạy tại root repo. Script Postman tự tìm `apps/api` theo vị trí file, sử dụng dependencies và `.env` của API; không cần thêm package ở root.

```powershell
# Chạy toàn bộ ứng dụng bằng Docker.
docker compose up --build -d

# Chạy API test riêng ở cổng 4001, dùng database test.
npm.cmd --prefix apps/api run postman:dev

# Tạo lại collection/environment trong tests/postman khi API test đang chạy.
npm.cmd --prefix apps/api run postman:generate
```

Xem [hướng dẫn Docker](../docs/deployment.md) và [hướng dẫn Postman](../tests/postman/README.md).
