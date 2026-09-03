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
