/**
 * SMSService — Send SMS notifications for payment failures and recovery links
 *
 * Supports:
 * - Twilio (primary provider)
 * - Generic HTTP SMS provider (custom)
 * - Built-in Simulator / Console mode (default when provider credentials are not set)
 *
 * Configuration in .env:
 * SMS_PROVIDER=twilio|http|simulation
 * TWILIO_ACCOUNT_SID=xxx
 * TWILIO_AUTH_TOKEN=xxx
 * TWILIO_PHONE_NUMBER=+1234567890
 * SMS_BASE_URL= (for custom HTTP provider)
 */

import { prisma } from "./db";

export interface SMSOptions {
  phoneNumber: string;
  message: string;
  customerId?: string;
  recoveryCaseId?: string;
}

export interface PaymentFailureSMSOptions {
  customerName: string;
  phoneNumber: string;
  amount: number; // in paise
  productName: string;
  failureReason?: string | null;
  paymentLinkUrl?: string | null;
  appBaseUrl?: string | null;
  customerId?: string | null;
  recoveryCaseId?: string | null;
}

export interface RecoverySMSOptions {
  customerName: string;
  phoneNumber: string;
  amount: number; // in paise
  discountPercent?: number | null;
  discountAmount?: number | null; // in paise
  recoveryLinkUrl?: string | null;
  appBaseUrl?: string | null;
  customerId?: string | null;
  recoveryCaseId?: string | null;
}

/**
 * Builds motivational payment failure message styled after Razorpay recovery SMS
 */
export function buildPaymentFailureMessage(opts: PaymentFailureSMSOptions): string {
  const amountRs = (opts.amount / 100).toLocaleString("en-IN");
  const name =
    opts.customerName && opts.customerName.trim() && opts.customerName !== "Customer"
      ? opts.customerName.trim()
      : "there";
  const product = opts.productName || "your items";

  let msg = `Oh no, ${name}! 😔 We just saw your payment of ₹${amountRs} for "${product}" failed.\n\n`;
  msg += `Don't worry, your order is safely reserved! We'd love to help you complete your purchase so you don't miss out. 🛍️\n\n`;

  if (opts.paymentLinkUrl) {
    msg += `👉 To try again and complete your purchase, click this link:\n${opts.paymentLinkUrl}\n\n`;
  }

  msg += `⚡ Fast & secure 1-click checkout. Let's get this delivered to you!`;
  return msg;
}

/**
 * Builds recovery SMS message with incentive/discount link
 */
export function buildRecoveryActionMessage(opts: RecoverySMSOptions): string {
  const amountRs = (opts.amount / 100).toLocaleString("en-IN");
  const discountRs = opts.discountAmount
    ? (opts.discountAmount / 100).toLocaleString("en-IN")
    : null;
  const name =
    opts.customerName && opts.customerName.trim() && opts.customerName !== "Customer"
      ? opts.customerName.trim()
      : "there";

  let msg = `Hey ${name}! 🎁`;
  if (discountRs) {
    msg += ` We saved ₹${discountRs} off for you!\n\n`;
  } else {
    msg += ` Your reserved items are waiting!\n\n`;
  }

  msg += `We created an exclusive 1-click recovery link for your ₹${amountRs} purchase.`;

  if (discountRs && opts.discountPercent) {
    msg += `\n💳 Special ${opts.discountPercent}% discount has been applied!`;
  }

  msg += `\n\n`;
  if (opts.recoveryLinkUrl) {
    msg += `👉 Tap to complete your order:\n${opts.recoveryLinkUrl}\n\n`;
  }

  msg += `⏳ Link valid for 24 hours only. Don't miss out!`;
  return msg;
}

/**
 * Prints formatted SMS preview to console for development / demonstration
 */
function logSimulatedSMS(phoneNumber: string, message: string): void {
  console.log(`\n┌────────────────── 📱 SMS DISPATCHED (SIMULATOR) ──────────────────┐`);
  console.log(`│ Recipient: ${phoneNumber.padEnd(53)} │`);
  console.log(`├──────────────────────────────────────────────────────────────────┤`);
  for (const line of message.split("\n")) {
    console.log(`│ ${line.padEnd(64)} │`);
  }
  console.log(`└──────────────────────────────────────────────────────────────────┘\n`);
}

async function sendTwilioSMS(phoneNumber: string, message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return false;
  }

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const body = new URLSearchParams({
      From: fromNumber,
      To: phoneNumber,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    if (!response.ok) {
      console.error(`[SMSService] Twilio failed: ${response.status} ${await response.text()}`);
      return false;
    }

    const data = await response.json();
    console.log(`[SMSService] SMS sent via Twilio → ${phoneNumber} | SID: ${data.sid}`);
    return true;
  } catch (err) {
    console.error("[SMSService] Twilio error:", err);
    return false;
  }
}

