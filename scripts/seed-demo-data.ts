import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedDemoData() {
  console.log("Seeding rich demo data for RazorRecovery OS...");

  const store = await prisma.store.findFirst({
    include: { merchant: true }
  });

  if (!store) {
    throw new Error("Store not found. Please run base seed first.");
  }

  const storeId = store.id;
  const merchantId = store.merchantId;

  // Clean up dynamic data
  await prisma.notification.deleteMany();
  await prisma.recoveryOutcome.deleteMany();
  await prisma.recoveryAction.deleteMany();
  await prisma.recoveryPlanStep.deleteMany();
  await prisma.recoveryPlan.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.policyEvaluation.deleteMany();
  await prisma.recoveryOption.deleteMany();
  await prisma.aIDecision.deleteMany();
  await prisma.recoveryCase.deleteMany();
  await prisma.recoveryExperimentArm.deleteMany();
  await prisma.recoveryExperiment.deleteMany();
  await prisma.recoveryMemory.deleteMany();
  await prisma.revenueLeak.deleteMany();
  await prisma.merchantRecoveryPreference.deleteMany();
  await prisma.voucherRedemption.deleteMany();
  await prisma.voucher.deleteMany();

  // 1. Vouchers
  const voucher1 = await prisma.voucher.create({
    data: {
      storeId,
      code: "RECOVER10",
      discountType: "PERCENTAGE",
      discountValue: 10,
      maximumDiscount: 50000, // ₹500
      minimumOrderValue: 100000, // ₹1000
      status: "ACTIVE"
    }
  });

  const voucher2 = await prisma.voucher.create({
    data: {
      storeId,
      code: "WELCOMEBACK",
      discountType: "FIXED",
      discountValue: 20000, // ₹200
      minimumOrderValue: 150000, // ₹1500
      status: "ACTIVE"
    }
  });

  // 2. Merchant Preferences (Teach RazorRecovery)
  await prisma.merchantRecoveryPreference.create({
    data: {
      merchantId,
      scope: "CUSTOMER_SEGMENT",
      condition: "RETURNING_CUSTOMER",
      preferredStrategy: "PAYMENT_LINK",
      disallowedStrategy: "PAYMENT_LINK_WITH_VOUCHER",
      reason: "Returning customers have high loyalty and high organic conversion without margin loss.",
      enabled: true
    }
  });

  await prisma.merchantRecoveryPreference.create({
    data: {
      merchantId,
      scope: "PRODUCT_CATEGORY",
      condition: "LUXURY_ELECTRONICS",
      preferredStrategy: "PAYMENT_LINK",
      disallowedStrategy: "NO_ACTION",
      reason: "High gross margin products must always be retargeted within 30 minutes.",
      enabled: true
    }
  });

  // 3. Revenue Leaks
  await prisma.revenueLeak.create({
    data: {
      storeId,
      type: "PAYMENT_METHOD_DEGRADATION",
      severity: "HIGH",
      status: "ACTIVE",
      title: "UPI payment success dropped 18 percentage points",
      description: "UPI authorization success rate fell from 82.5% 30-day baseline to 64.5% in the last 24 hours. Bank servers for major UPI apps reporting intermittent timeouts.",
      affectedRevenue: 1850000, // ₹18,500
      estimatedRecoverableRevenue: 462500, // ₹4,625
      affectedTransactions: 14,
      confidence: "HIGH",
      evidence: JSON.stringify({ baseline: 0.825, current: 0.645, drop: 0.18 }),
      recommendedAction: "Activate instant Payment Link fallback with Netbanking & Card alternatives"
    }
  });

  await prisma.revenueLeak.create({
    data: {
      storeId,
      type: "CHECKOUT_ABANDONMENT_SPIKE",
      severity: "MEDIUM",
      status: "ACTIVE",
      title: "Cart abandonment spike on high-value footwear",
      description: "Abandonment on cart values exceeding ₹15,000 increased by 22% following checkout shipping address entry.",
      affectedRevenue: 1260000, // ₹12,600
      estimatedRecoverableRevenue: 378000, // ₹3,780
      affectedTransactions: 6,
      confidence: "MEDIUM",
      evidence: JSON.stringify({ category: "Footwear", abandonmentRate: 0.48 }),
      recommendedAction: "Enable Recovery Autopilot with targeted WhatsApp reminders"
    }
  });

  // 4. Recovery Memory
  const memories = [
    {
      segmentType: "PAYMENT_METHOD",
      segmentKey: "UPI",
      intervention: "PAYMENT_LINK",
      sampleSize: 142,
      attempts: 142,
      recoveries: 108,
      recoveryRate: 0.761,
      averageRecoveryTime: 420,
      averageIncentiveCost: 0,
      grossRecovered: 22680000,
      netRecovered: 22680000,
      confidence: "HIGH"
    },
    {
      segmentType: "CUSTOMER",
      segmentKey: "RETURNING_CUSTOMER",
      intervention: "PAYMENT_LINK",
      sampleSize: 89,
      attempts: 89,
      recoveries: 74,
      recoveryRate: 0.831,
      averageRecoveryTime: 360,
      averageIncentiveCost: 0,
      grossRecovered: 15540000,
      netRecovered: 15540000,
      confidence: "HIGH"
    },
    {
      segmentType: "CUSTOMER",
      segmentKey: "FIRST_TIME_CUSTOMER",
      intervention: "PAYMENT_LINK_WITH_VOUCHER",
      sampleSize: 65,
      attempts: 65,
      recoveries: 48,
      recoveryRate: 0.738,
      averageRecoveryTime: 540,
      averageIncentiveCost: 25000,
      grossRecovered: 12000000,
      netRecovered: 10800000,
      confidence: "MEDIUM"
    },
    {
      segmentType: "PRODUCT_CATEGORY",
      segmentKey: "FOOTWEAR",
      intervention: "PAYMENT_LINK",
      sampleSize: 112,
      attempts: 112,
      recoveries: 82,
      recoveryRate: 0.732,
      averageRecoveryTime: 480,
      averageIncentiveCost: 0,
      grossRecovered: 17220000,
      netRecovered: 17220000,
      confidence: "HIGH"
    }
  ];

  for (const m of memories) {
    await prisma.recoveryMemory.create({
      data: {
        storeId,
        segmentType: m.segmentType,
        segmentKey: m.segmentKey,
        intervention: m.intervention,
        sampleSize: m.sampleSize,
        attempts: m.attempts,
        recoveries: m.recoveries,
        recoveryRate: m.recoveryRate,
        averageRecoveryTime: m.averageRecoveryTime,
        averageIncentiveCost: m.averageIncentiveCost,
        grossRecovered: m.grossRecovered,
        netRecovered: m.netRecovered,
        confidence: m.confidence,
        memoryVersion: 1
      }
    });
  }

  // 5. Recovery Experiment (A/B Test)
  const exp = await prisma.recoveryExperiment.create({
    data: {
      storeId,
      name: "Payment Link vs 10% Voucher on High-Value Failures",
      description: "Testing if providing a 10% voucher increases net recovery on orders above ₹5,000 without cannibalizing margins.",
      hypothesis: "10% voucher improves recovery conversion from 65% to >80%, yielding higher net revenue despite voucher cost.",
      status: "RUNNING",
      experimentType: "A_B_TEST",
      controlStrategy: "PAYMENT_LINK",
      variantStrategy: "PAYMENT_LINK_WITH_VOUCHER",
      eligibilityRules: JSON.stringify({ minAmount: 500000 }),
      sampleTarget: 100,
      successMetric: "NET_RECOVERED_REVENUE",
      budgetLimit: 5000000, // ₹50,000 max incentive spend
      currentSpend: 185000, // ₹1,850 spent so far
      startAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.recoveryExperimentArm.create({
    data: {
      experimentId: exp.id,
      name: "Control: Standard Payment Link",
      strategy: "PAYMENT_LINK",
      allocationPercentage: 50,
      eligibleCount: 38,
      attemptCount: 38,
      recoveryCount: 26,
      grossRecovered: 5460000, // ₹54,600
      incentiveCost: 0,
      netRecovered: 5460000,
      averageRecoveryTime: 420
    }
  });

  await prisma.recoveryExperimentArm.create({
    data: {
      experimentId: exp.id,
      name: "Variant: Payment Link + 10% Voucher",
      strategy: "PAYMENT_LINK_WITH_VOUCHER",
      allocationPercentage: 50,
      eligibleCount: 40,
      attemptCount: 40,
      recoveryCount: 33,
      grossRecovered: 6930000, // ₹69,300
      incentiveCost: 693000,  // ₹6,930
      netRecovered: 6237000,  // ₹62,370
      averageRecoveryTime: 290
    }
  });

  // 6. GOLDEN CASE 1: Rahul Sharma (Nike Air Max 270) - RECOVERED
  let rahul = await prisma.customer.findFirst({ where: { email: "rahul@example.com" } });
  if (!rahul) {
    rahul = await prisma.customer.create({
      data: {
        storeId,
        name: "Rahul Sharma",
        email: "rahul@example.com",
        phone: "+919876543210"
      }
    });
  }

  let nike = await prisma.product.findFirst({ where: { sku: "NIKE-270" } });
  if (!nike) {
    nike = await prisma.product.create({
      data: {
        storeId,
        name: "Nike Air Max 270",
        sku: "NIKE-270",
        price: 2100000, // ₹21,000
        currency: "INR",
        category: "Footwear",
        inventoryStatus: "IN_STOCK"
      }
    });
  }

  const rahulOrder = await prisma.order.create({
    data: {
      storeId,
      customerId: rahul.id,
      razorpayOrderId: `order_demo_${Date.now()}_1`,
      status: "PAID",
      subtotal: 2100000,
      total: 2100000,
      currency: "INR"
    }
  });

  await prisma.orderItem.create({
    data: {
      orderId: rahulOrder.id,
      productId: nike.id,
      productNameSnapshot: nike.name,
      quantity: 1,
      unitPrice: nike.price
    }
  });

  const rahulFailedPayment = await prisma.payment.create({
    data: {
      orderId: rahulOrder.id,
      razorpayPaymentId: "pay_failed_rahul_upi",
      amount: 2100000,
      currency: "INR",
      method: "UPI",
      status: "FAILED",
      failureCode: "GATEWAY_TIMEOUT",
      failureReason: "UPI bank server timeout during pin authorization",
      attemptNumber: 1
    }
  });

  const rahulSession = await prisma.checkoutSession.create({
    data: {
      storeId,
      customerId: rahul.id,
      orderId: rahulOrder.id,
      status: "COMPLETED"
    }
  });

  await prisma.checkoutEvent.createMany({
    data: [
      { checkoutSessionId: rahulSession.id, eventType: "CHECKOUT_STARTED" },
      { checkoutSessionId: rahulSession.id, eventType: "DETAILS_COMPLETED" },
      { checkoutSessionId: rahulSession.id, eventType: "PAYMENT_METHOD_SELECTED", metadata: JSON.stringify({ method: "UPI" }) },
      { checkoutSessionId: rahulSession.id, eventType: "PAYMENT_FAILED", metadata: JSON.stringify({ reason: "GATEWAY_TIMEOUT" }) },
      { checkoutSessionId: rahulSession.id, eventType: "PAYMENT_COMPLETED" }
    ]
  });

  const goldenCase = await prisma.recoveryCase.create({
    data: {
      storeId,
      customerId: rahul.id,
      orderId: rahulOrder.id,
      checkoutSessionId: rahulSession.id,
      riskAmount: 2100000,
      riskReason: "PAYMENT_FAILED",
      riskType: "TEMPORARY_UPI_FAILURE",
      recoveryProbability: 0.85,
      opportunityScore: 85,
      status: "RECOVERED",
      createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
      resolvedAt: new Date(Date.now() - 37 * 60 * 1000)  // 37 min ago (8 min recovery)
    }
  });

  const goldenDecision = await prisma.aIDecision.create({
    data: {
      recoveryCaseId: goldenCase.id,
      diagnosis: "Temporary UPI Gateway timeout. Customer demonstrates high intent with 3 previous purchases.",
      confidence: 0.94,
      recoveryProbability: 0.85,
      recommendedAction: "PAYMENT_LINK",
      reason: "Returning customer with high lifetime value and transient UPI failure. A direct Razorpay payment link achieves maximum Net Recovery without giving away margin on unnecessary discounts.",
      modelVersion: "gemma4:31b-cloud",
      createdAt: new Date(Date.now() - 44 * 60 * 1000)
    }
  });

  await prisma.recoveryOption.createMany({
    data: [
      {
        aiDecisionId: goldenDecision.id,
        actionType: "PAYMENT_LINK",
        predictedProbability: 0.85,
        predictedGrossRecovery: 2100000,
        predictedIncentiveCost: 0,
        predictedNetRecovery: 2100000,
        selected: true,
        reason: "Highest expected net revenue (₹21,000.00). No incentive needed."
      },
      {
        aiDecisionId: goldenDecision.id,
        actionType: "PAYMENT_LINK_WITH_VOUCHER",
        predictedProbability: 0.88,
        predictedGrossRecovery: 2100000,
        predictedIncentiveCost: 210000, // ₹2,100 discount
        predictedNetRecovery: 1890000,
        selected: false,
        reason: "Lower net revenue (₹18,900.00). Marginal +3% recovery does not justify ₹2,100 margin sacrifice."
      },
      {
        aiDecisionId: goldenDecision.id,
        actionType: "NO_ACTION",
        predictedProbability: 0.05,
        predictedGrossRecovery: 0,
        predictedIncentiveCost: 0,
        predictedNetRecovery: 0,
        selected: false,
        reason: "Zero recovery expected without proactive outreach."
      }
    ]
  });

  await prisma.policyEvaluation.create({
    data: {
      recoveryCaseId: goldenCase.id,
      decisionId: goldenDecision.id,
      allowed: true,
      approvalRequired: false,
      reason: "Recovery amount ₹21,000 complies with automated recovery policy (Limit ₹100,000). Zero discount complies with 10% maximum discount rule.",
      violatedRules: "[]",
      evaluatedAt: new Date(Date.now() - 44 * 60 * 1000)
    }
  });

  const goldenPlan = await prisma.recoveryPlan.create({
    data: {
      recoveryCaseId: goldenCase.id,
      status: "COMPLETED",
      createdAt: new Date(Date.now() - 44 * 60 * 1000),
      startedAt: new Date(Date.now() - 44 * 60 * 1000),
      completedAt: new Date(Date.now() - 37 * 60 * 1000)
    }
  });

  const step1 = await prisma.recoveryPlanStep.create({
    data: {
      recoveryPlanId: goldenPlan.id,
      stepNumber: 1,
      actionType: "PAYMENT_LINK",
      status: "COMPLETED",
      scheduledAt: new Date(Date.now() - 44 * 60 * 1000),
      executedAt: new Date(Date.now() - 44 * 60 * 1000),
      completedAt: new Date(Date.now() - 44 * 60 * 1000),
      metadata: JSON.stringify({ shortUrl: "https://rzp.io/i/demo270" })
    }
  });

  await prisma.recoveryAction.create({
    data: {
      recoveryCaseId: goldenCase.id,
      planStepId: step1.id,
      type: "PAYMENT_LINK",
      status: "COMPLETED",
      provider: "RAZORPAY",
      providerReference: "plink_demo_rahul_nike",
      executedAt: new Date(Date.now() - 44 * 60 * 1000),
      completedAt: new Date(Date.now() - 44 * 60 * 1000),
      metadata: JSON.stringify({ shortUrl: "https://rzp.io/i/demo270" })
    }
  });

  const step2 = await prisma.recoveryPlanStep.create({
    data: {
      recoveryPlanId: goldenPlan.id,
      stepNumber: 2,
      actionType: "MESSAGE",
      status: "COMPLETED",
      scheduledAt: new Date(Date.now() - 43 * 60 * 1000),
      executedAt: new Date(Date.now() - 43 * 60 * 1000),
      completedAt: new Date(Date.now() - 43 * 60 * 1000),
      metadata: JSON.stringify({ channel: "SMS" })
    }
  });

  await prisma.notification.create({
    data: {
      recoveryCaseId: goldenCase.id,
      customerId: rahul.id,
      channel: "SMS",
      message: "Hey Rahul, your UPI payment for Nike Air Max 270 timed out. Complete your order here: https://rzp.io/i/demo270",
      status: "SENT",
      provider: "SIMULATION",
      deliveryStatus: "DELIVERED",
      sentAt: new Date(Date.now() - 43 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 43 * 60 * 1000)
    }
  });

  await prisma.payment.create({
    data: {
      orderId: rahulOrder.id,
      razorpayPaymentId: "pay_captured_rahul_link",
      amount: 2100000,
      currency: "INR",
      method: "UPI",
      status: "CAPTURED",
      attemptNumber: 2,
      createdAt: new Date(Date.now() - 37 * 60 * 1000)
    }
  });

  await prisma.recoveryOutcome.create({
    data: {
      recoveryCaseId: goldenCase.id,
      result: "RECOVERED",
      grossRecovered: 2100000,
      incentiveCost: 0,
      netRecovered: 2100000,
      timeToRecovery: 480, // 8 minutes
      paymentId: "pay_captured_rahul_link",
      recordedAt: new Date(Date.now() - 37 * 60 * 1000)
    }
  });

  // 7. GOLDEN CASE 2: Ananya Verma (Sony Headphones) - ACTION_READY (Active to show live triage)
  const ananya = await prisma.customer.create({
    data: {
      storeId,
      name: "Ananya Verma",
      email: "ananya.v@example.com",
      phone: "+919811223344"
    }
  });

  const sonyProduct = await prisma.product.create({
    data: {
      storeId,
      name: "Sony WH-1000XM5 Headphones",
      sku: "SONY-XM5",
      price: 2999000, // ₹29,990
      currency: "INR",
      category: "Electronics",
      inventoryStatus: "IN_STOCK"
    }
  });

  const ananyaOrder = await prisma.order.create({
    data: {
      storeId,
      customerId: ananya.id,
      razorpayOrderId: `order_demo_${Date.now()}_2`,
      status: "PAYMENT_PENDING",
      subtotal: 2999000,
      total: 2999000,
      currency: "INR"
    }
  });

  await prisma.orderItem.create({
    data: {
      orderId: ananyaOrder.id,
      productId: sonyProduct.id,
      productNameSnapshot: sonyProduct.name,
      quantity: 1,
      unitPrice: sonyProduct.price
    }
  });

  await prisma.payment.create({
    data: {
      orderId: ananyaOrder.id,
      razorpayPaymentId: "pay_failed_ananya_card",
      amount: 2999000,
      currency: "INR",
      method: "CARD",
      status: "FAILED",
      failureCode: "INSUFFICIENT_FUNDS",
      failureReason: "Card declined by issuing bank",
      attemptNumber: 1
    }
  });

  const ananyaCase = await prisma.recoveryCase.create({
    data: {
      storeId,
      customerId: ananya.id,
      orderId: ananyaOrder.id,
      riskAmount: 2999000,
      riskReason: "PAYMENT_FAILED",
      riskType: "INSUFFICIENT_FUNDS",
      recoveryProbability: 0.72,
      opportunityScore: 78,
      status: "ACTION_READY"
    }
  });

  const ananyaDecision = await prisma.aIDecision.create({
    data: {
      recoveryCaseId: ananyaCase.id,
      diagnosis: "Credit card declined for high-value cart. First-time visitor comparing prices.",
      confidence: 0.88,
      recoveryProbability: 0.72,
      recommendedAction: "PAYMENT_LINK_WITH_VOUCHER",
      reason: "High order value (₹29,990) for a new customer. Recovery probability increases by 34% with a 10% voucher (RECOVER10), netting ₹24,000+ compared to no recovery.",
      modelVersion: "gemma4:31b-cloud"
    }
  });

  await prisma.recoveryOption.createMany({
    data: [
      {
        aiDecisionId: ananyaDecision.id,
        actionType: "PAYMENT_LINK_WITH_VOUCHER",
        predictedProbability: 0.72,
        predictedGrossRecovery: 2999000,
        predictedIncentiveCost: 299900,
        predictedNetRecovery: 2699100,
        selected: true,
        reason: "Highest expected recovery for first-time premium electronics buyer."
      },
      {
        aiDecisionId: ananyaDecision.id,
        actionType: "PAYMENT_LINK",
        predictedProbability: 0.38,
        predictedGrossRecovery: 2999000,
        predictedIncentiveCost: 0,
        predictedNetRecovery: 2999000,
        selected: false,
        reason: "Low probability without incentive (38% vs 72%). Expected value is lower."
      }
    ]
  });

  await prisma.policyEvaluation.create({
    data: {
      recoveryCaseId: ananyaCase.id,
      decisionId: ananyaDecision.id,
      allowed: true,
      approvalRequired: false,
      reason: "10% voucher within policy limit (max 10%). Autonomous execution approved.",
      violatedRules: "[]"
    }
  });

  console.log("✅ Demo environment successfully seeded with Golden Cases, Leaks, Memory, and Experiments!");
}

seedDemoData()
  .catch((e) => {
    console.error("Error seeding demo data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
