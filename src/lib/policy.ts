import { prisma } from "./db";

export const PolicyEngine = {
  async evaluate(recoveryCaseId: string, decisionId: string) {
    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: recoveryCaseId },
      include: {
        order: true,
        store: { include: { merchant: { include: { recoveryPolicy: true } } } }
      }
    });

    const decision = await prisma.aIDecision.findUnique({
      where: { id: decisionId },
      include: { recoveryOptions: true }
    });

    if (!recCase || !decision) throw new Error("Case or Decision not found");

    const option = decision.recoveryOptions.find(o => o.selected) || decision.recoveryOptions[0] || {
      predictedIncentiveCost: 0,
      predictedGrossRecovery: recCase.riskAmount,
      actionType: decision.recommendedAction
    };

    // Get policy or default
    const policy = recCase.store.merchant.recoveryPolicy || {
      maximumAutomaticRecoveryAmount: 1000000,
      maximumDiscountPercent: 10,
      maximumDiscountAmount: 50000,
      maximumContacts: 2,
      recoveryWindowHours: 24,
      highValueApprovalRequired: true,
      automaticRecoveryEnabled: true
    };

    let allowed = true;
    let approvalRequired = false;
    let blocked = false;
    const violatedRules: string[] = [];

    // Rule 7, 8: Order paid/refunded/cancelled
    if (["PAID", "CANCELLED", "REFUNDED"].includes(recCase.order.status)) {
      blocked = true;
      violatedRules.push("Order is no longer eligible (Paid/Cancelled/Refunded).");
    }

    // Rule 6: Window expired
    const hoursSinceDetection = (Date.now() - recCase.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceDetection > policy.recoveryWindowHours) {
      blocked = true;
      violatedRules.push(`Recovery window of ${policy.recoveryWindowHours}h has expired.`);
    }

    // Discount checks (Rules 3 & 4)
    if (option.predictedIncentiveCost > policy.maximumDiscountAmount) {
      blocked = true;
      violatedRules.push(`Incentive cost exceeds maximum allowed amount (₹${policy.maximumDiscountAmount / 100}).`);
    }
    const discountPercent = (option.predictedIncentiveCost / recCase.riskAmount) * 100;
    if (discountPercent > policy.maximumDiscountPercent) {
      blocked = true;
      violatedRules.push(`Incentive exceeds maximum allowed percentage (${policy.maximumDiscountPercent}%).`);
    }

    // High value threshold (Rule 2)
    if (recCase.riskAmount > policy.maximumAutomaticRecoveryAmount && policy.highValueApprovalRequired) {
      approvalRequired = true;
      violatedRules.push(`Order amount exceeds automatic recovery threshold (₹${policy.maximumAutomaticRecoveryAmount / 100}).`);
    }

    // Autopilot disabled (Rule 1)
    if (!policy.automaticRecoveryEnabled) {
      approvalRequired = true;
      violatedRules.push("Automatic recovery is disabled by merchant configuration.");
    }

    if (blocked) {
      allowed = false;
      approvalRequired = false;
    } else if (approvalRequired) {
      allowed = false;
    }

    const reason = blocked ? "Recovery blocked by policy constraints." :
                   approvalRequired ? "Recovery requires merchant approval." :
                   "Within merchant recovery limits.";

    const evaluation = await prisma.policyEvaluation.create({
      data: {
        recoveryCaseId: recCase.id,
        decisionId: decision.id,
        allowed,
        approvalRequired,
        reason,
        violatedRules: JSON.stringify(violatedRules)
      }
    });

    if (approvalRequired && !blocked) {
      await prisma.approvalRequest.create({
        data: {
          recoveryCaseId: recCase.id,
          decisionId: decision.id,
          requestedBy: "SYSTEM",
          reason,
          status: "PENDING"
        }
      });
      await prisma.recoveryCase.update({
        where: { id: recCase.id },
        data: { status: "AWAITING_APPROVAL" }
      });
      await prisma.auditEvent.create({
        data: { recoveryCaseId: recCase.id, actor: "SYSTEM", action: "APPROVAL_REQUESTED", metadata: JSON.stringify({ reason }) }
      });
    } else if (!blocked) {
      // It's allowed automatically
      await prisma.recoveryCase.update({
        where: { id: recCase.id },
        data: { status: "ACTION_READY" }
      });
    } else {
      // Blocked
      await prisma.recoveryCase.update({
        where: { id: recCase.id },
        data: { status: "STOPPED" }
      });
      await prisma.auditEvent.create({
        data: { recoveryCaseId: recCase.id, actor: "SYSTEM", action: "RECOVERY_BLOCKED", metadata: JSON.stringify({ reason, violatedRules }) }
      });
    }

    return evaluation;
  }
};
