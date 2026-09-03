import { prisma } from "./db";

export interface TimeFilter {
  days: number;
}

export async function getRevenueHealthData(merchantId: string, days: number = 30) {
  const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
  const storeIds = stores.map(s => s.id);

  const now = new Date();
  const currentPeriodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

  // Active Cases (Current)
  const activeCases = await prisma.recoveryCase.findMany({
    where: {
      storeId: { in: storeIds },
      status: { notIn: ["RECOVERED", "STOPPED", "FAILED", "EXPIRED"] }
    }
  });

  const revenueAtRisk = activeCases.reduce((sum, c) => sum + c.riskAmount, 0);

  // Recoverable Revenue (based on opportunity score * riskAmount)
  const recoverableRevenue = activeCases.reduce(
    (sum, c) => sum + Math.round((c.riskAmount * (c.opportunityScore || 50)) / 100),
    0
  );

  // Outcomes Current Period
  const currentOutcomes = await prisma.recoveryOutcome.findMany({
    where: {
      recoveryCase: { storeId: { in: storeIds } },
      createdAt: { gte: currentPeriodStart }
    }
  });

  const netRecoveredRevenue = currentOutcomes.reduce((sum, o) => sum + o.netRecovered, 0);
  const grossRecoveredRevenue = currentOutcomes.reduce((sum, o) => sum + o.grossRecovered, 0);
  const totalIncentiveCost = currentOutcomes.reduce((sum, o) => sum + o.incentiveCost, 0);

  // Total Cases in Current Period
  const totalCasesInPeriod = await prisma.recoveryCase.count({
    where: {
      storeId: { in: storeIds },
      createdAt: { gte: currentPeriodStart }
    }
  });

  const recoveredCasesCount = currentOutcomes.filter(o => o.result === "RECOVERED" || o.result === "PARTIALLY_RECOVERED").length;
  const recoveryRate = totalCasesInPeriod > 0 ? recoveredCasesCount / totalCasesInPeriod : 0;

  // Recovery ROI: Net Recovered / Incentive Cost
  const recoveryROI = totalIncentiveCost > 0 ? netRecoveredRevenue / totalIncentiveCost : netRecoveredRevenue > 0 ? 10 : 0;

  // Outcomes Previous Period (for baseline)
  const previousOutcomes = await prisma.recoveryOutcome.findMany({
    where: {
      recoveryCase: { storeId: { in: storeIds } },
      createdAt: { gte: previousPeriodStart, lt: currentPeriodStart }
    }
  });

  const previousTotalCases = await prisma.recoveryCase.count({
    where: {
      storeId: { in: storeIds },
      createdAt: { gte: previousPeriodStart, lt: currentPeriodStart }
    }
  });

  const previousNetRecovered = previousOutcomes.reduce((sum, o) => sum + o.netRecovered, 0);
  const previousRecoveredCount = previousOutcomes.filter(o => o.result === "RECOVERED" || o.result === "PARTIALLY_RECOVERED").length;
  const previousRecoveryRate = previousTotalCases > 0 ? previousRecoveredCount / previousTotalCases : 0;

  const hasBaseline = previousTotalCases > 0 || previousOutcomes.length > 0;

  const netDeltaPercent = previousNetRecovered > 0 
    ? ((netRecoveredRevenue - previousNetRecovered) / previousNetRecovered) * 100
    : null;

  const rateDeltaPercent = previousRecoveryRate > 0
    ? (recoveryRate - previousRecoveryRate) * 100
    : null;

  return {
    revenueAtRisk,
    recoverableRevenue,
    netRecoveredRevenue,
    grossRecoveredRevenue,
    totalIncentiveCost,
    recoveryRate,
    recoveryROI,
    activeOpportunities: activeCases.length,
    hasBaseline,
    netDeltaPercent,
    rateDeltaPercent,
    days
  };
}

export async function getRevenueRecoveryTrend(merchantId: string, days: number = 30) {
  const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
  const storeIds = stores.map(s => s.id);

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const cases = await prisma.recoveryCase.findMany({
    where: { storeId: { in: storeIds }, createdAt: { gte: startDate } },
    select: { createdAt: true, riskAmount: true }
  });

  const outcomes = await prisma.recoveryOutcome.findMany({
    where: { recoveryCase: { storeId: { in: storeIds } }, createdAt: { gte: startDate } },
    select: { createdAt: true, grossRecovered: true, netRecovered: true }
  });

  // Group by date bucket
  const numBuckets = days <= 7 ? 7 : days <= 30 ? 10 : 12;
  const intervalMs = (days * 24 * 60 * 60 * 1000) / numBuckets;

  const buckets: { label: string; risk: number; gross: number; net: number }[] = [];

  for (let i = 0; i < numBuckets; i++) {
    const bucketStart = new Date(startDate.getTime() + i * intervalMs);
    const bucketEnd = new Date(startDate.getTime() + (i + 1) * intervalMs);

    const monthDay = bucketStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

    const riskInBucket = cases
      .filter(c => c.createdAt >= bucketStart && c.createdAt < bucketEnd)
      .reduce((sum, c) => sum + c.riskAmount, 0);

    const grossInBucket = outcomes
      .filter(o => o.createdAt >= bucketStart && o.createdAt < bucketEnd)
      .reduce((sum, o) => sum + o.grossRecovered, 0);

    const netInBucket = outcomes
      .filter(o => o.createdAt >= bucketStart && o.createdAt < bucketEnd)
      .reduce((sum, o) => sum + o.netRecovered, 0);

    buckets.push({
      label: monthDay,
      risk: riskInBucket,
      gross: grossInBucket,
      net: netInBucket
    });
  }

  return buckets;
}

