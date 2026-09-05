import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { RecoveryEligibilityService, RecoveryAnalysisService } from "@/lib/recovery";
import { NtfyService } from "@/lib/ntfy";
import { SMSService } from "@/lib/sms";
import { RazorpayService } from "@/lib/razorpay";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      orderId, // local order ID or razorpayOrderId
      paymentId = `pay_fail_${Date.now()}`,
      failureCode = "BAD_REQUEST_PAYMENT_TIMED_OUT",
      failureReason = "Payment was cancelled or failed at bank",
      customerPhone,
      customerName,
    } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // 1. Find Order
    let order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { razorpayOrderId: orderId }],
      },
      include: {
        customer: true,
        items: true,
        paymentLinks: {
          where: { status: { not: "CANCELLED" } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Update Customer contact info if provided
    let customer = order.customer;
    const resolvedPhone = customerPhone?.trim() || customer.phone;
    const resolvedName = customerName?.trim() || (customer.name !== "Customer" ? customer.name : null);

    if (customer && ((resolvedPhone && resolvedPhone !== customer.phone) || (resolvedName && resolvedName !== customer.name))) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          phone: resolvedPhone || customer.phone,
          name: resolvedName || customer.name,
        },
      });
    }

    // 3. Record Failed Payment & Update Order
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        razorpayPaymentId: paymentId,
        amount: order.total,
        currency: order.currency,
        method: "UPI",
        status: "FAILED",
        failureCode,
        failureReason,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: order.status === "PAID" ? order.status : "FAILED" },
    });

    // 4. Resolve or generate retry payment link
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const productName = order.items[0]?.productNameSnapshot || "order items";

    let retryPaymentUrl: string | undefined = undefined;
    if (order.paymentLinks && order.paymentLinks.length > 0 && order.paymentLinks[0].shortUrl) {
      retryPaymentUrl = order.paymentLinks[0].shortUrl;
    } else {
      try {
        const newPlink = await RazorpayService.createPaymentLink(
          order.id,
          order.total,
          customer.email || "customer@example.com",
          resolvedPhone || "+919000000000",
          `Retry payment for ${productName}`
        );
        retryPaymentUrl = newPlink.shortUrl || undefined;
      } catch (e) {
        console.warn("[FailAPI] Could not create payment link on the fly:", e);
      }
    }

    if (!retryPaymentUrl) {
      retryPaymentUrl = `${appBaseUrl}/checkout-demo.html?orderId=${order.razorpayOrderId || order.id}&amount=${order.total}&product=${encodeURIComponent(productName)}`;
    }

    // 5. Trigger Recovery Detection
    let recCase: any = null;
    try {
      recCase = await RecoveryEligibilityService.detectPaymentFailure(order.id, payment.id);
    } catch (e) {
      console.error("[FailAPI] Recovery detection failed:", e);
    }

    // 6. Merchant Push Notification via Ntfy
    NtfyService.paymentFailed({
      customerName: resolvedName || customer.name || "Customer",
      productName,
      amount: order.total,
      method: "UPI",
      caseId: recCase?.id || "pending",
      appBaseUrl,
    }).catch(console.error);

    // 7. Dispatch Motivational SMS to Customer (Razorpay Style)
    let smsResult: any = null;
    if (resolvedPhone) {
      smsResult = await SMSService.paymentFailed({
        customerName: resolvedName || customer.name || "there",
        phoneNumber: resolvedPhone,
        amount: order.total,
        productName,
        failureReason,
        paymentLinkUrl: retryPaymentUrl,
        appBaseUrl,
        customerId: customer.id,
        recoveryCaseId: recCase?.id,
      });
    }

    // 8. Trigger AI Recovery Analysis asynchronously
    if (recCase && recCase.status === "DETECTED") {
      setTimeout(async () => {
        try {
          await RecoveryAnalysisService.triggerAnalysis(recCase.id).catch(console.error);
        } catch (e) {
          console.error("[FailAPI] Recovery analysis failed:", e);
        }
      }, 0);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentId: payment.id,
      caseId: recCase?.id,
      retryPaymentUrl,
      sms: smsResult,
    });
  } catch (err: any) {
    console.error("[FailAPI] Error handling payment failure:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
