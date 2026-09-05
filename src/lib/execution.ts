import { prisma } from "./db";
import { RecoveryStopService } from "./plan";
import { RazorpayService } from "./razorpay";
import { NtfyService } from "./ntfy";
import { SMSService } from "./sms";

export const NotificationProvider = {
  async send(caseId: string, customerId: string, channel: string, content: string, phoneNumber?: string | null) {
    let provider = "NTFY";
    let providerMessageId = `ntfy_${Date.now()}`;
    let deliveryStatus = "DISPATCHED";

    if (channel === "SMS" && phoneNumber) {
      const smsResult = await SMSService.send({
        phoneNumber,
        message: content,
        customerId,
        recoveryCaseId: caseId
      });
      provider = smsResult.provider;
      providerMessageId = `sms_${Date.now()}`;
      deliveryStatus = smsResult.success
        ? (smsResult.provider === "SIMULATED" ? "SIMULATED" : "DELIVERED")
        : "FAILED";
    }

    // Save notification record to DB (always)
    const notification = await prisma.notification.create({
      data: {
        recoveryCaseId: caseId,
        customerId,
        channel,
        message: content,
        status: deliveryStatus === "FAILED" ? "FAILED" : "SENT",
        provider,
        providerMessageId,
        deliveryStatus,
        sentAt: new Date(),
      }
    });

    console.log(`[NotificationProvider] -> ${channel} (${provider}): ${content}`);
    return notification;
  }
};

