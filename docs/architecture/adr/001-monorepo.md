# ADR 001 — Monorepo với hai ứng dụng độc lập

**Trạng thái:** Đang áp dụng, ghi nhận lại ngày 14/11/2026.

## Bối cảnh

Một chức năng đặt món có thể thay đổi đồng thời API, giao diện, test và tài liệu. Repo cần chạy thuận tiện trên máy phát triển, đồng thời giữ cách build phù hợp cho Next.js và NestJS.

## Quyết định

Đặt `apps/web` và `apps/api` trong cùng repo. Mỗi app giữ `package.json`, `package-lock.json` và dependencies riêng; root không phải npm workspace. `docs` lưu tài liệu, `scripts` lưu công cụ hỗ trợ và `tests/postman` lưu bộ thử API; test riêng của app vẫn nằm trong app.

Web/API giao tiếp qua HTTP `/api`, không import source của nhau. Docker Compose điều phối web, API, database và bước khởi tạo schema. CI kiểm tra hai app bằng các job riêng.

## Phương án cân nhắc

- **Polyrepo:** tách quyền truy cập và vòng đời phát hành, nhưng thay đổi xuyên web/API phải phối hợp nhiều PR.
- **Npm workspace ở root:** thuận lợi khi có thư viện chia sẻ; hiện chưa có nhu cầu đủ rõ để đổi cách cài/build đang dùng.

## Hệ quả

- **Ưu điểm:** một nơi kiểm tra code, tài liệu và thay đổi API/client; clone và chạy Compose thuận tiện.
- **Hạn chế:** quyền ghi repo bao phủ cả hai app; dependencies có thể trùng và hai lockfile cần bảo trì độc lập.
- **Đánh đổi:** ưu tiên sự đơn giản hiện tại; khi có nhiều package dùng chung mới đánh giá workspace và cơ chế quản lý phiên bản chung.

## Đối chiếu

[Package API](../../../apps/api/package.json), [package web](../../../apps/web/package.json), [Compose](../../../docker-compose.yml), [CI](../../../.github/workflows/ci.yml).
