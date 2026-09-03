import { prisma } from "./db";

export const RecoveryStopService = {
  async shouldStop(recoveryCaseId: string): Promise<{ stop: boolean; reason?: string }> {
    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: recoveryCaseId },
      include: {
        order: true,
        approvalRequests: { orderBy: { createdAt: "desc" }, take: 1 },
        store: { include: { merchant: { include: { recoveryPolicy: true } } } }
      }
    });

    if (!recCase) return { stop: true, reason: "CASE_NOT_FOUND" };

    if (recCase.status === "STOPPED" || recCase.status === "EXPIRED" || recCase.status === "FAILED" || recCase.status === "RECOVERED") {
      return { stop: true, reason: `CASE_STATUS_${recCase.status}` };
    }

    if (recCase.order.status === "PAID") {
      return { stop: true, reason: "ORDER_PAID" };
    }
    if (recCase.order.status === "CANCELLED" || recCase.order.status === "REFUNDED") {
      return { stop: true, reason: "ORDER_CANCELLED_OR_REFUNDED" };
    }

    const policy = recCase.store.merchant.recoveryPolicy;
    if (policy) {
      const hoursSinceDetection = (Date.now() - recCase.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceDetection > policy.recoveryWindowHours) {
        return { stop: true, reason: "RECOVERY_WINDOW_EXPIRED" };
      }
    }

    const latestApproval = recCase.approvalRequests[0];
    if (latestApproval && latestApproval.status === "REJECTED") {
      return { stop: true, reason: "APPROVAL_REJECTED" };
    }

    return { stop: false };
  }
};

export const RecoveryPlanService = {
  async createPlan(recoveryCaseId: string) {
    const stopCheck = await RecoveryStopService.shouldStop(recoveryCaseId);
    if (stopCheck.stop) {
      throw new Error(`Cannot create plan. Reason: ${stopCheck.reason}`);
    }

    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: recoveryCaseId },
      include: {
        aiDecisions: { include: { recoveryOptions: true }, orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    if (!recCase) throw new Error("Case not found");

    const decision = recCase.aiDecisions[0];
    const option = decision?.recoveryOptions.find(o => o.selected);
    
    if (!option || option.actionType === "NO_ACTION") {
      await prisma.recoveryCase.update({
        where: { id: recoveryCaseId },
        data: { status: "STOPPED" }
      });
      return null;
    }

    const plan = await prisma.recoveryPlan.create({
      data: {
        recoveryCaseId,
        status: "READY"
      }
    });

    let stepNumber = 1;

    // Default adaptive plan shape based on actionType
    if (option.actionType.includes("PAYMENT_LINK")) {
      await prisma.recoveryPlanStep.create({
        data: {
          recoveryPlanId: plan.id,
          stepNumber: stepNumber++,
          actionType: "PAYMENT_LINK",
          metadata: JSON.stringify({ generateLink: true })
        }
      });
      
      await prisma.recoveryPlanStep.create({
        data: {
          recoveryPlanId: plan.id,
          stepNumber: stepNumber++,
          actionType: "WAIT",
          delaySeconds: 10, // Wait 10 seconds (conceptually)
          scheduledAt: new Date(Date.now() + 10 * 1000)
        }
      });

      await prisma.recoveryPlanStep.create({
        data: {
          recoveryPlanId: plan.id,
          stepNumber: stepNumber++,
          actionType: "MESSAGE",
          metadata: JSON.stringify({ useVoucher: option.actionType.includes("VOUCHER") })
        }
      });
    }

    await prisma.recoveryCase.update({
      where: { id: recoveryCaseId },
      data: { status: "RECOVERING" }
    });

    await prisma.auditEvent.create({
      data: { recoveryCaseId, actor: "SYSTEM", action: "PLAN_CREATED", metadata: JSON.stringify({ planId: plan.id }) }
    });

    return plan;
  }
};