export const RecoveryExecutionService = {
  async executeNextStep(recoveryPlanId: string) {
    const plan = await prisma.recoveryPlan.findUnique({
      where: { id: recoveryPlanId },
      include: {
        steps: { orderBy: { stepNumber: "asc" } },
        recoveryCase: { include: { order: { include: { items: true } }, customer: true, store: true } }
      }
    });

    if (!plan || plan.status !== "READY" && plan.status !== "RUNNING") return;

    const stopCheck = await RecoveryStopService.shouldStop(plan.recoveryCaseId);
    if (stopCheck.stop) {
      await this.stopPlan(plan.id, stopCheck.reason || "STOP_CONDITION_MET");
      return;
    }

    const nextStep = plan.steps.find(s => s.status === "PENDING" || (s.status === "WAITING" && s.scheduledAt && s.scheduledAt <= new Date()));
    if (!nextStep) {
      if (plan.steps.every(s => s.status === "COMPLETED" || s.status === "SKIPPED")) {
        await prisma.recoveryPlan.update({ where: { id: plan.id }, data: { status: "COMPLETED", completedAt: new Date() } });
      }
      return;
    }

    // Mark step running
    await prisma.recoveryPlanStep.update({ where: { id: nextStep.id }, data: { status: "RUNNING", executedAt: new Date() } });
    if (plan.status === "READY") {
      await prisma.recoveryPlan.update({ where: { id: plan.id }, data: { status: "RUNNING", startedAt: new Date() } });
    }

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
    const productName = plan.recoveryCase.order.items[0]?.productNameSnapshot || "your order";

    try {
      if (nextStep.actionType === "PAYMENT_LINK") {
        const stepMetadata = nextStep.metadata ? JSON.parse(nextStep.metadata) : {};
        const discountAmount = stepMetadata.discountAmount || 0;

        // If there's a discount, we must not reuse an existing non-discounted link.
        // For simplicity, always check if we can reuse, but if discountAmount > 0 we create fresh.
        const existingLink = await prisma.paymentLink.findFirst({
          where: { orderId: plan.recoveryCase.orderId, status: { not: "CANCELLED" } }
        });

        let plink = discountAmount === 0 ? existingLink : null;
        if (!plink) {
          const finalAmount = Math.max(100, plan.recoveryCase.order.total - discountAmount);
          const description = discountAmount > 0 
            ? `Special Offer: Recovery Payment for ${productName}`
            : `Recovery Payment for ${productName}`;
            
          plink = await RazorpayService.createPaymentLink(
            plan.recoveryCase.orderId,
            finalAmount,
            plan.recoveryCase.customer.email || "test@example.com",
            plan.recoveryCase.customer.phone || "+919000000000",
            description
          );

          if (discountAmount > 0) {
            const voucherCode = `REC-${plan.recoveryCase.customer.id.substring(0, 4).toUpperCase()}-${Math.floor(Math.random() * 10000)}`;
            await prisma.voucher.create({
              data: {
                storeId: plan.recoveryCase.storeId,
                code: voucherCode,
                discountType: "FIXED",
                discountValue: discountAmount,
                status: "EXHAUSTED", // Directly applied, so user doesn't need to copy it
              }
            });
          }
        }

        await prisma.recoveryAction.create({
          data: {
            recoveryCaseId: plan.recoveryCaseId,
            planStepId: nextStep.id,
            type: "PAYMENT_LINK",
            status: "COMPLETED",
            provider: "RAZORPAY",
            providerReference: plink.razorpayPaymentLinkId,
            executedAt: new Date(),
            completedAt: new Date(),
            metadata: JSON.stringify({ shortUrl: plink.shortUrl })
          }
        });

        await prisma.recoveryPlanStep.update({ where: { id: nextStep.id }, data: { status: "COMPLETED", completedAt: new Date() } });

        // Real mobile push — merchant sees action dispatched
        await NtfyService.recoveryActionDispatched({
          customerName: plan.recoveryCase.customer.name || "Customer",
          actionType: "PAYMENT_LINK",
          amount: plan.recoveryCase.order.total,
          caseId: plan.recoveryCaseId,
          orderId: plan.recoveryCase.order.id,
          discountAmount: discountAmount > 0 ? discountAmount : undefined,
          appBaseUrl
        });

      } else if (nextStep.actionType === "WAIT") {
        await prisma.recoveryPlanStep.update({ where: { id: nextStep.id }, data: { status: "COMPLETED", completedAt: new Date() } });

      } else if (nextStep.actionType === "MESSAGE") {
        const metadata = nextStep.metadata ? JSON.parse(nextStep.metadata) : {};
        
        let linkUrl: string | undefined = undefined;
        const existingLink = await prisma.paymentLink.findFirst({
          where: { orderId: plan.recoveryCase.orderId },
          orderBy: { createdAt: "desc" }
        });
        if (existingLink?.shortUrl) linkUrl = existingLink.shortUrl;

        const customer = plan.recoveryCase.customer;
        const customerName = customer.name && customer.name !== "Customer" ? customer.name : "there";
        const customerPhone = customer.phone;
        const amountRs = (plan.recoveryCase.order.total / 100).toLocaleString("en-IN");

        let content = "";
        if (metadata.useVoucher) {
          content = `Hey ${customerName}! 🎁 We noticed your payment of ₹${amountRs} for "${productName}" failed. Good news: your order is reserved and we applied an exclusive discount!\n\n👉 Tap here to complete your purchase:\n${linkUrl || "your payment link"}\n\n⚡ Valid for 24 hours only. Don't miss out!`;
        } else {
          content = `Oh no, ${customerName}! 😔 We just saw your payment of ₹${amountRs} for "${productName}" failed.\n\nDon't worry, your cart is safely reserved! To try again and complete your purchase, click this link:\n${linkUrl || "your payment link"}\n\n⚡ Fast & secure 1-click checkout. Let's get this delivered to you!`;
        }

        const notifyResult = await NotificationProvider.send(
          plan.recoveryCaseId,
          plan.recoveryCase.customerId,
          "SMS",
          content,
          customerPhone
        );

        await prisma.recoveryAction.create({
          data: {
            recoveryCaseId: plan.recoveryCaseId,
            planStepId: nextStep.id,
            type: "MESSAGE",
            status: "COMPLETED",
            provider: notifyResult.provider,
            providerReference: notifyResult.providerMessageId,
            executedAt: new Date(),
            completedAt: new Date(),
            metadata: JSON.stringify({ content, notificationId: notifyResult.id })
          }
        });

        await prisma.recoveryPlanStep.update({ where: { id: nextStep.id }, data: { status: "COMPLETED", completedAt: new Date() } });

        // Real mobile push — merchant sees message dispatched
        await NtfyService.recoveryActionDispatched({
          customerName: plan.recoveryCase.customer.name || "Customer",
          actionType: "MESSAGE",
          amount: plan.recoveryCase.order.total,
          caseId: plan.recoveryCaseId,
          appBaseUrl
        });

      } else {
        await prisma.recoveryPlanStep.update({ where: { id: nextStep.id }, data: { status: "SKIPPED", completedAt: new Date() } });
      }
    } catch (err: any) {
      await prisma.recoveryPlanStep.update({ where: { id: nextStep.id }, data: { status: "FAILED", failureReason: err.message, completedAt: new Date() } });
      await this.stopPlan(plan.id, `STEP_FAILED: ${err.message}`);
    }
  },

  async stopPlan(planId: string, reason: string) {
    const plan = await prisma.recoveryPlan.findUnique({ where: { id: planId } });
    if (!plan) return;

    await prisma.recoveryPlan.update({
      where: { id: plan.id },
      data: { status: "STOPPED", cancelledAt: new Date() }
    });

    await prisma.recoveryPlanStep.updateMany({
      where: { recoveryPlanId: plan.id, status: { in: ["PENDING", "WAITING"] } },
      data: { status: "CANCELLED" }
    });

    await prisma.recoveryCase.update({
      where: { id: plan.recoveryCaseId },
      data: { status: "STOPPED" }
    });

    await prisma.auditEvent.create({
      data: { recoveryCaseId: plan.recoveryCaseId, actor: "SYSTEM", action: "PLAN_STOPPED", metadata: JSON.stringify({ reason }) }
    });
  }
};
