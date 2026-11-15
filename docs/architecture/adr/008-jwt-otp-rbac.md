# ADR 008 — JWT, OTP và phân quyền trên server

**Trạng thái:** Đang áp dụng, ghi nhận lại ngày 14/11/2026.

## Bối cảnh

Khách hàng chỉ được thao tác trên đơn của mình; barista và manager có các quyền nghiệp vụ khác nhau. Người dùng có thể đăng nhập bằng SĐT hoặc email, còn tài khoản có SĐT cần xác minh trước khi nhận quyền truy cập.

## Quyết định

Auth dùng mật khẩu băm bcrypt và JWT Bearer; Passport/JWT guard kiểm tra token, RolesGuard kiểm tra vai trò trên route được cấu hình. Các service vẫn kiểm tra quyền sở hữu đơn/giao dịch, không dựa vào việc UI có ẩn nút hay không.

Đăng ký tài khoản có SĐT lưu trạng thái chờ OTP. OTP được lưu dạng hash dùng secret riêng; có hết hạn, giới hạn thử và thời gian chờ gửi lại. JWT và điểm chào mừng chỉ cấp sau bước xác minh hợp lệ trong luồng này. Email/SĐT là thông tin đăng nhập unique, `User.id` số nguyên là định danh dữ liệu.

`CUSTOMER`, `BARISTA`, `MANAGER` được kiểm tra theo quyền từng endpoint. Ở bản 15/11, các route nghiệp vụ quầy/kho/sản phẩm và đơn có `@Roles('BARISTA', 'MANAGER')`, vì vậy Manager làm được các chức năng BARISTA được cấp quyền trong source, nhưng đây là phân quyền tường minh — không phải kế thừa tự động từ enum. `GET/POST /api/admin/staff` và `PATCH /api/products/:id/status` chỉ cấp cho MANAGER; quyền tạo staff không yêu cầu OTP cho tài khoản do quản lý cấp. OTP demo cố định chỉ được bật ở development/test với SMS local. eSMS dùng mã ngẫu nhiên, kể cả khi chạy development.

## Phương án cân nhắc

- **Session/cookie phía server:** có cơ chế thu hồi và cookie phù hợp từng cách triển khai; cần bổ sung quản lý session và bảo vệ CSRF theo thiết kế cụ thể.
- **Chỉ kiểm tra phía frontend:** thuận tiện hiển thị nhưng không bảo vệ được API khi gọi trực tiếp.

## Hệ quả

- **Ưu điểm:** client/Postman dùng chung Bearer token; kiểm tra vai trò và chủ dữ liệu nằm ở server; OTP gắn với trạng thái tài khoản.
- **Hạn chế:** hiện chưa có refresh-token rotation hoặc danh sách thu hồi token. Lưu token ở browser storage có rủi ro XSS; token hợp lệ không thay thế kiểm tra quyền sở hữu.
- **Đánh đổi:** giữ luồng JWT hiện có; nếu cần thu hồi phiên tức thời, thay cách lưu token hoặc tích hợp SSO phải bổ sung thiết kế và test tương ứng.

## Đối chiếu

[StaffController](../../../apps/api/src/auth/staff.controller.ts), [ProductsController](../../../apps/api/src/products/products.controller.ts), [AuthModule](../../../apps/api/src/auth/auth.module.ts), [AuthService](../../../apps/api/src/auth/auth.service.ts), [OtpService](../../../apps/api/src/auth/otp.service.ts), [RolesGuard](../../../apps/api/src/common/guards/roles.guard.ts), [JWT strategy](../../../apps/api/src/auth/jwt.strategy.ts), [auth-session](../../../apps/web/src/lib/auth-session.ts).
