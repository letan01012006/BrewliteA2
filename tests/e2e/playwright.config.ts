import { defineConfig, devices } from '@playwright/test';

// Chạy với web ở :3000 và API ở :4000 đã khởi động (docker compose up, hoặc npm run dev).
// Ghi đè bằng E2E_WEB_URL / E2E_API_URL khi chạy trên môi trường khác.
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_WEB_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Giao diện mobile-first: kiểm thử ở viewport điện thoại.
    ...devices['Pixel 7'],
    // Tùy chọn: dùng Chromium có sẵn thay vì bản Playwright tự tải.
    launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH || undefined },
  },
});
