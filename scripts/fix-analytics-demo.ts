import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixDemo() {
  console.log("Fixing demo data for Netbanking / Wallet & Graph Trends...");

  const store = await prisma.store.findFirst();
  if (!store) {
    console.log("No store found");
    return;
  }
  const storeId = store.id;

  // Clear existing analytical and outcome data to reset perfectly
  await prisma.revenueLeak.deleteMany();
  await prisma.recoveryMemory.deleteMany();
  await prisma.recoveryExperimentArm.deleteMany();
  await prisma.recoveryExperiment.deleteMany();
  await prisma.recoveryOutcome.deleteMany();
  await prisma.recoveryAction.deleteMany();
  await prisma.policyEvaluation.deleteMany();
  await prisma.recoveryOption.deleteMany();
  await prisma.aIDecision.deleteMany();
  await prisma.recoveryCase.deleteMany();

  // 1. REVENUE LEAKS (NETBANKING / WALLET)
  await prisma.revenueLeak.createMany({
    data: [
      {
        storeId,
        type: "PAYMENT_METHOD_DEGRADATION",
        severity: "HIGH",
        status: "ACTIVE",
        title: "NETBANKING authorization rates degraded by 12%",
        description: "Netbanking success dropped from 86.2% baseline to 74.1%. Bank partner APIs reporting high latency.",
        affectedRevenue: 3450000, 
        estimatedRecoverableRevenue: 862500,
        affectedTransactions: 32,
        confidence: "HIGH",
        evidence: JSON.stringify({ baseline: 0.862, current: 0.741, drop: 0.121 }),
        recommendedAction: "Failover to alternate PG and trigger Recovery Link."
      },
      {
        storeId,
        type: "PAYMENT_METHOD_DEGRADATION",
        severity: "MEDIUM",
        status: "ACTIVE",
        title: "WALLET timeout spike on high-value carts",
        description: "Significant increase in Wallet timeouts after 2FA on orders > ₹15,000.",
        affectedRevenue: 1250000,
        estimatedRecoverableRevenue: 450000,
        affectedTransactions: 15,
        confidence: "MEDIUM",
        evidence: JSON.stringify({ method: "WALLET", abandonmentRate: 0.55 }),
        recommendedAction: "Trigger WhatsApp Recovery Autopilot with limited-time 5% Voucher."
      }
    ]
  });

  // 2. RECOVERY MEMORY (NETBANKING / WALLET)
  await prisma.recoveryMemory.createMany({
    data: [
      {
        storeId,
        segmentType: "PAYMENT_METHOD",
        segmentKey: "NETBANKING",
        intervention: "PAYMENT_LINK",
        sampleSize: 412,
        attempts: 412,
        recoveries: 345,
        recoveryRate: 0.837,
        averageRecoveryTime: 300,
        averageIncentiveCost: 0,
        grossRecovered: 18400000,
        netRecovered: 18400000,
        confidence: "HIGH",
        memoryVersion: 1
      },
      {
        storeId,
        segmentType: "PAYMENT_METHOD",
        segmentKey: "WALLET",
        intervention: "PAYMENT_LINK_WITH_VOUCHER",
        sampleSize: 156,
        attempts: 156,
        recoveries: 112,
        recoveryRate: 0.718,
        averageRecoveryTime: 540,
        averageIncentiveCost: 45000,
        grossRecovered: 32000000,
        netRecovered: 27500000,
        confidence: "HIGH",
        memoryVersion: 1
      }
    ]
  });

  // 3. RECOVERY EXPERIMENTS
  const exp = await prisma.recoveryExperiment.create({
    data: {
      storeId,
      name: "Dynamic Voucher vs Standard Link on Netbanking Failures",
      description: "Evaluating if offering a dynamic 5% voucher yields higher net revenue than a standard link for Netbanking failures.",
      hypothesis: "The 5% voucher will improve conversion by at least 15%.",
      status: "RUNNING",
      experimentType: "A_B_TEST",
      controlStrategy: "PAYMENT_LINK",
      variantStrategy: "PAYMENT_LINK_WITH_VOUCHER",
      eligibilityRules: JSON.stringify({ minAmount: 500000 }),
      sampleTarget: 200,
      successMetric: "NET_RECOVERED_REVENUE",
      budgetLimit: 5000000,
      currentSpend: 320000,
      startAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.recoveryExperimentArm.createMany({
    data: [
      {
        experimentId: exp.id,
        name: "Control: Payment Link",
        strategy: "PAYMENT_LINK",
        allocationPercentage: 50,
        eligibleCount: 92,
        attemptCount: 92,
        recoveryCount: 45,
        grossRecovered: 9500000,
        incentiveCost: 0,
        netRecovered: 9500000,
        averageRecoveryTime: 420
      },
      {
        experimentId: exp.id,
        name: "Variant: Payment Link + Voucher",
        strategy: "PAYMENT_LINK_WITH_VOUCHER",
        allocationPercentage: 50,
        eligibleCount: 95,
        attemptCount: 95,
        recoveryCount: 71,
        grossRecovered: 14200000,
        incentiveCost: 710000,
        netRecovered: 13490000,
        averageRecoveryTime: 290
      }
    ]
  });

  // 4. GENERATE GRAPH TREND DATA (Last 7 Days)
  const now = new Date();
  
  // Create a dummy customer and order to attach cases to
  const cust = await prisma.customer.create({
    data: { storeId, name: "Graph User", email: "graph@example.com", phone: "+919876543210" }
  });
  
  // Generate a smooth curve for the last 7 days
  for (let i = 7; i >= 0; i--) {
    const ord = await prisma.order.create({
      data: { storeId, customerId: cust.id, razorpayOrderId: `order_graph_${i}_${Date.now()}`, status: "FAILED", subtotal: 100000, total: 100000, currency: "INR" }
    });
    
    const caseDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000 + (Math.random() * 4 * 60 * 60 * 1000));
    const recoveryDate = new Date(caseDate.getTime() + 45 * 60 * 1000); // recovered 45 mins later

    // Risk amounts going up and down slightly (randomized trend)
    const riskAmt = 1500000 + (Math.random() * 800000);
    const recoveredRatio = 0.6 + (Math.random() * 0.25); // 60-85% recovery rate
    const grossAmt = riskAmt * recoveredRatio;
    const netAmt = grossAmt * 0.95; // 5% incentive cost

    const rc = await prisma.recoveryCase.create({
      data: {
        storeId,
        customerId: cust.id,
        orderId: ord.id,
        riskAmount: Math.round(riskAmt),
        riskReason: "PAYMENT_FAILED",
        riskType: "NETBANKING_TIMEOUT",
        recoveryProbability: 0.8,
        opportunityScore: 80,
        status: "RECOVERED",
        createdAt: caseDate,
        resolvedAt: recoveryDate
      }
    });

    await prisma.recoveryOutcome.create({
      data: {
        recoveryCaseId: rc.id,
        result: "RECOVERED",
        grossRecovered: Math.round(grossAmt),
        incentiveCost: Math.round(grossAmt - netAmt),
        netRecovered: Math.round(netAmt),
        timeToRecovery: 45 * 60,
        recordedAt: recoveryDate,
        createdAt: recoveryDate
      }
    });
  }

  console.log("Trend Data and Netbanking/Wallet Leaks populated successfully!");
}

fixDemo()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
