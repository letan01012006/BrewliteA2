# ADR 004 — Next.js mobile-first, Zustand và HTTP client tập trung

**Trạng thái:** Đang áp dụng, ghi nhận lại ngày 14/11/2026.

## Bối cảnh

Menu, giỏ hàng, checkout và tài khoản cần chia sẻ trạng thái. Người dùng có thể tải lại trang, đổi tài khoản hoặc nhận kết quả thanh toán muộn; giao diện phải dùng được trên điện thoại và desktop.

## Quyết định

Dùng Next.js App Router/React/TypeScript, chia trang và component theo luồng. Zustand quản lý giỏ/phiên; store đọc/ghi storage qua các hàm riêng và hydrate dữ liệu theo tài khoản.

`apiFetch` dùng `fetch` qua `/api`; Next rewrite tới backend cấu hình bằng `BACKEND_API_URL` khi build. Client chuẩn hóa lỗi, xử lý timeout và đính kèm Bearer token. Token ưu tiên localStorage, có bộ nhớ dự phòng khi storage không khả dụng; dữ liệu user được tải lại từ API.

Backend là nguồn xác nhận giá, quyền, trạng thái đơn và điểm. Checkout giữ key/body của lần thử khi kết quả chưa rõ thay vì tự tạo giao dịch mới.

## Phương án cân nhắc

- **State cục bộ/React Context:** phù hợp dữ liệu hẹp; cần tự phối hợp nhiều màn hình, lưu trữ và các phiên checkout khi phạm vi tăng.
- **Redux Toolkit:** có cơ chế tổ chức và công cụ theo dõi khác; chưa có yêu cầu đủ rõ để thay store hiện tại.

## Hệ quả

- **Ưu điểm:** luồng tương tác và dữ liệu giỏ dùng chung; có thể khôi phục trạng thái sau reload; API client là một nơi xử lý lỗi HTTP.
- **Hạn chế:** phải xử lý hydration, browser storage và phản hồi cũ; localStorage chịu rủi ro XSS và không thể dùng làm căn cứ phân quyền.
- **Đánh đổi:** giữ cách lưu token hiện tại; nếu chuyển sang cookie HttpOnly cần thiết kế thêm luồng cookie/CSRF, proxy và test đăng nhập.

## Đối chiếu

[Stores](../../../apps/web/src/store/), [API client](../../../apps/web/src/lib/api/client.ts), [auth-session](../../../apps/web/src/lib/auth-session.ts), [checkout-flow](../../../apps/web/src/lib/checkout-flow.ts), [Next config](../../../apps/web/next.config.ts).
