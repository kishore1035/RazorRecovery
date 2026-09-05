import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: "file:./dev.db",
      RAZORPAY_KEY_ID: "rzp_test_dummy_key_id",
      RAZORPAY_KEY_SECRET: "dummy_key_secret_for_tests",
      RAZORPAY_WEBHOOK_SECRET: "dummy_webhook_secret_67890",
      JWT_SECRET: "dummy_jwt_secret_test_environment_12345",
      AI_PROVIDER_API_KEY: "dummy_test_ai_key",
    },
  },
});
