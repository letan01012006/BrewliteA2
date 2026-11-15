import { expect, test, type APIRequestContext } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:4000/api';
const OTP = process.env.E2E_OTP ?? '123456'; // OTP cố định chỉ có khi AUTH_OTP_DEMO=true
const PASSWORD = 'E2e@12345';

/** Tạo khách mới đã xác minh OTP để mỗi lần chạy độc lập, không dùng lại dữ liệu cũ. */
async function createVerifiedCustomer(request: APIRequestContext) {
  const suffix = `${Date.now()}`.slice(-8);
  const phone = `09${suffix}`;
  const register = await request.post(`${API_URL}/auth/register`, {
    data: { fullName: 'Khách E2E', phone, email: `e2e-${suffix}@test.example`, password: PASSWORD },
  });
  expect(register.ok(), await register.text()).toBeTruthy();
  const verify = await request.post(`${API_URL}/auth/verify-otp`, { data: { phone, code: OTP } });
  expect(verify.ok(), await verify.text()).toBeTruthy();
  return { phone };
}

test('khách đặt món từ menu đến khi xem được đơn đã thanh toán', async ({ page, request }) => {
  const { phone } = await createVerifiedCustomer(request);

  // 1. Đăng nhập bằng số điện thoại.
  await page.goto('/login');
  await page.getByLabel(/Số điện thoại/).fill(phone);
  await page.getByPlaceholder('Nhập mật khẩu...').fill(PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));

  // 2. Menu: mở tùy chọn của món đầu tiên và thêm vào giỏ.
  await page.goto('/menu');
  const firstCard = page.locator('article.product-card').first();
  await expect(firstCard).toBeVisible();
  await firstCard.getByRole('button').click();
  await page.getByRole('button', { name: 'Thêm vào giỏ' }).click();
  await expect(page.getByText('Đã thêm vào giỏ!')).toBeVisible();

  // 3. Giỏ hàng -> thanh toán.
  await page.goto('/cart');
  await page.getByRole('button', { name: /Tiến hành Đặt hàng & Thanh toán/ }).click();
  await page.waitForURL('**/checkout');

  // 4. Dùng điểm thưởng chi trả 100% đơn (khách mới có điểm chào mừng) -> PAID ngay, không qua VNPAY.
  await page.getByRole('switch', { name: /Dùng điểm tối đa/ }).check();
  await expect(page.getByText(/chi trả 100% đơn hàng/)).toBeVisible();
  await page.getByRole('button', { name: /Thanh toán bằng điểm thưởng/ }).click();

  // 5. Màn hình xác nhận có mã đơn.
  await expect(page.getByRole('heading', { name: 'Cảm ơn bạn đã đặt món!' })).toBeVisible();
  const orderId = (await page.getByText(/^#\d+$|^#[0-9a-z-]{6,}$/i).first().innerText()).trim();

  // 6. Theo dõi đơn: đơn xuất hiện với trạng thái Đã thanh toán.
  await page.getByRole('link', { name: /Theo dõi đơn hàng của tôi/ }).click();
  await page.waitForURL('**/orders');
  await expect(page.getByText(orderId).first()).toBeVisible();
  await expect(page.getByText('Đã thanh toán').first()).toBeVisible();
});
