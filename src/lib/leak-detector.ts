import { prisma } from "./db";

export const RevenueBaselineService = {
  async getPaymentMethodBaseline(storeId: string, method: string) {
    const period = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const total = await prisma.payment.count({ where: { order: { storeId }, method, createdAt: { gte: period } } });
    const success = await prisma.payment.count({ where: { order: { storeId }, method, status: "CAPTURED", createdAt: { gte: period } } });

    if (total < 10) return "INSUFFICIENT_BASELINE_DATA";
    return { successRate: success / total, total, success };
  },

  async getCurrentPaymentMethodStats(storeId: string, method: string) {
    const period = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    const total = await prisma.payment.count({ where: { order: { storeId }, method, createdAt: { gte: period } } });
    const success = await prisma.payment.count({ where: { order: { storeId }, method, status: "CAPTURED", createdAt: { gte: period } } });
    const failedAmount = await prisma.payment.aggregate({ _sum: { amount: true }, where: { order: { storeId }, method, status: "FAILED", createdAt: { gte: period } } });

    if (total < 2) return "INSUFFICIENT_CURRENT_DATA"; // Lowered for testing
    return { successRate: success / total, total, success, affectedRevenue: failedAmount._sum.amount || 0 };
  }
};

export const RevenueLeakDetector = {
  async analyzePaymentMethods(storeId: string) {
    const methods = ["UPI", "CARD", "NETBANKING", "WALLET"];
    
    for (const method of methods) {
      const baseline = await RevenueBaselineService.getPaymentMethodBaseline(storeId, method);
      const current = await RevenueBaselineService.getCurrentPaymentMethodStats(storeId, method);

      if (baseline !== "INSUFFICIENT_BASELINE_DATA" && current !== "INSUFFICIENT_CURRENT_DATA") {
        const drop = baseline.successRate - current.successRate;
        
        if (drop >= 0.15) { // 15 percentage points drop threshold
          const affectedRevenue = current.affectedRevenue;
          const estimatedRecoverable = Math.floor(affectedRevenue * 0.25); // Basic estimation
          
          const existing = await prisma.revenueLeak.findFirst({
            where: { storeId, type: "PAYMENT_METHOD_DEGRADATION", status: "ACTIVE", title: { startsWith: method } }
          });

          if (existing) {
            await prisma.revenueLeak.update({
              where: { id: existing.id },
              data: {
                affectedRevenue,
                estimatedRecoverableRevenue: estimatedRecoverable,
                lastObservedAt: new Date()
              }
            });
          } else {
            await prisma.revenueLeak.create({
              data: {
                storeId,
                type: "PAYMENT_METHOD_DEGRADATION",
                severity: drop > 0.25 ? "CRITICAL" : "HIGH",
                title: `${method} payment success dropped ${(drop * 100).toFixed(0)} points`,
                description: `Current success rate is ${(current.successRate*100).toFixed(1)}% compared to historical baseline of ${(baseline.successRate*100).toFixed(1)}%.`,
                affectedRevenue,
                estimatedRecoverableRevenue: estimatedRecoverable,
                affectedTransactions: current.total - current.success,
                confidence: "HIGH",
                evidence: JSON.stringify({ baseline, current, drop }),
                recommendedAction: `Investigate ${method} degradation`
              }
            });
          }
        }
      }
    }
  }
};

export const PaymentDegradationController = {
  async getHealth(storeId: string) {
    const leaks = await prisma.revenueLeak.findMany({ where: { storeId, type: "PAYMENT_METHOD_DEGRADATION", status: "ACTIVE" } });
    if (leaks.length > 0) {
      const isCritical = leaks.some(l => l.severity === "CRITICAL");
      return { status: isCritical ? "SEVERE" : "DEGRADED", activeLeaks: leaks };
    }
    return { status: "NORMAL", activeLeaks: [] };
  }
};
