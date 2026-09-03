import { prisma } from "./db";

export const ExperimentAssignmentService = {
  async assignCaseIfEligible(recoveryCaseId: string) {
    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: recoveryCaseId },
      include: { order: { include: { payments: true } } }
    });
    
    if (!recCase) return null;

    // Find active experiments for the store
    const experiments = await prisma.recoveryExperiment.findMany({
      where: { storeId: recCase.storeId, status: "RUNNING" },
      include: { arms: true }
    });

    if (experiments.length === 0) return null;

    // Pick the first running experiment for deterministic assignment
    const experiment = experiments[0];
    
    // Deterministic Assignment using case ID parity (simplified for demo)
    const isVariant = (recCase.id.charCodeAt(recCase.id.length - 1) % 2 === 0);
    const assignedArm = isVariant ? experiment.arms.find(a => a.name === "VARIANT") : experiment.arms.find(a => a.name === "CONTROL");

    if (!assignedArm) return null;

    // Budget constraint check for incentives
    if (experiment.budgetLimit && experiment.currentSpend >= experiment.budgetLimit && assignedArm.strategy.includes("VOUCHER")) {
       return null; // Budget exhausted, fall back to default policy/AI
    }

    // Update case with assignment idempotently
    if (!recCase.experimentAssignmentId) {
      await prisma.recoveryCase.update({
        where: { id: recCase.id },
        data: { experimentAssignmentId: assignedArm.id }
      });
      
      await prisma.recoveryExperimentArm.update({
        where: { id: assignedArm.id },
        data: { eligibleCount: { increment: 1 }, attemptCount: { increment: 1 } }
      });
    }

    return assignedArm.strategy;
  }
};
