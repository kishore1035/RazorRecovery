import { describe, it, expect } from "vitest";
import { MemoryService } from "../src/lib/memory";

describe("Recovery Memory", () => {
  it("should calculate confidence correctly based on threshold rules", () => {
    // 0-4 Low
    expect(MemoryService.calculateConfidence(2)).toBe("LOW");
    // 5-19 Medium
    expect(MemoryService.calculateConfidence(10)).toBe("MEDIUM");
    // 20+ High
    expect(MemoryService.calculateConfidence(25)).toBe("HIGH");
  });

  // Database upserts would be tested with integration tests in a real suite.
  // Testing the deterministic logic here.
});
