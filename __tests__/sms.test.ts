import { describe, it, expect, vi } from "vitest";
import {
  SMSService,
  buildPaymentFailureMessage,
  buildRecoveryActionMessage,
} from "../src/lib/sms";

describe("SMSService & Motivational Recovery Templates", () => {
  it("should generate a high-converting, empathetic payment failure message with retry link", () => {
    const msg = buildPaymentFailureMessage({
      customerName: "Kishore",
      phoneNumber: "+919876543210",
      amount: 2999000, // ₹29,990.00
      productName: "Sony WH-1000XM5 Headphones",
      paymentLinkUrl: "https://rzp.io/i/fail_retry_123",
      failureReason: "Bank server timeout",
    });

    // Verify key motivational elements
    expect(msg).toContain("Oh no, Kishore!");
    expect(msg).toContain("29,990");
    expect(msg).toContain("Sony WH-1000XM5 Headphones");
    expect(msg).toContain("failed");
    expect(msg).toContain("safely reserved");
    expect(msg).toContain("👉 To try again and complete your purchase, click this link:");
    expect(msg).toContain("https://rzp.io/i/fail_retry_123");
    expect(msg).toContain("Fast & secure 1-click checkout");
  });

  it("should provide friendly fallback name if customer name is missing or generic", () => {
    const msg = buildPaymentFailureMessage({
      customerName: "Customer",
      phoneNumber: "+919876543210",
      amount: 49900, // ₹499.00
      productName: "UrbanStep Running Socks",
      paymentLinkUrl: "https://rzp.io/i/test_link",
    });

    expect(msg).toContain("Oh no, there!");
    expect(msg).toContain("499");
    expect(msg).toContain("https://rzp.io/i/test_link");
  });

  it("should generate motivational recovery message with exclusive discount", () => {
    const msg = buildRecoveryActionMessage({
      customerName: "Rahul",
      phoneNumber: "+919876543210",
      amount: 500000, // ₹5,000
      discountAmount: 50000, // ₹500
      discountPercent: 10,
      recoveryLinkUrl: "https://rzp.io/i/rec_voucher_456",
    });

    expect(msg).toContain("Hey Rahul! 🎁");
    expect(msg).toContain("We saved ₹500 off for you!");
    expect(msg).toContain("10% discount has been applied");
    expect(msg).toContain("https://rzp.io/i/rec_voucher_456");
    expect(msg).toContain("valid for 24 hours only");
  });

  it("should gracefully handle empty phone number without error", async () => {
    const result = await SMSService.paymentFailed({
      customerName: "Anonymous",
      phoneNumber: "",
      amount: 10000,
      productName: "Test Item",
    });

    expect(result.success).toBe(false);
    expect(result.provider).toBe("NONE");
  });

  it("should dispatch via simulator when live credentials are not set", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const result = await SMSService.paymentFailed({
      customerName: "Priya",
      phoneNumber: "+919876543210",
      amount: 150000, // ₹1,500
      productName: "Wireless Earbuds",
      paymentLinkUrl: "https://rzp.io/i/retry_xyz",
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe("SIMULATED");
    expect(result.message).toContain("Oh no, Priya!");
    expect(result.message).toContain("1,500");
    expect(result.message).toContain("https://rzp.io/i/retry_xyz");

    consoleSpy.mockRestore();
  });
});
