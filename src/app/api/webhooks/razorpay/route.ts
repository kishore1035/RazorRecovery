import { NextResponse } from "next/server";
import { RazorpayService } from "@/lib/razorpay";
import { prisma } from "@/lib/db";
import { RecoveryEligibilityService, RecoveryAnalysisService } from "@/lib/recovery";
import { RecoveryOutcomeService } from "@/lib/outcome";
import { NtfyService } from "@/lib/ntfy";
import { SMSService } from "@/lib/sms";

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
        
        let order = rzpOrderId ? await prisma.order.findUnique({ where: { razorpayOrderId: rzpOrderId } }) : null;
        if (!order && paymentEntity.notes?.order_id) {
          order = await prisma.order.findFirst({
            where: {
              OR: [
                { id: paymentEntity.notes.order_id },
                { razorpayOrderId: paymentEntity.notes.order_id }
              ]
            }
          });
        }
        if (!order && (paymentEntity.notes?.payment_link_id || payload.payload?.payment_link?.entity?.id)) {
          const plinkId = paymentEntity.notes?.payment_link_id || payload.payload?.payment_link?.entity?.id;
          const pl = await prisma.paymentLink.findUnique({ where: { razorpayPaymentLinkId: plinkId } });
          if (pl) {
            order = await prisma.order.findUnique({ where: { id: pl.orderId } });
          }
        }
        
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
      } else if (eventName === "payment.failed") {
        const paymentEntity = payload.payload.payment.entity;
        const rzpOrderId = paymentEntity.order_id;
        
        let order = rzpOrderId ? await prisma.order.findUnique({ where: { razorpayOrderId: rzpOrderId } }) : null;
        if (!order && paymentEntity.notes?.order_id) {
          order = await prisma.order.findFirst({
            where: {
              OR: [
                { id: paymentEntity.notes.order_id },
                { razorpayOrderId: paymentEntity.notes.order_id }
              ]
            }
          });
        }
        if (!order && (paymentEntity.notes?.payment_link_id || payload.payload?.payment_link?.entity?.id)) {
          const plinkId = paymentEntity.notes?.payment_link_id || payload.payload?.payment_link?.entity?.id;
          const pl = await prisma.paymentLink.findUnique({ where: { razorpayPaymentLinkId: plinkId } });
          if (pl) {
            order = await prisma.order.findUnique({ where: { id: pl.orderId } });
          }
        }
          
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
            let customer = await prisma.customer.findUnique({ where: { id: order.customerId } });

            // Extract contact from Razorpay payment entity if customer phone is missing
            const paymentContact = paymentEntity.contact ? String(paymentEntity.contact).trim() : null;
            if (customer && !customer.phone && paymentContact) {
              customer = await prisma.customer.update({
                where: { id: customer.id },
                data: { phone: paymentContact }
              });
            }
            const customerPhone = customer?.phone || paymentContact;
            const customerName =
              (paymentEntity.notes && (paymentEntity.notes.customer_name || paymentEntity.notes.name)) ||
              customer?.name ||
              "there";

            // Resolve or dynamically create retry payment link
            let retryPaymentUrl: string | undefined = undefined;
            const existingLink = await prisma.paymentLink.findFirst({
              where: { orderId: order.id, status: { not: "CANCELLED" } },
              orderBy: { createdAt: "desc" }
            });

            if (existingLink?.shortUrl) {
              retryPaymentUrl = existingLink.shortUrl;
            } else if (payload.payload?.payment_link?.entity?.short_url) {
              retryPaymentUrl = payload.payload.payment_link.entity.short_url;
            } else if (customer?.email || customerPhone) {
              try {
                const newPlink = await RazorpayService.createPaymentLink(
                  order.id,
                  paymentEntity.amount || order.total,
                  customer?.email || "customer@example.com",
                  customerPhone || "+919000000000",
                  `Retry payment for ${productName}`
                );
                retryPaymentUrl = newPlink.shortUrl || undefined;
              } catch (linkErr) {
                console.warn("[Webhook] Could not create payment link on the fly:", linkErr);
              }
            }

            if (!retryPaymentUrl) {
              const base = appBaseUrl || "http://localhost:3000";
              retryPaymentUrl = `${base}/checkout-demo.html?orderId=${order.razorpayOrderId || order.id}&amount=${paymentEntity.amount}&product=${encodeURIComponent(productName)}`;
            }

            // Detect recovery case
            let recCase: any = null;
            try {
              recCase = await RecoveryEligibilityService.detectPaymentFailure(order.id, paymentEntity.id);
            } catch (detErr) {
              console.error("Recovery detection failed:", detErr);
            }

            // Merchant push notification via Ntfy
            NtfyService.paymentFailed({
              customerName: customerName,
              productName,
              amount: paymentEntity.amount,
              method: paymentEntity.method || "unknown",
              caseId: recCase?.id || "pending",
              appBaseUrl
            }).catch(console.error);

            // Send motivational SMS to customer with retry link (Razorpay style)
            if (customerPhone) {
              SMSService.paymentFailed({
                customerName: customerName,
                phoneNumber: customerPhone,
                amount: paymentEntity.amount,
                productName,
                failureReason: paymentEntity.error_description,
                paymentLinkUrl: retryPaymentUrl,
                appBaseUrl,
                customerId: customer?.id,
                recoveryCaseId: recCase?.id
              }).catch(console.error);
            }

            // Queue recovery analysis asynchronously if detected
            if (recCase && recCase.status === "DETECTED") {
              setTimeout(async () => {
                try {
                  await RecoveryAnalysisService.triggerAnalysis(recCase.id).catch(console.error);
                } catch (e) {
                  console.error("Recovery analysis failed:", e);
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
