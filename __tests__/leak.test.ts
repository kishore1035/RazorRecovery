import { describe, it, expect } from "vitest";
import { InsightEngine } from "../src/lib/insights";

describe("Revenue Leak & Insights", () => {
  it("should calculate correct health score based on severity", async () => {
    // We mock or just test the logic foundation
    const forecast = await InsightEngine.getForecast("store1", 100000, 0.75);
    expect(forecast.expectedRecoverableRevenue).toBe(75000);
    expect(forecast.confidence).toBe("MEDIUM");
  });

  it("should return low confidence forecast if recovery rate is zero", async () => {
    const forecast = await InsightEngine.getForecast("store1", 100000, 0);
    expect(forecast.expectedRecoverableRevenue).toBe(0);
    expect(forecast.confidence).toBe("LOW");
  });
});
