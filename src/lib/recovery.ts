import { prisma } from "./db";
import { PolicyEngine } from "./policy";
import { RecoveryPlanService } from "./plan";
import { RecoveryExecutionService } from "./execution";
import { MemoryService } from "./memory";
import { ExperimentAssignmentService } from "./experiment";

export const RecoveryEligibilityService = {
  async detectPaymentFailure(orderId: string, paymentId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, payments: true, checkoutSessions: true }
    });

    if (!order) throw new Error("Order not found");
    if (order.status === "PAID" || order.status === "REFUNDED" || order.status === "CANCELLED") {
      return null; // Not eligible
    }

    const failedPayment = order.payments.find(p => (p.id === paymentId || p.razorpayPaymentId === paymentId) && p.status === "FAILED");
    if (!failedPayment) return null;

    // Determine the relevant checkout session
    const session = order.checkoutSessions.length > 0 ? order.checkoutSessions[order.checkoutSessions.length - 1] : null;

    // Idempotency: Create exactly one RecoveryCase per order + riskReason
    const existingCase = await prisma.recoveryCase.findUnique({
      where: {
        storeId_orderId_riskReason: {
          storeId: order.storeId,
          orderId: order.id,
          riskReason: "PAYMENT_FAILED"
        }
      }
    });

    if (existingCase) return existingCase;

    const newCase = await prisma.recoveryCase.create({
      data: {
        storeId: order.storeId,
        customerId: order.customerId,
        orderId: order.id,
        checkoutSessionId: session?.id,
        riskAmount: failedPayment.amount,
        riskReason: "PAYMENT_FAILED",
        riskType: "TEMPORARY_FAILURE",
        status: "DETECTED"
      }
    });

    await prisma.auditEvent.create({
      data: {
        recoveryCaseId: newCase.id,
        actor: "SYSTEM",
        action: "RECOVERY_CASE_DETECTED",
        metadata: JSON.stringify({ paymentId, riskAmount: newCase.riskAmount })
      }
    });

    return newCase;
  }
};

