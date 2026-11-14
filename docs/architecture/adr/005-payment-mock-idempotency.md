# ADR 005 — Mock payment, adapter gateway và idempotency

**Trạng thái:** Đang áp dụng, ghi nhận lại ngày 14/11/2026.

## Bối cảnh

Luồng mua hàng cần kiểm tra được cả thành công và thất bại mà không phụ thuộc giao dịch thật. Mạng chậm, double click hoặc callback lặp có thể dẫn đến xử lý thanh toán nhiều lần nếu chỉ khóa nút trên giao diện.

## Quyết định

`PaymentsService` điều phối thanh toán; `MockPaymentService` cung cấp WALLET/CARD giả lập trong cùng tiến trình. `mockResult: FAILED` ép kết quả thất bại; trường hợp còn lại mock trả thành công. Quyền dùng mock phụ thuộc `PAYMENT_MOCK_ENABLED` và `NODE_ENV` theo service, không chỉ dựa vào việc client gửi cờ.

Giữ `VnpayGateway` và adapter mặc định cho VNPAY; test có thể thay provider này. Không đồng nhất mock thành công với gateway thật đã được nghiệm thu.

Kết hợp unique constraint, hash nội dung, quyền sở hữu và transaction để xử lý replay:

- Payment có key bắt buộc và unique; cùng key nhưng khác nội dung/chủ đơn bị từ chối.
- Tạo đơn hỗ trợ key theo người dùng; frontend luôn gửi. API hiện vẫn cho phép tạo đơn không có key, khi đó không có bảo vệ replay theo key.
- Client giữ key/body khi timeout hoặc thanh toán còn đang xử lý; không tự gửi mutation mới để đoán kết quả.
- Khóa dòng đơn khi phối hợp thanh toán, hủy và cập nhật trạng thái. Gọi gateway ngoài phần transaction ghi nhận yêu cầu; sau đó lưu kết quả hoặc đối soát.

## Phương án cân nhắc

- **Chỉ disable nút:** hỗ trợ UX nhưng không bảo vệ khi reload hoặc gọi trực tiếp API.
- **Luôn gọi sandbox thật:** cần cho nghiệm thu tích hợp nhưng không phù hợp mọi ca lỗi lặp lại trong unit/E2E.

## Hệ quả

- **Ưu điểm:** có test lặp lại được; giảm xử lý trùng trong phạm vi dữ liệu của hệ thống; hỗ trợ xử lý kết quả phản hồi muộn.
- **Hạn chế:** tăng trạng thái trung gian, dữ liệu replay và logic đối soát; PostgreSQL không thể rollback tác động ở một gateway bên ngoài.
- **Đánh đổi:** chấp nhận phối hợp nhiều bước; không cam kết exactly-once với nhà cung cấp trong mọi tình huống. Sandbox thật, chữ ký, timeout, retry và hoàn tiền phải được kiểm tra riêng trước khi dùng thật.

## Đối chiếu

[Mock](../../../apps/api/src/payments/mock-payment.service.ts), [PaymentsService](../../../apps/api/src/payments/payments.service.ts), [gateway](../../../apps/api/src/payments/vnpay/vnpay.gateway.ts), [schema](../../../apps/api/prisma/schema.prisma), [test VNPAY](../../../apps/api/test/payments-vnpay.e2e-spec.ts), [test tạo đơn lặp](../../../apps/api/test/orders-idempotency.e2e-spec.ts).