async function sendHTTPSMS(phoneNumber: string, message: string): Promise<boolean> {
  const baseUrl = process.env.SMS_BASE_URL;
  if (!baseUrl) {
    return false;
  }

  try {
    const response = await fetch(`${baseUrl}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
      }),
    });

    if (!response.ok) {
      console.error(`[SMSService] HTTP SMS failed: ${response.status}`);
      return false;
    }

    console.log(`[SMSService] SMS sent via HTTP → ${phoneNumber}`);
    return true;
  } catch (err) {
    console.error("[SMSService] HTTP SMS error:", err);
    return false;
  }
}

async function dispatchSMS(
  phoneNumber: string,
  message: string,
  meta?: { customerId?: string | null; recoveryCaseId?: string | null }
): Promise<{ success: boolean; provider: string }> {
  if (!phoneNumber) {
    console.warn("[SMSService] No phone number provided — skipping SMS");
    return { success: false, provider: "NONE" };
  }

  const configuredProvider = (process.env.SMS_PROVIDER || "twilio").toLowerCase();
  let delivered = false;
  let providerUsed = "SIMULATED";

  if (configuredProvider === "twilio") {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      delivered = await sendTwilioSMS(phoneNumber, message);
      providerUsed = "TWILIO";
    } else {
      console.log("[SMSService] Twilio credentials not configured — using simulated delivery");
      logSimulatedSMS(phoneNumber, message);
      delivered = true;
      providerUsed = "SIMULATED";
    }
  } else if (configuredProvider === "http") {
    if (process.env.SMS_BASE_URL) {
      delivered = await sendHTTPSMS(phoneNumber, message);
      providerUsed = "HTTP";
    } else {
      console.log("[SMSService] SMS_BASE_URL not configured — using simulated delivery");
      logSimulatedSMS(phoneNumber, message);
      delivered = true;
      providerUsed = "SIMULATED";
    }
  } else {
    logSimulatedSMS(phoneNumber, message);
    delivered = true;
    providerUsed = "SIMULATED";
  }

  // Audit trail: persist notification record in DB if customerId & caseId are provided
  if (meta?.customerId && meta?.recoveryCaseId) {
    try {
      await prisma.notification.create({
        data: {
          recoveryCaseId: meta.recoveryCaseId,
          customerId: meta.customerId,
          channel: "SMS",
          message,
          status: delivered ? "SENT" : "FAILED",
          provider: providerUsed,
          providerMessageId: `sms_${Date.now()}`,
          deliveryStatus: providerUsed === "SIMULATED" ? "SIMULATED" : (delivered ? "DELIVERED" : "FAILED"),
          sentAt: new Date(),
        },
      });
    } catch (dbErr) {
      console.warn("[SMSService] Could not persist notification to DB:", dbErr);
    }
  }

  return { success: delivered, provider: providerUsed };
}

export const SMSService = {
  /**
   * Send SMS notification when payment fails
   * Includes motivational text to encourage retry + retry link
   */
  async paymentFailed(opts: PaymentFailureSMSOptions): Promise<{ success: boolean; message: string; provider: string }> {
    if (!opts.phoneNumber) {
      return { success: false, message: "", provider: "NONE" };
    }

    const message = buildPaymentFailureMessage(opts);
    console.log(`[SMSService] Dispatching payment failure motivational SMS to ${opts.phoneNumber}`);
    const result = await dispatchSMS(opts.phoneNumber, message, {
      customerId: opts.customerId,
      recoveryCaseId: opts.recoveryCaseId,
    });

    return { ...result, message };
  },

  /**
   * Send SMS notification with recovery link (discount/voucher)
   */
  async recoveryAction(opts: RecoverySMSOptions): Promise<{ success: boolean; message: string; provider: string }> {
    if (!opts.phoneNumber) {
      return { success: false, message: "", provider: "NONE" };
    }

    const message = buildRecoveryActionMessage(opts);
    console.log(`[SMSService] Dispatching recovery offer SMS to ${opts.phoneNumber}`);
    const result = await dispatchSMS(opts.phoneNumber, message, {
      customerId: opts.customerId,
      recoveryCaseId: opts.recoveryCaseId,
    });

    return { ...result, message };
  },

  /**
   * Send success SMS after payment recovered
   */
  async paymentRecovered(opts: {
    customerName: string;
    phoneNumber: string;
    amount: number;
    incentiveAmount?: number;
    customerId?: string;
    recoveryCaseId?: string;
  }): Promise<{ success: boolean; message: string; provider: string }> {
    if (!opts.phoneNumber) {
      return { success: false, message: "", provider: "NONE" };
    }

    const amountRs = (opts.amount / 100).toLocaleString("en-IN");
    const incentiveRs = opts.incentiveAmount
      ? (opts.incentiveAmount / 100).toLocaleString("en-IN")
      : null;
    const name = opts.customerName || "Customer";

    let message = `✅ Payment Confirmed, ${name}!\n\n`;
    message += `Your purchase of ₹${amountRs} was completed successfully. Your order is confirmed!`;

    if (incentiveRs) {
      message += `\n💰 You saved ₹${incentiveRs} with our special recovery offer!`;
    }

    message += `\n\nThank you for shopping with us! 🙏`;

    console.log(`[SMSService] Dispatching payment confirmation SMS to ${opts.phoneNumber}`);
    const result = await dispatchSMS(opts.phoneNumber, message, {
      customerId: opts.customerId,
      recoveryCaseId: opts.recoveryCaseId,
    });

    return { ...result, message };
  },

  /**
   * Generic SMS send
   */
  async send(opts: SMSOptions): Promise<{ success: boolean; provider: string }> {
    return dispatchSMS(opts.phoneNumber, opts.message, {
      customerId: opts.customerId,
      recoveryCaseId: opts.recoveryCaseId,
    });
  },
};