export const RecoveryAnalysisService = {
  async triggerAnalysis(recoveryCaseId: string) {
    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: recoveryCaseId },
      include: {
        store: true,
        customer: { include: { orders: { include: { payments: true } } } },
        order: { include: { items: true, payments: true } },
        checkoutSession: { include: { events: { orderBy: { timestamp: "asc" } } } }
      }
    });

    if (!recCase) throw new Error("Recovery case not found");

    if (recCase.status !== "DETECTED" && recCase.status !== "FAILED") {
      throw new Error("Case is not in an analyzable state");
    }

    await prisma.recoveryCase.update({
      where: { id: recCase.id },
      data: { status: "ANALYZING" }
    });
    
    await prisma.auditEvent.create({
      data: { recoveryCaseId: recCase.id, actor: "SYSTEM", action: "ANALYSIS_STARTED" }
    });

    try {


      // Feature extraction
      const totalOrders = recCase.customer.orders.length;
      const successfulOrders = recCase.customer.orders.filter(o => o.status === "PAID").length;
      const failedPayments = recCase.customer.orders.flatMap(o => o.payments).filter(p => p.status === "FAILED").length;
      const lifetimeSpend = recCase.customer.orders.filter(o => o.status === "PAID").reduce((sum, o) => sum + o.total, 0);
      
      const failedPayment = recCase.order.payments.find(p => p.status === "FAILED");
      
      let historicalEvidence: any[] = [];
      try {
        historicalEvidence = await MemoryService.getRelevantMemory(recCase.storeId, {
          paymentMethod: failedPayment?.method,
          customerSegment: "RETURNING_CUSTOMER" // Hardcoded heuristic for demo purposes
        });
      } catch(e) {}

      const merchantPreferences = await prisma.merchantRecoveryPreference.findMany({
        where: { merchantId: recCase.store.merchantId, enabled: true }
      });
      
      const experimentForcedStrategy = await ExperimentAssignmentService.assignCaseIfEligible(recCase.id);

      const context = {
        amount: recCase.riskAmount,
        currency: recCase.order.currency,
        customerHistory: { totalOrders, successfulOrders, failedPayments, lifetimeSpend },
        payments: recCase.order.payments.map(p => ({ method: p.method, status: p.status, failureReason: p.failureReason })),
        checkoutEvents: recCase.checkoutSession?.events.map(e => e.eventType),
        historicalEvidence: historicalEvidence.length > 0 ? historicalEvidence : "INSUFFICIENT_EVIDENCE",
        merchantPreferences: merchantPreferences.map(p => ({ condition: p.condition, preferred: p.preferredStrategy, avoided: p.disallowedStrategy })),
        experimentForcedStrategy
      };

      const prompt = `Analyze this checkout abandonment/payment failure context and recommend a recovery strategy.
      Context: ${JSON.stringify(context, null, 2)}
      
      IMPORTANT: If "experimentForcedStrategy" is provided, you MUST set "recommendedAction" to that exact strategy. 
      Otherwise, respect "merchantPreferences" where applicable unless it strongly conflicts with safety.
      
      Return a JSON object with this exact structure:
      {
        "diagnosis": "Short string diagnosing the failure",
        "diagnosisConfidence": 0.0 to 1.0,
        "recoveryProbability": 0.0 to 1.0,
        "recommendedAction": "NO_ACTION" | "PAYMENT_LINK" | "RETRY" | "PAYMENT_LINK_WITH_VOUCHER",
        "recommendedDiscountPercentage": integer (0 to 15, only if using voucher, default 0),
        "reasoning": "Short string",
        "alternatives": [
          {
            "actionType": "...",
            "predictedProbability": 0.0 to 1.0,
            "predictedGrossRecovery": integer (minor units),
            "predictedIncentiveCost": integer (minor units),
            "predictedNetRecovery": integer (minor units),
            "reason": "..."
          }
        ]
      }`;

      const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(process.env.AI_PROVIDER_API_KEY ? { 'Authorization': `Bearer ${process.env.AI_PROVIDER_API_KEY}` } : {})
        },
        body: JSON.stringify({
          model: "gemma4:31b-cloud",
          messages: [{ role: "user", content: prompt }],
          format: "json",
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.message?.content;
      if (!responseText) throw new Error("AI returned empty response");

      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```json")) cleanJson = cleanJson.substring(7);
      else if (cleanJson.startsWith("```")) cleanJson = cleanJson.substring(3);
      if (cleanJson.endsWith("```")) cleanJson = cleanJson.substring(0, cleanJson.length - 3);

      const decisionData = JSON.parse(cleanJson.trim());

      // Verify bounds
      if (decisionData.recoveryProbability < 0 || decisionData.recoveryProbability > 1) {
        throw new Error("Invalid probability returned by AI");
      }

      const aiDecision = await prisma.aIDecision.create({
        data: {
          recoveryCaseId: recCase.id,
          diagnosis: decisionData.diagnosis,
          confidence: decisionData.diagnosisConfidence,
          recoveryProbability: decisionData.recoveryProbability,
          recommendedAction: decisionData.recommendedAction,
          reason: decisionData.reasoning,
          modelVersion: "gemma4:31b-cloud"
        }
      });

      let highestNetRecovery = 0;
      let hasSelected = false;

      if (decisionData.alternatives && Array.isArray(decisionData.alternatives)) {
        for (const alt of decisionData.alternatives) {
          const isSelected = alt.actionType?.toUpperCase().replace(/[\s-]/g, "_") === decisionData.recommendedAction?.toUpperCase().replace(/[\s-]/g, "_");
          if (isSelected) hasSelected = true;

          const net = Math.max(0, (alt.predictedGrossRecovery || 0) - (alt.predictedIncentiveCost || 0));
          if (net > highestNetRecovery) highestNetRecovery = net;

          await prisma.recoveryOption.create({
            data: {
              aiDecisionId: aiDecision.id,
              actionType: alt.actionType || "PAYMENT_LINK",
              predictedProbability: alt.predictedProbability ?? decisionData.recoveryProbability ?? 0.5,
              predictedGrossRecovery: alt.predictedGrossRecovery || recCase.riskAmount,
              predictedIncentiveCost: alt.predictedIncentiveCost || 0,
              predictedNetRecovery: net,
              reason: alt.reason || decisionData.reason,
              selected: isSelected
            }
          });
        }
      }

      if (!hasSelected) {
        const predictedGross = recCase.riskAmount;
        let discountPercentage = decisionData.recommendedDiscountPercentage || 0;
        if (discountPercentage > 15) discountPercentage = 15; // Hard limit to 15%
        
        const predictedIncentive = decisionData.recommendedAction.includes("VOUCHER") 
          ? Math.round(predictedGross * (discountPercentage / 100)) 
          : 0;
          
        const net = predictedGross - predictedIncentive;
        if (net > highestNetRecovery) highestNetRecovery = net;

        await prisma.recoveryOption.create({
          data: {
            aiDecisionId: aiDecision.id,
            actionType: decisionData.recommendedAction,
            predictedProbability: decisionData.recoveryProbability ?? 0.75,
            predictedGrossRecovery: predictedGross,
            predictedIncentiveCost: predictedIncentive,
            predictedNetRecovery: net,
            reason: decisionData.reason || "Recommended strategy",
            selected: true
          }
        });
      }

      // Calculate Opportunity Score deterministically: (Expected Net / Risk Amount) * 100 * probability
      // Adjusted formula for 0-100 score: 
      const rawScore = (highestNetRecovery / Math.max(1, recCase.riskAmount)) * (decisionData.recoveryProbability) * 100;
      const opportunityScore = Math.min(100, Math.max(0, Math.round(rawScore)));

      await prisma.recoveryCase.update({
        where: { id: recCase.id },
        data: {
          status: "ACTION_READY",
          recoveryProbability: decisionData.recoveryProbability,
          opportunityScore
        }
      });

      await prisma.auditEvent.create({
        data: {
          recoveryCaseId: recCase.id,
          actor: "AI",
          action: "ANALYSIS_COMPLETED",
          metadata: JSON.stringify({ aiDecisionId: aiDecision.id, opportunityScore })
        }
      });

      // Synchronous handoff to Policy Engine
      const policyEval = await PolicyEngine.evaluate(recCase.id, aiDecision.id);
      if (policyEval.allowed) {
        const plan = await RecoveryPlanService.createPlan(recCase.id).catch(console.error);
        if (plan) {
          await RecoveryExecutionService.executeNextStep(plan.id).catch(console.error);
        }
      }

      return aiDecision;
    } catch (err: any) {
      await prisma.recoveryCase.update({
        where: { id: recCase.id },
        data: { status: "FAILED" }
      });
      await prisma.auditEvent.create({
        data: {
          recoveryCaseId: recCase.id,
          actor: "SYSTEM",
          action: "ANALYSIS_FAILED",
          metadata: JSON.stringify({ error: err.message })
        }
      });
      throw err;
    }
  }
};
