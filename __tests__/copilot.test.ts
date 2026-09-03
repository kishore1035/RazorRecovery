import { describe, it, expect } from "vitest";
import { CopilotService } from "../src/lib/copilot";

describe("Recovery Copilot", () => {
  it("should fail gracefully if unauthorized or missing credentials", async () => {
    // Tests that unauthorized access throws
    await expect(CopilotService.processRequest("bad-merchant", "store1", "user1", "hello"))
      .rejects.toThrow();
  });
});