export async function getStrategyPerformanceData(merchantId: string) {
  const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
  const storeIds = stores.map(s => s.id);

  const learningEvents = await prisma.recoveryLearningEvent.findMany({
    where: { storeId: { in: storeIds } }
  });

  const strategyMap: Record<string, { attempts: number; recoveries: number; gross: number; incentive: number; net: number }> = {
    "PAYMENT_LINK": { attempts: 0, recoveries: 0, gross: 0, incentive: 0, net: 0 },
    "PAYMENT_LINK_WITH_VOUCHER": { attempts: 0, recoveries: 0, gross: 0, incentive: 0, net: 0 },
    "RETRY": { attempts: 0, recoveries: 0, gross: 0, incentive: 0, net: 0 },
    "MESSAGE": { attempts: 0, recoveries: 0, gross: 0, incentive: 0, net: 0 }
  };

  learningEvents.forEach(evt => {
    const key = (evt.intervention || "PAYMENT_LINK").toUpperCase();
    if (!strategyMap[key]) {
      strategyMap[key] = { attempts: 0, recoveries: 0, gross: 0, incentive: 0, net: 0 };
    }
    strategyMap[key].attempts += 1;
    if (evt.outcome === "RECOVERED" || evt.outcome === "PARTIALLY_RECOVERED") {
      strategyMap[key].recoveries += 1;
    }
    strategyMap[key].gross += evt.grossRecovered;
    strategyMap[key].incentive += evt.incentiveCost;
    strategyMap[key].net += evt.netRecovered;
  });

  // Also query AIDecisions if learningEvents are sparse
  const decisions = await prisma.aIDecision.findMany({
    where: { recoveryCase: { storeId: { in: storeIds } } },
    include: { recoveryCase: { include: { recoveryOutcome: true } } }
  });

  decisions.forEach(d => {
    const key = d.recommendedAction.toUpperCase();
    if (!strategyMap[key]) {
      strategyMap[key] = { attempts: 0, recoveries: 0, gross: 0, incentive: 0, net: 0 };
    }
    // If not already counted in learning events
    if (learningEvents.length === 0) {
      strategyMap[key].attempts += 1;
      const outcome = d.recoveryCase.recoveryOutcome;
      if (outcome) {
        if (outcome.result === "RECOVERED" || outcome.result === "PARTIALLY_RECOVERED") {
          strategyMap[key].recoveries += 1;
        }
        strategyMap[key].gross += outcome.grossRecovered;
        strategyMap[key].incentive += outcome.incentiveCost;
        strategyMap[key].net += outcome.netRecovered;
      }
    }
  });

  return Object.entries(strategyMap).map(([strat, stats]) => ({
    strategy: strat,
    attempts: stats.attempts,
    recoveryRate: stats.attempts > 0 ? stats.recoveries / stats.attempts : 0,
    grossRecovered: stats.gross,
    incentiveCost: stats.incentive,
    netRecovered: stats.net
  })).sort((a, b) => b.netRecovered - a.netRecovered);
}

export async function getPaymentHealthData(merchantId: string) {
  const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
  const storeIds = stores.map(s => s.id);

  const payments = await prisma.payment.findMany({
    where: { order: { storeId: { in: storeIds } } },
    select: { method: true, status: true, createdAt: true }
  });

  const methodMap: Record<string, { total: number; captured: number; failed: number }> = {};

  payments.forEach(p => {
    const m = (p.method || "card").toUpperCase();
    if (!methodMap[m]) methodMap[m] = { total: 0, captured: 0, failed: 0 };
    methodMap[m].total += 1;
    if (p.status === "CAPTURED") methodMap[m].captured += 1;
    if (p.status === "FAILED") methodMap[m].failed += 1;
  });

  const result = Object.entries(methodMap).map(([method, stats]) => {
    const successRate = stats.total > 0 ? (stats.captured / stats.total) * 100 : 100;
    const isDegraded = stats.total >= 2 && successRate < 75;
    return {
      method,
      total: stats.total,
      captured: stats.captured,
      failed: stats.failed,
      successRate: Math.round(successRate),
      isDegraded
    };
  });

  return result;
}
