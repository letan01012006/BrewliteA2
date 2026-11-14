import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test-only-jwt-secret-at-least-32-characters",
      JWT_EXPIRES_IN: "1d",
      OTP_HASH_SECRET: "test-only-otp-hmac-secret-at-least-32-characters",
      AUTH_OTP_DEMO: "false",
      SMS_PROVIDER: "local",
      ESMS_API_KEY: "",
      ESMS_SECRET_KEY: "",
      ESMS_BRANDNAME: "",
      PAYMENT_MOCK_ENABLED: "true",
    },
    include: ["test/**/*.e2e-spec.ts"],
  },
});
