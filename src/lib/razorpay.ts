import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "./db";

// Singleton instance wrapper
let razorpayInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (razorpayInstance) return razorpayInstance;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error("Razorpay credentials are not configured.");
  }

  razorpayInstance = new Razorpay({ key_id, key_secret });
  return razorpayInstance;
}

export const RazorpayService = {
  async createOrder(localOrderId: string, amount: number, currency: string = "INR") {
    const rzp = getRazorpayClient();
    
    // Idempotency: checking if order already has an RZP order ID
    const localOrder = await prisma.order.findUnique({ where: { id: localOrderId } });
    if (!localOrder) throw new Error("Local order not found");
    if (localOrder.razorpayOrderId) return { id: localOrder.razorpayOrderId };

    const rzpOrder = await rzp.orders.create({
      amount,
      currency,
      receipt: localOrderId.slice(0, 40), // Receipt has max length 40
      notes: { localOrderId }
    });

    await prisma.order.update({
      where: { id: localOrderId },
      data: { razorpayOrderId: rzpOrder.id }
    });

    return rzpOrder;
  },

  async createPaymentLink(
    localOrderId: string,
    amount: number,
    customerEmail: string,
    customerPhone: string,
    description: string,
    opts?: {
      notifySms?: boolean;
      notifyEmail?: boolean;
      acceptPartial?: boolean;
      expireBy?: number; // unix timestamp
      referenceId?: string;
    }
  ) {
    const rzp = getRazorpayClient();
    
    // Idempotency check via DB
    const existingLink = await prisma.paymentLink.findFirst({
      where: { orderId: localOrderId, status: { not: "CANCELLED" } }
    });
    if (existingLink) return existingLink;

    const rzpLink = await rzp.paymentLink.create({
      amount,
      currency: "INR",
      accept_partial: opts?.acceptPartial ?? false,
      description,
      customer: {
        email: customerEmail,
        contact: customerPhone
      },
      notify: {
        sms: opts?.notifySms ?? true,   // SMS ON by default (like Razorpay dashboard)
        email: opts?.notifyEmail ?? false
      },
      reminder_enable: true,
      reference_id: (opts?.referenceId || localOrderId).slice(0, 40),
      ...(opts?.expireBy ? { expire_by: opts.expireBy } : {})
    });

    const newLink = await prisma.paymentLink.create({
      data: {
        storeId: (await prisma.order.findUnique({ where: { id: localOrderId } }))!.storeId,
        orderId: localOrderId,
        razorpayPaymentLinkId: rzpLink.id,
        shortUrl: rzpLink.short_url,
        amount: amount,
        currency: "INR",
        status: rzpLink.status.toUpperCase(),
      }
    });

    return newLink;
  },

  async fetchPayment(razorpayPaymentId: string) {
    const rzp = getRazorpayClient();
    return await rzp.payments.fetch(razorpayPaymentId);
  },

  isLiveMode(): boolean {
    const key_id = process.env.RAZORPAY_KEY_ID || "";
    return key_id.startsWith("rzp_live_");
  },

  async syncLiveTransactions() {
    try {
      const rzp = getRazorpayClient();
      const store = await prisma.store.findFirst();
      if (!store) return;
      const storeId = store.id;

      const rzpPayments = await rzp.payments.all({ count: 100 });
      for (const p of rzpPayments.items) {
        const contact = p.contact ? String(p.contact) : null;
        const email = p.email && p.email !== "void@razorpay.com" ? String(p.email) : null;
        const amount = typeof p.amount === "number" ? p.amount : parseInt(String(p.amount), 10) || 0;

        let customer = await prisma.customer.findFirst({
          where: {
            storeId,
            OR: [
              ...(email ? [{ email }] : []),
              ...(contact ? [{ phone: contact }] : [])
            ]
          }
        });

        const customerName = (p.notes && (p.notes.customer_name || p.notes.name))
          ? String(p.notes.customer_name || p.notes.name)
          : (customer?.name && customer.name !== "Customer" ? customer.name : "Customer");

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              storeId,
              name: customerName,
              email,
              phone: contact
            }
          });
        } else if (customer.name === "Customer" && customerName !== "Customer") {
          await prisma.customer.update({
            where: { id: customer.id },
            data: { name: customerName }
          });
        }

        const productName = p.description && !p.description.startsWith("#")
          ? p.description.replace(/^Purchase:\s*/, "")
          : "Store Product";

        let product = await prisma.product.findFirst({
          where: { storeId, name: productName }
        });
        if (!product) {
          product = await prisma.product.create({
            data: {
              storeId,
              name: productName,
              sku: `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              price: amount,
              currency: p.currency || "INR",
              inventoryStatus: "IN_STOCK"
            }
          });
        }

        let order = p.order_id ? await prisma.order.findUnique({ where: { razorpayOrderId: p.order_id } }) : null;
        const paymentDate = new Date(p.created_at * 1000);
        const orderStatus = p.status === "captured" ? "PAID" : p.status === "refunded" ? "REFUNDED" : "FAILED";

        if (!order) {
          order = await prisma.order.create({
            data: {
              storeId,
              customerId: customer.id,
              razorpayOrderId: p.order_id || `order_${p.id}`,
              status: orderStatus,
              subtotal: amount,
              total: amount,
              currency: p.currency || "INR",
              createdAt: paymentDate,
              updatedAt: paymentDate
            }
          });
          await prisma.orderItem.create({
            data: {
              orderId: order.id,
              productId: product.id,
              productNameSnapshot: product.name,
              quantity: 1,
              unitPrice: product.price,
              createdAt: paymentDate
            }
          });
        } else if (order.status !== orderStatus && p.status === "captured") {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: "PAID", updatedAt: paymentDate }
          });
        }

        let dbStatus = "FAILED";
        if (p.status === "captured") dbStatus = "CAPTURED";
        else if (p.status === "refunded") dbStatus = "REFUNDED";
        else if (p.status === "authorized") dbStatus = "AUTHORIZED";

        const existingPayment = await prisma.payment.findFirst({
          where: { razorpayPaymentId: p.id }
        });

        if (existingPayment) {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: {
              status: dbStatus,
              failureCode: p.error_code || null,
              failureReason: p.error_description || (dbStatus === "FAILED" ? "Bank Declined" : null),
              updatedAt: paymentDate
            }
          });
        } else {
          await prisma.payment.create({
            data: {
              orderId: order.id,
              razorpayPaymentId: p.id,
              amount: amount,
              currency: p.currency || "INR",
              method: (p.method || "netbanking").toLowerCase(),
              status: dbStatus,
              failureCode: p.error_code || null,
              failureReason: p.error_description || (dbStatus === "FAILED" ? "Bank Declined" : null),
              createdAt: paymentDate,
              updatedAt: paymentDate
            }
          });
        }

        // Live Autonomous Recovery Interception:
        if (dbStatus === "CAPTURED") {
          // If this payment succeeded, mark any pending recovery case as recovered
          await prisma.recoveryCase.updateMany({
            where: { orderId: order.id, status: { notIn: ["RECOVERED", "STOPPED"] } },
            data: { status: "RECOVERED", resolvedAt: paymentDate }
          });
        } else if (dbStatus === "FAILED") {
          const existingCase = await prisma.recoveryCase.findFirst({
            where: { orderId: order.id }
          });
          if (!existingCase) {
            const riskReason = (p.error_code || "").includes("BAD_REQUEST") ? "BAD_REQUEST_ERROR" : "GATEWAY_TIMEOUT";
            const prob = 0.70;
            const oppScore = 75;
            const recCase = await prisma.recoveryCase.create({
              data: {
                storeId,
                customerId: customer.id,
                orderId: order.id,
                riskAmount: amount,
                riskReason,
                riskType: "PAYMENT_FAILURE",
                recoveryProbability: prob,
                opportunityScore: oppScore,
                status: "DETECTED"
              }
            });
            await prisma.aIDecision.create({
              data: {
                recoveryCaseId: recCase.id,
                modelVersion: "v1.2.0",
                diagnosis: `Payment attempt failed via ${p.method || "netbanking"}. Upstream response: ${p.error_description || "Bank Declined"}.`,
                reason: `Customer faced an upstream payment interruption. Automatic retry or alternative link has high counterfactual recovery probability.`,
                recommendedAction: "PAYMENT_LINK",
                recoveryProbability: prob,
                confidence: 0.88,
                recoveryOptions: {
                  create: [
                    {
                      actionType: "PAYMENT_LINK",
                      predictedProbability: 0.75,
                      predictedGrossRecovery: amount,
                      predictedIncentiveCost: 0,
                      predictedNetRecovery: Math.round(amount * 0.75),
                      reason: "High customer intent; immediate alternate payment link minimizes checkout friction.",
                      selected: true
                    },
                    {
                      actionType: "WHATSAPP_REMINDER",
                      predictedProbability: 0.55,
                      predictedGrossRecovery: amount,
                      predictedIncentiveCost: 0,
                      predictedNetRecovery: Math.round(amount * 0.55),
                      reason: "Delivers direct recovery link to customer messaging channel.",
                      selected: false
                    },
                    {
                      actionType: "NO_ACTION",
                      predictedProbability: 0.15,
                      predictedGrossRecovery: amount,
                      predictedIncentiveCost: 0,
                      predictedNetRecovery: Math.round(amount * 0.15),
                      reason: "Baseline natural return rate without intervention.",
                      selected: false
                    }
                  ]
                }
              }
            });
          }
        }
      }
    } catch (e) {
      console.error("Auto sync from Razorpay failed:", e);
    }
  },

  verifyWebhookSignature(body: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new Error("Razorpay webhook secret not configured.");

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature);
    const signatureBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  }
};
