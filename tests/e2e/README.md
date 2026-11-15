# Kiểm thử end-to-end trên trình duyệt (Playwright)

Kịch bản trong thư mục này chạy trên giao diện thật, qua web (`:3000`) và API (`:4000`).

| Tệp | Nội dung |
|---|---|
| `checkout-flow.spec.ts` | Đăng nhập → menu → thêm món → giỏ hàng → thanh toán bằng điểm thưởng → màn hình xác nhận → danh sách đơn (Đã thanh toán) |
| `login-tabs.spec.ts` | Hồi quy hydrate: chuyển tab Số điện thoại / Email ở `/login` |

Thanh toán dùng **điểm thưởng 100%** vì giao diện checkout hiện chỉ có VNPAY và điểm; mỗi lần chạy tạo một khách mới (đăng ký + OTP demo `123456`) nên có thể chạy lặp lại.

## Chạy cục bộ

```bash
cp apps/api/.env.example apps/api/.env   # có AUTH_OTP_DEMO=true và PAYMENT_MOCK_ENABLED=true
docker compose up --build          # hoặc chạy db + api + web bằng npm
cd tests/e2e
npm install
npx playwright install chromium
npm test
```

Biến tùy chọn: `E2E_WEB_URL` (mặc định `http://127.0.0.1:3000`), `E2E_API_URL` (mặc định `http://127.0.0.1:4000/api`), `E2E_OTP`, `E2E_CHROMIUM_PATH`.
API cần `AUTH_OTP_DEMO=true`. Nếu chạy web bằng `npm run dev` và mở bằng `127.0.0.1`, `next.config.ts` phải có `allowedDevOrigins: ["127.0.0.1"]`.

CI chạy các kịch bản này trong job `E2E (api + browser)` cùng `npm run test:e2e` của API.
