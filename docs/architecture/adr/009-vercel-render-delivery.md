# ADR 009 — Vercel cho web, Render cho API và PostgreSQL

- **Trạng thái:** phương án đã cấu hình trong repo, chờ tạo tài nguyên và nghiệm thu cloud.
- **Ngày:** 15/11/2026.

## Bối cảnh

Nhóm chọn Vercel cho frontend Next.js và cần CD sau khi CI trên `main` đạt. Backend NestJS hiện dùng kết nối PostgreSQL và các timer xử lý đơn/thanh toán; chuyển sang function theo request sẽ cần thay đổi cơ chế job.

## Quyết định

- Web deploy trên Vercel với Root Directory `apps/web`, rewrite `/api` đến API HTTPS.
- API dùng Docker trên Render, Postgres cùng region qua private network; migration chạy trước khi mở API. Seed demo cần bật rõ ràng bằng biến môi trường.
- GitHub Actions điều phối: xác nhận CI của cùng SHA → Render deploy SHA và đợi live → kiểm tra API → Vercel build/upload → smoke test → promote domain. Tắt auto-deploy từ Git ở cả hai nền tảng để tránh phát hành trước CI.
- Giữ secret backend tại Render, token deploy tại GitHub Environment `production`; không đưa token/ID project thực vào mã nguồn.

## Hệ quả và trade-off

- Giữ cấu trúc backend hiện có, tận dụng triển khai Next.js của Vercel và health/log của PaaS. Cần quản lý hai nhà cung cấp và kết nối HTTPS giữa web/API.
- Free tier chỉ dùng cho demo: API có thể ngủ, job timer tạm ngừng; database free có hạn sử dụng và không có backup. Chạy liên tục cần gói phù hợp hoặc nền tảng khác đã nghiệm thu.
- Backend nâng cấp trước frontend, nên API/migration phải tương thích phiên bản cũ. Một lần deploy không phải transaction giữa hai nền tảng; không tự đảo migration khi rollback web.
- GitHub CD hiện build Docker trực tiếp trên Render, không phát hành image lên GHCR. Chưa ghi nhận URL hoặc lượt cloud thành công.

## Phương án khác

- NestJS trên Vercel Functions: có hỗ trợ framework, nhưng timer trong tiến trình cần chuyển sang cron/worker phù hợp; chưa chọn trong đợt setup này.
- VPS chạy Compose/reverse proxy: giữ tiến trình liên tục nhưng nhóm tự quản lý TLS, cập nhật máy, secret, backup và giám sát.

Chi tiết và cấu hình tài khoản: [hướng dẫn CD/deploy](../../deployment.md). Tham chiếu [Vercel NestJS và scheduled tasks](https://vercel.com/kb/guide/ship-a-nestjs-app-on-vercel), [Render Free](https://render.com/docs/free).
