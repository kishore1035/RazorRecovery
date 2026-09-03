import { NextResponse } from "next/server";
import { RazorpayService } from "@/lib/razorpay";
import { prisma } from "@/lib/db";
import { RecoveryEligibilityService, RecoveryAnalysisService } from "@/lib/recovery";
import { RecoveryOutcomeService } from "@/lib/outcome";
import { NtfyService } from "@/lib/ntfy";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // 1. Verify Signature
    try {
      const isValid = RazorpayService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 500 });
    }

    const payload = JSON.parse(rawBody);
    const eventId = req.headers.get("x-razorpay-event-id") || payload.id;

    if (!eventId) {
      return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
    }

    // 2. Idempotency Check
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { provider_providerEventId: { provider: "RAZORPAY", providerEventId: eventId } }
    });

    if (existingEvent) {
      return NextResponse.json({ status: "ignored", reason: "duplicate" });
    }

    // 3. Persist Event
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        provider: "RAZORPAY",
        providerEventId: eventId,
        eventType: payload.event,
        payload: rawBody,
        signatureVerified: true,
        processingStatus: "PENDING"
      }
    });

    // 4. Process Relevant Events
    try {
      const eventName = payload.event;
      
      if (eventName === "payment.captured") {
        const paymentEntity = payload.payload.payment.entity;
        const rzpOrderId = paymentEntity.order_id;
        
        if (rzpOrderId) {
          const order = await prisma.order.findUnique({ where: { razorpayOrderId: rzpOrderId } });
          
          if (order) {
            await prisma.$transaction([
              prisma.payment.create({
                data: {
                  orderId: order.id,
                  razorpayPaymentId: paymentEntity.id,
                  amount: paymentEntity.amount,
                  currency: paymentEntity.currency,
                  method: paymentEntity.method,
                  status: "CAPTURED",
                }
              }),
              prisma.order.update({
                where: { id: order.id },
                data: { status: "PAID" }
              })
            ]);
            
            // Queue outcome evaluation asynchronously
            setTimeout(async () => {
              try {
                await RecoveryOutcomeService.evaluateOutcome(order.id, paymentEntity.id);
              } catch (e) {
                console.error("Outcome evaluation failed:", e);
              }
            }, 0);
          }
        }
      } else if (eventName === "payment.failed") {
        const paymentEntity = payload.payload.payment.entity;
        const rzpOrderId = paymentEntity.order_id;
        
        if (rzpOrderId) {
          const order = await prisma.order.findUnique({ where: { razorpayOrderId: rzpOrderId } });
          
          if (order) {
            await prisma.$transaction([
              prisma.payment.create({
                data: {
                  orderId: order.id,
                  razorpayPaymentId: paymentEntity.id,
                  amount: paymentEntity.amount,
                  currency: paymentEntity.currency,
                  method: paymentEntity.method,
                  status: "FAILED",
                  failureCode: paymentEntity.error_code,
                  failureReason: paymentEntity.error_description
                }
              }),
               prisma.order.update({
                where: { id: order.id },
                data: { status: order.status === "CREATED" || order.status === "PAYMENT_PENDING" ? "FAILED" : order.status }
              })
            ]);
            
            // Real mobile push — merchant sees failure immediately (like Razorpay)
            const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
            const orderItems = await prisma.orderItem.findFirst({ where: { orderId: order.id } });
            const productName = orderItems?.productNameSnapshot || "order item";
            const customer = await prisma.customer.findUnique({ where: { id: order.customerId } });

            // Fire-and-forget: don't block webhook response
            NtfyService.paymentFailed({
              customerName: customer?.name || "Customer",
              productName,
              amount: paymentEntity.amount,
              method: paymentEntity.method || "unknown",
              caseId: "pending", // will be updated after detection
              appBaseUrl
            }).catch(console.error);

            // Queue recovery detection asynchronously
            setTimeout(async () => {
              try {
                const recCase = await RecoveryEligibilityService.detectPaymentFailure(order.id, paymentEntity.id);
                if (recCase && recCase.status === "DETECTED") {
                  await RecoveryAnalysisService.triggerAnalysis(recCase.id).catch(console.error);
                }
              } catch (e) {
                console.error("Recovery detection failed:", e);
              }
            }, 0);
          }
        }
      } else if (eventName === "payment_link.paid") {
        const linkEntity = payload.payload.payment_link.entity;
        
        const link = await prisma.paymentLink.findUnique({
          where: { razorpayPaymentLinkId: linkEntity.id }
        });

        if (link) {
          const paymentEntity = payload.payload?.payment?.entity;
          const rzpPayId = paymentEntity?.id || `pay_link_${Date.now()}`;
          const amount = paymentEntity?.amount || linkEntity.amount || 0;

          const capturedPayment = await prisma.payment.create({
            data: {
              orderId: link.orderId,
              razorpayPaymentId: rzpPayId,
              amount: amount,
              currency: linkEntity.currency || "INR",
              method: paymentEntity?.method || "PAYMENT_LINK",
              status: "CAPTURED"
            }
          });

          await prisma.$transaction([
            prisma.paymentLink.update({
              where: { id: link.id },
              data: { status: "PAID" }
            }),
            prisma.order.update({
              where: { id: link.orderId },
              data: { status: "PAID" }
            })
          ]);

          setTimeout(async () => {
            try {
              await RecoveryOutcomeService.evaluateOutcome(link.orderId, capturedPayment.id);
            } catch (e) {
              console.error("Outcome evaluation for payment link failed:", e);
            }
          }, 0);
        }
      }

      // Mark as PROCESSED
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processingStatus: "PROCESSED", processedAt: new Date() }
      });
      
    } catch (processingError: any) {
      // Mark as FAILED
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processingStatus: "FAILED", errorMessage: processingError.message }
      });
      throw processingError; // re-throw to return 500
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
