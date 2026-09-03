import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { RecoveryPlanService } from "@/lib/plan";
import { RecoveryExecutionService } from "@/lib/execution";
import { RecoveryOutcomeService } from "@/lib/outcome";

export async function POST(req: Request) {
  try {
    const { recoveryCaseId, action } = await req.json(); // action: "APPROVE" | "EXECUTE" | "REJECT" | "CONFIRM_PAYMENT"

    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: recoveryCaseId },
      include: {
        order: { include: { payments: true } },
        approvalRequests: { where: { status: "PENDING" }, take: 1 }
      }
    });

    if (!recCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const approval = recCase.approvalRequests[0];

    if (action === "APPROVE" || action === "EXECUTE") {
      if (approval) {
        await prisma.approvalRequest.update({
          where: { id: approval.id },
          data: { status: "APPROVED", resolvedAt: new Date(), resolvedBy: "Merchant" }
        });
      }

      await prisma.auditEvent.create({
        data: {
          recoveryCaseId: recCase.id,
          actor: "MERCHANT",
          action: "ACTION_EXECUTED",
          metadata: JSON.stringify({ actionBy: "Admin" })
        }
      });

      let plan = await prisma.recoveryPlan.findFirst({
        where: { recoveryCaseId: recCase.id },
        orderBy: { createdAt: "desc" }
      });

      if (!plan) {
        plan = await RecoveryPlanService.createPlan(recCase.id);
      }

      if (plan) {
        await RecoveryExecutionService.executeNextStep(plan.id);
      }

      await prisma.recoveryCase.update({
        where: { id: recCase.id },
        data: { status: "RECOVERING" }
      });

      return NextResponse.json({ success: true, status: "RECOVERING" });
    } else if (action === "CONFIRM_PAYMENT") {
      // Create captured payment for the order
      // Use the original failed payment method, or the order currency; never hardcode
      const originalFailedPayment = recCase.order.payments.find((p: any) => p.status === "FAILED");
      const paymentMethod = originalFailedPayment?.method ?? "upi";
      const currency = recCase.order.currency || "INR";
      const paymentId = `pay_manual_${Date.now()}`;
      const payment = await prisma.payment.create({
        data: {
          orderId: recCase.orderId,
          razorpayPaymentId: paymentId,
          amount: recCase.riskAmount,
          currency,
          method: paymentMethod,
          status: "CAPTURED"
        }
      });

      await prisma.order.update({
        where: { id: recCase.orderId },
        data: { status: "PAID" }
      });

      // Evaluate outcome
      const outcome = await RecoveryOutcomeService.evaluateOutcome(recCase.orderId, payment.id);

      await prisma.auditEvent.create({
        data: {
          recoveryCaseId: recCase.id,
          actor: "SYSTEM",
          action: "PAYMENT_CONFIRMED",
          metadata: JSON.stringify({ paymentId: payment.id, netRecovered: outcome?.netRecovered })
        }
      });

      return NextResponse.json({ success: true, status: "RECOVERED", outcome });
    } else if (action === "REJECT") {
      if (approval) {
        await prisma.approvalRequest.update({
          where: { id: approval.id },
          data: { status: "REJECTED", resolvedAt: new Date(), resolvedBy: "Merchant" }
        });
      }

      await prisma.recoveryCase.update({
        where: { id: recCase.id },
        data: { status: "STOPPED" }
      });

      await prisma.auditEvent.create({
        data: {
          recoveryCaseId: recCase.id,
          actor: "MERCHANT",
          action: "APPROVAL_REJECTED",
          metadata: JSON.stringify({ reason: "Merchant declined automated intervention" })
        }
      });

      return NextResponse.json({ success: true, status: "STOPPED" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Recovery action failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
