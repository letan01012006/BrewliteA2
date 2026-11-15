import { expect, test } from '@playwright/test';

// Hồi quy: nếu trang không hydrate (ví dụ `npm run dev` mở bằng 127.0.0.1 mà thiếu
// allowedDevOrigins), click các tab sẽ không đổi trạng thái.
test('trang đăng nhập hydrate và chuyển được giữa SĐT và Email', async ({ page }) => {
  await page.goto('/login');
  const phoneTab = page.getByRole('button', { name: 'Số điện thoại', exact: true });
  const emailTab = page.getByRole('button', { name: 'Email', exact: true });
  const identifier = page.locator('#login-identifier');

  await expect(identifier).toHaveAttribute('type', 'tel');

  await emailTab.click();
  await expect(emailTab).toHaveAttribute('aria-pressed', 'true');
  await expect(identifier).toHaveAttribute('type', 'email');

  await phoneTab.click();
  await expect(phoneTab).toHaveAttribute('aria-pressed', 'true');
  await expect(identifier).toHaveAttribute('type', 'tel');
});
