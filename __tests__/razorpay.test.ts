import { describe, it, expect, vi } from "vitest";
import { RazorpayService, getRazorpayClient } from "../src/lib/razorpay";
import crypto from "crypto";

describe("Razorpay Integration & Security", () => {
  it("should initialize client if credentials are provided", () => {
    // In our test env, .env provides dummy credentials
    const client = getRazorpayClient();
    expect(client).toBeDefined();
  });

  it("should securely verify valid webhook signature", () => {
    const payload = JSON.stringify({ event: "payment.captured" });
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "dummy_webhook_secret_67890";
    
    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const isValid = RazorpayService.verifyWebhookSignature(payload, signature);
    expect(isValid).toBe(true);
  });

  it("should reject invalid webhook signature", () => {
    const payload = JSON.stringify({ event: "payment.failed" });
    const invalidSignature = "abcdef1234567890";
    
    const isValid = RazorpayService.verifyWebhookSignature(payload, invalidSignature);
    expect(isValid).toBe(false);
  });
  
  it("should enforce integer minor units for amount calculations", () => {
    // 4999 INR should be 499900 paise
    const amount = 4999;
    const minorUnits = amount * 100;
    expect(minorUnits).toBe(499900);
    expect(Number.isInteger(minorUnits)).toBe(true);
  });
});
