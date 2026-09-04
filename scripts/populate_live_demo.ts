import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function populateLiveDemo() {
  console.log("Populating realistic live demo data...");

  const store = await prisma.store.findFirst();
  if (!store) {
    console.log("No store found");
    return;
  }
  const storeId = store.id;

  // 1. Revenue Leaks
  await prisma.revenueLeak.createMany({
    data: [
      {
        storeId,
        type: "PAYMENT_METHOD_DEGRADATION",
        severity: "HIGH",
        status: "ACTIVE",
        title: "UPI authorization rates degraded by 14%",
        description: "UPI success dropped from 88.2% baseline to 74.1%. Bank partner APIs reporting high latency.",
        affectedRevenue: 2450000, // ₹24,500
        estimatedRecoverableRevenue: 612500, // ₹6,125
        affectedTransactions: 28,
        confidence: "HIGH",
        evidence: JSON.stringify({ baseline: 0.882, current: 0.741, drop: 0.141 }),
        recommendedAction: "Failover to alternate UPI gateway and suggest Netbanking."
      },
      {
        storeId,
        type: "CHECKOUT_ABANDONMENT_SPIKE",
        severity: "MEDIUM",
        status: "ACTIVE",
        title: "Checkout drop-off on Premium Electronics",
        description: "Significant increase in abandonment after shipping details on orders > ₹20,000.",
        affectedRevenue: 8500000, // ₹85,000
        estimatedRecoverableRevenue: 1700000, // ₹17,000
        affectedTransactions: 12,
        confidence: "MEDIUM",
        evidence: JSON.stringify({ category: "Electronics", abandonmentRate: 0.65 }),
        recommendedAction: "Trigger WhatsApp Recovery Autopilot with limited-time 5% Voucher."
      }
    ]
  });

  // 2. Recovery Memory
  await prisma.recoveryMemory.createMany({
    data: [
      {
        storeId,
        segmentType: "PAYMENT_METHOD",
        segmentKey: "UPI",
        intervention: "PAYMENT_LINK",
        sampleSize: 342,
        attempts: 342,
        recoveries: 289,
        recoveryRate: 0.845,
        averageRecoveryTime: 320,
        averageIncentiveCost: 0,
        grossRecovered: 15400000,
        netRecovered: 15400000,
        confidence: "HIGH",
        memoryVersion: 1
      },
      {
        storeId,
        segmentType: "CUSTOMER_SEGMENT",
        segmentKey: "HIGH_VALUE_CART",
        intervention: "PAYMENT_LINK_WITH_VOUCHER",
        sampleSize: 128,
        attempts: 128,
        recoveries: 94,
        recoveryRate: 0.734,
        averageRecoveryTime: 600,
        averageIncentiveCost: 50000,
        grossRecovered: 28000000,
        netRecovered: 23300000,
        confidence: "HIGH",
        memoryVersion: 1
      },
      {
        storeId,
        segmentType: "PRODUCT_CATEGORY",
        segmentKey: "ELECTRONICS",
        intervention: "PAYMENT_LINK",
        sampleSize: 85,
        attempts: 85,
        recoveries: 42,
        recoveryRate: 0.494,
        averageRecoveryTime: 1200,
        averageIncentiveCost: 0,
        grossRecovered: 12500000,
        netRecovered: 12500000,
        confidence: "MEDIUM",
        memoryVersion: 1
      }
    ]
  });

  // 3. Recovery Experiment
  const exp = await prisma.recoveryExperiment.create({
    data: {
      storeId,
      name: "Dynamic Voucher vs Standard Link on High-Value Drop-offs",
      description: "Evaluating if offering a dynamic 5% voucher yields higher net revenue than a standard reminder link for carts > ₹10,000.",
      hypothesis: "The 5% voucher will improve conversion by at least 20%, offsetting the incentive cost.",
      status: "RUNNING",
      experimentType: "A_B_TEST",
      controlStrategy: "PAYMENT_LINK",
      variantStrategy: "PAYMENT_LINK_WITH_VOUCHER",
      eligibilityRules: JSON.stringify({ minAmount: 1000000 }),
      sampleTarget: 200,
      successMetric: "NET_RECOVERED_REVENUE",
      budgetLimit: 10000000,
      currentSpend: 450000,
      startAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.recoveryExperimentArm.createMany({
    data: [
      {
        experimentId: exp.id,
        name: "Control: Payment Link",
        strategy: "PAYMENT_LINK",
        allocationPercentage: 50,
        eligibleCount: 85,
        attemptCount: 85,
        recoveryCount: 41,
        grossRecovered: 8200000,
        incentiveCost: 0,
        netRecovered: 8200000,
        averageRecoveryTime: 450
      },
      {
        experimentId: exp.id,
        name: "Variant: Payment Link + 5% Voucher",
        strategy: "PAYMENT_LINK_WITH_VOUCHER",
        allocationPercentage: 50,
        eligibleCount: 88,
        attemptCount: 88,
        recoveryCount: 67,
        grossRecovered: 13400000,
        incentiveCost: 670000,
        netRecovered: 12730000,
        averageRecoveryTime: 310
      }
    ]
  });

  console.log("Realistic live demo data populated successfully!");
}

populateLiveDemo()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
