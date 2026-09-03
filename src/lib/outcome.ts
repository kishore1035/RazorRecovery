import { prisma } from "./db";
import { RecoveryExecutionService } from "./execution";
import { MemoryService } from "./memory";
import { NtfyService } from "./ntfy";

export const RecoveryOutcomeService = {
  async evaluateOutcome(orderId: string, paymentId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        recoveryCases: {
          where: { status: { notIn: ["RECOVERED", "STOPPED", "FAILED", "EXPIRED"] } },
          orderBy: { createdAt: "desc" }
        },
        payments: true,
        voucherRedemptions: true
      }
    });

    if (!order || order.recoveryCases.length === 0) return null;

    const payment = order.payments.find(p => p.id === paymentId || p.razorpayPaymentId === paymentId);
    if (!payment || payment.status !== "CAPTURED") return null;

    // Pick the most recent active recovery case
    const recCaseRaw = order.recoveryCases[0];
    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: recCaseRaw.id },
      include: {
        experimentAssignment: true,
        aiDecisions: { take: 1, orderBy: { createdAt: "desc" } },
        customer: true
      }
    });
    
    if (!recCase) return null;

    // Calculate time to recovery (in seconds)
    const timeToRecovery = Math.floor((payment.createdAt.getTime() - recCase.createdAt.getTime()) / 1000);

    // Incentive Cost: Determine if any voucher was applied to this order during recovery
    const redemptions = order.voucherRedemptions.filter(r => r.recoveryCaseId === recCase.id);
    const incentiveCost = redemptions.reduce((sum, r) => sum + r.discountAmount, 0);

    // Gross Recovered is exactly what was captured
    const grossRecovered = payment.amount;

    // Net Recovered
    const netRecovered = Math.max(0, grossRecovered - incentiveCost);

    // Determine Result
    // If captured amount + discount >= original risk amount -> FULLY RECOVERED
    const isFullRecovery = (grossRecovered + incentiveCost) >= recCase.riskAmount;
    const result = isFullRecovery ? "RECOVERED" : "PARTIALLY_RECOVERED";

    // Stop execution of remaining plan steps
    const plans = await prisma.recoveryPlan.findMany({ where: { recoveryCaseId: recCase.id, status: { notIn: ["COMPLETED", "STOPPED"] } } });
    for (const plan of plans) {
      await RecoveryExecutionService.stopPlan(plan.id, "PAYMENT_COMPLETED");
    }

    // Persist Outcome
    const outcome = await prisma.recoveryOutcome.upsert({
      where: { recoveryCaseId: recCase.id },
      update: {
        result,
        grossRecovered,
        incentiveCost,
        netRecovered,
        timeToRecovery,
        paymentId
      },
      create: {
        recoveryCaseId: recCase.id,
        result,
        grossRecovered,
        incentiveCost,
        netRecovered,
        timeToRecovery,
        paymentId
      }
    });

    // Mark Case
    await prisma.recoveryCase.update({
      where: { id: recCase.id },
      data: { status: result }
    });

    await prisma.auditEvent.create({
      data: {
        recoveryCaseId: recCase.id,
        actor: "SYSTEM",
        action: "RECOVERY_OUTCOME_CALCULATED",
        metadata: JSON.stringify({ outcomeId: outcome.id, netRecovered })
      }
    });

    // Real mobile push — merchant sees the recovered payment (like Razorpay success notification)
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
    NtfyService.paymentRecovered({
      customerName: recCase.customer?.name || "Customer",
      grossAmount: grossRecovered,
      netAmount: netRecovered,
      incentiveCost,
      caseId: recCase.id,
      appBaseUrl
    }).catch(console.error);

    const aiDecision = recCase.aiDecisions[0];
    const intervention = recCase.experimentAssignment?.strategy || aiDecision?.recommendedAction || "UNKNOWN";

    // Learning Event
    const learningEvent = await prisma.recoveryLearningEvent.create({
      data: {
        recoveryCaseId: recCase.id,
        storeId: order.storeId,
        paymentMethod: payment.method,
        customerSegment: "RETURNING_CUSTOMER", // Derived representation
        intervention,
        usedIncentive: incentiveCost > 0,
        incentiveCost,
        grossRecovered,
        netRecovered,
        recoveryTime: timeToRecovery,
        outcome: result,
        sourceType: recCase.experimentAssignmentId ? "EXPERIMENT" : "NORMAL",
        sourceExperimentId: recCase.experimentAssignment?.experimentId
      }
    });

    // Update experiment arm statistics if it was part of an experiment
    if (recCase.experimentAssignmentId) {
      await prisma.recoveryExperimentArm.update({
        where: { id: recCase.experimentAssignmentId },
        data: {
          recoveryCount: { increment: 1 },
          grossRecovered: { increment: grossRecovered },
          incentiveCost: { increment: incentiveCost },
          netRecovered: { increment: netRecovered }
        }
      });
      // Also increment budget on experiment
      if (recCase.experimentAssignment) {
        await prisma.recoveryExperiment.update({
          where: { id: recCase.experimentAssignment.experimentId },
          data: {
            currentSpend: { increment: incentiveCost }
          }
        });
      }
    }

    // Fire memory aggregation asynchronously
    setTimeout(async () => {
      try {
        await MemoryService.updateRecoveryMemory(learningEvent.id);
      } catch (err) {
        console.error("Failed to update memory", err);
      }
    }, 0);

    return outcome;
  }
};
