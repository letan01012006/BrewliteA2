# ADR 006 — Web responsive hiện tại và phương án PWA

**Trạng thái:** Web/retirement đang áp dụng; PWA đầy đủ là đề xuất, chưa triển khai. Ghi nhận ngày 14/11/2026.

## Bối cảnh

Người dùng cần truy cập thuận tiện trên điện thoại. Giao diện mobile-first không tự tạo thành một PWA; service worker cũ có thể giữ tài nguyên hoặc dữ liệu không còn phù hợp với phiên checkout hiện tại.

## Quyết định hiện tại

Giữ web responsive và cơ chế gỡ PWA cũ. `LegacyPwaCleanup` chỉ xử lý worker root `/sw.js` và cache có prefix BrewLite cũ; retirement worker tự unregister. Các thành phần này không cung cấp offline API, không đăng ký worker mới, không được dùng để chứng minh khả năng cài đặt/offline.

## Phương án PWA đề xuất

Bổ sung manifest, icons và cấu hình triển khai HTTPS theo [hướng dẫn PWA Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps). Nếu thêm service worker:

- Chỉ cache tài nguyên giao diện được chọn và có quy tắc cập nhật/version rõ ràng.
- Không cache response riêng tư hoặc kết quả thanh toán; không lưu queue gửi lại mutation đặt hàng/thanh toán nền.
- Dữ liệu giá, kho, đơn, điểm và xác thực cần server xác nhận. Offline hiển thị mất kết nối, giữ bản nháp giỏ và chặn xác nhận giao dịch.
- Không tự reload khi người dùng đang checkout; cần tránh để logic retirement gỡ worker mới trước khi phát hành.

## Tiêu chí nghiệm thu trước khi đổi trạng thái ADR

1. Manifest/icons được kiểm tra và có bằng chứng cài đặt trên thiết bị mục tiêu.
2. Có kiểm tra cập nhật worker/cache và phiên bản frontend đang mở.
3. Thử offline/online lại trong checkout, logout/đổi tài khoản; không hiển thị đơn hoặc số dư từ cache của tài khoản khác.
4. Unit/browser test liên quan và CI đạt; tài liệu triển khai ghi rõ hành vi được hỗ trợ.

## Hệ quả và phương án khác

**Lợi ích dự kiến:** có thể thêm khả năng cài đặt và dùng lại tài nguyên giao diện mà vẫn giữ một codebase web. **Hạn chế:** thêm vòng đời worker/cache và ma trận trình duyệt cần kiểm tra. **Đánh đổi:** trước mắt ưu tiên dữ liệu giao dịch mới và luồng web ổn định; app native hoặc offline ordering chưa thuộc phạm vi hiện thực này.

## Đối chiếu

[Layout](../../../apps/web/src/app/layout.tsx), [cleanup](../../../apps/web/src/lib/legacy-pwa-cleanup.ts), [retirement worker](../../../apps/web/public/sw.js), [test service worker](../../../apps/web/test/service-worker.test.mjs).
