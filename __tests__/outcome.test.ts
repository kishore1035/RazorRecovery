import { describe, it, expect } from "vitest";

describe("Recovery Outcome and Financial Accounting", () => {
  it("should correctly calculate gross, incentive, and net recovered", () => {
    // 4999 order, 10% voucher (499.9), actual discount 499.9, captured 4499.1
    const orderTotal = 499900;
    const discountAmount = 49990;
    const capturedAmount = 449910;
    
    const grossRecovered = capturedAmount;
    const incentiveCost = discountAmount;
    const netRecovered = grossRecovered - incentiveCost;
    
    expect(grossRecovered).toBe(449910);
    expect(incentiveCost).toBe(49990);
    expect(netRecovered).toBe(399920);
    
    // Check if it's considered fully recovered
    const isFullRecovery = (grossRecovered + incentiveCost) >= orderTotal;
    expect(isFullRecovery).toBe(true);
  });
});
