import { describe, it, expect } from "vitest";
import { ExperimentAssignmentService } from "../src/lib/experiment";

describe("Recovery Experiment", () => {
  it("should fail assignment gracefully if no active experiment exists", async () => {
    // This expects the environment to be clean or mocked
    const result = await ExperimentAssignmentService.assignCaseIfEligible("fake-case-id");
    expect(result).toBeNull();
  });
});
