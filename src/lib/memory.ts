import { prisma } from "./db";

export const MemoryService = {
  calculateConfidence(attempts: number): string {
    if (attempts < 5) return "LOW";
    if (attempts < 20) return "MEDIUM";
    return "HIGH";
  },

  async updateRecoveryMemory(learningEventId: string) {
    const event = await prisma.recoveryLearningEvent.findUnique({ where: { id: learningEventId } });
    if (!event) return;

    const storeId = event.storeId;
    const intervention = event.intervention || "UNKNOWN";
    const isSuccess = event.outcome === "RECOVERED" || event.outcome === "PARTIALLY_RECOVERED";

    // 1. Segment by Payment Method
    if (event.paymentMethod) {
      await this.upsertMemorySegment(storeId, "PAYMENT_METHOD", event.paymentMethod, intervention, isSuccess, event);
    }

    // 2. Segment by Customer Segment
    if (event.customerSegment) {
      await this.upsertMemorySegment(storeId, "CUSTOMER_SEGMENT", event.customerSegment, intervention, isSuccess, event);
    }

    // 3. Segment by Product
    if (event.productId) {
      await this.upsertMemorySegment(storeId, "PRODUCT", event.productId, intervention, isSuccess, event);
    }
  },

  async upsertMemorySegment(
    storeId: string,
    segmentType: string,
    segmentKey: string,
    intervention: string,
    isSuccess: boolean,
    event: any
  ) {
    const existing = await prisma.recoveryMemory.findUnique({
      where: {
        storeId_segmentType_segmentKey_intervention_memoryVersion: {
          storeId,
          segmentType,
          segmentKey,
          intervention,
          memoryVersion: 1
        }
      }
    });

    const newAttempts = (existing?.attempts || 0) + 1;
    const newRecoveries = (existing?.recoveries || 0) + (isSuccess ? 1 : 0);
    const newRecoveryRate = newRecoveries / newAttempts;
    
    let newAvgRecoveryTime = existing?.averageRecoveryTime || null;
    if (isSuccess && event.recoveryTime) {
      if (newAvgRecoveryTime) {
        newAvgRecoveryTime = Math.floor(((newAvgRecoveryTime * (newRecoveries - 1)) + event.recoveryTime) / newRecoveries);
      } else {
        newAvgRecoveryTime = event.recoveryTime;
      }
    }

    const newAvgIncentive = Math.floor((((existing?.averageIncentiveCost || 0) * (newAttempts - 1)) + event.incentiveCost) / newAttempts);
    const newGross = (existing?.grossRecovered || 0) + event.grossRecovered;
    const newNet = (existing?.netRecovered || 0) + event.netRecovered;
    const confidence = this.calculateConfidence(newAttempts);

    await prisma.recoveryMemory.upsert({
      where: {
        storeId_segmentType_segmentKey_intervention_memoryVersion: {
          storeId,
          segmentType,
          segmentKey,
          intervention,
          memoryVersion: 1
        }
      },
      update: {
        sampleSize: newAttempts,
        attempts: newAttempts,
        recoveries: newRecoveries,
        recoveryRate: newRecoveryRate,
        averageRecoveryTime: newAvgRecoveryTime,
        averageIncentiveCost: newAvgIncentive,
        grossRecovered: newGross,
        netRecovered: newNet,
        confidence,
        lastUpdated: new Date()
      },
      create: {
        storeId,
        segmentType,
        segmentKey,
        intervention,
        sampleSize: newAttempts,
        attempts: newAttempts,
        recoveries: newRecoveries,
        recoveryRate: newRecoveryRate,
        averageRecoveryTime: newAvgRecoveryTime,
        averageIncentiveCost: newAvgIncentive,
        grossRecovered: newGross,
        netRecovered: newNet,
        confidence,
        memoryVersion: 1
      }
    });
  },

  async getRelevantMemory(storeId: string, context: { paymentMethod?: string; productId?: string; customerSegment?: string }) {
    const conditions = [];
    if (context.paymentMethod) conditions.push({ segmentType: "PAYMENT_METHOD", segmentKey: context.paymentMethod });
    if (context.productId) conditions.push({ segmentType: "PRODUCT", segmentKey: context.productId });
    if (context.customerSegment) conditions.push({ segmentType: "CUSTOMER_SEGMENT", segmentKey: context.customerSegment });

    if (conditions.length === 0) return [];

    const memories = await prisma.recoveryMemory.findMany({
      where: {
        storeId,
        OR: conditions,
        memoryVersion: 1
      },
      orderBy: { sampleSize: "desc" }
    });

    return memories;
  }
};
