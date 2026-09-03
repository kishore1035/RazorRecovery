import { PaymentDegradationController } from "./leak-detector";

export const InsightEngine = {
  async getRevenueHealthScore(storeId: string) {
    const health = await PaymentDegradationController.getHealth(storeId);
    if (health.status === "SEVERE") return "Critical";
    if (health.status === "DEGRADED") return "Needs Attention";
    return "Healthy";
  },
  
  async getForecast(storeId: string, riskVolume: number, historicalRecoveryRate: number) {
    // Simplified foundation for recoverable revenue forecasting
    return {
      expectedRecoverableRevenue: Math.floor(riskVolume * historicalRecoveryRate),
      confidence: historicalRecoveryRate > 0 ? "MEDIUM" : "LOW"
    };
  }
};
