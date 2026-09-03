/**
 * NtfyService — Real mobile push notifications via ntfy.sh
 *
 * HOW TO RECEIVE NOTIFICATIONS:
 * 1. Install "ntfy" app on iOS or Android (https://ntfy.sh)
 * 2. Subscribe to your topic: set NTFY_TOPIC in .env (e.g. "razorrecovery-merchant-abc")
 * 3. In the app, tap "+" and enter your topic name → you'll get real push notifications
 *
 * No API key required. Uses the free public server at https://ntfy.sh
 */

const NTFY_BASE = process.env.NTFY_BASE_URL || "https://ntfy.sh";
const NTFY_TOPIC = process.env.NTFY_TOPIC || "razorrecovery-default";

export type NtfyPriority = "max" | "high" | "default" | "low" | "min";

export interface NtfyMessage {
  title: string;
  message: string;
  priority?: NtfyPriority;
  tags?: string[];
  actionUrl?: string;
  actionLabel?: string;
}

export const NtfyService = {
  async send(msg: NtfyMessage): Promise<boolean> {
    if (!NTFY_TOPIC || NTFY_TOPIC === "razorrecovery-default") {
      // No topic configured — log and skip gracefully, don't crash the flow
      console.warn("[NtfyService] NTFY_TOPIC not configured in .env — skipping push notification");
      return false;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "text/plain; charset=utf-8",
        "Title": msg.title,
        "Priority": msg.priority || "high",
        "Tags": (msg.tags || []).join(","),
      };

      // Add click action if URL provided
      if (msg.actionUrl) {
        headers["Actions"] = `view, ${msg.actionLabel || "Open"}, ${msg.actionUrl}`;
        headers["Click"] = msg.actionUrl;
      }

      const res = await fetch(`${NTFY_BASE}/${NTFY_TOPIC}`, {
        method: "POST",
        headers,
        body: msg.message,
      });

      if (!res.ok) {
        console.error(`[NtfyService] Push failed: ${res.status} ${await res.text()}`);
        return false;
      }

      console.log(`[NtfyService] Push sent → topic=${NTFY_TOPIC} | ${msg.title}`);
      return true;
    } catch (err) {
      console.error("[NtfyService] Push error:", err);
      return false;
    }
  },

  /** Payment failed — alert merchant immediately */
  async paymentFailed(opts: {
    customerName: string;
    productName: string;
    amount: number;
    method: string;
    caseId: string;
    appBaseUrl?: string;
  }) {
    const amountRs = (opts.amount / 100).toLocaleString("en-IN");
    return this.send({
      title: `Payment Failed — ₹${amountRs}`,
      message: `${opts.customerName || "Customer"} failed to pay ₹${amountRs} for "${opts.productName || "order"}". Method: ${opts.method || "unknown"}. Recovery AI is analyzing now.`,
      priority: "high",
      tags: ["x", "rotating_light"],
      actionUrl: opts.appBaseUrl ? `${opts.appBaseUrl}/recoveries/${opts.caseId}` : undefined,
      actionLabel: "Review Journey",
    });
  },

  /** Recovery action dispatched — SMS/link sent to customer */
  async recoveryActionDispatched(opts: {
    customerName: string;
    actionType: string;
    amount: number;
    caseId: string;
    appBaseUrl?: string;
  }) {
    const amountRs = (opts.amount / 100).toLocaleString("en-IN");
    return this.send({
      title: `Recovery Action Sent — ₹${amountRs}`,
      message: `RazorRecovery dispatched "${opts.actionType.replace(/_/g, " ")}" to ${opts.customerName || "customer"} for ₹${amountRs}.`,
      priority: "default",
      tags: ["envelope"],
      actionUrl: opts.appBaseUrl ? `${opts.appBaseUrl}/recoveries/${opts.caseId}` : undefined,
      actionLabel: "View Case",
    });
  },

  /** Payment recovered — celebrate! */
  async paymentRecovered(opts: {
    customerName: string;
    grossAmount: number;
    netAmount: number;
    incentiveCost: number;
    caseId: string;
    appBaseUrl?: string;
  }) {
    const grossRs = (opts.grossAmount / 100).toLocaleString("en-IN");
    const netRs = (opts.netAmount / 100).toLocaleString("en-IN");
    return this.send({
      title: `Payment Recovered! ₹${netRs} Net`,
      message: `Gross: ₹${grossRs} | Incentive cost: ₹${(opts.incentiveCost / 100).toLocaleString("en-IN")} | NET RECOVERED: ₹${netRs}. Customer: ${opts.customerName || "Customer"}.`,
      priority: "max",
      tags: ["white_check_mark", "money_with_wings"],
      actionUrl: opts.appBaseUrl ? `${opts.appBaseUrl}/recoveries/${opts.caseId}` : undefined,
      actionLabel: "See Audit",
    });
  },

  /** New checkout order created — merchant awareness */
  async checkoutCreated(opts: {
    customerName: string;
    productName: string;
    amount: number;
    appBaseUrl?: string;
  }) {
    const amountRs = (opts.amount / 100).toLocaleString("en-IN");
    return this.send({
      title: `New Checkout — ₹${amountRs}`,
      message: `${opts.customerName || "Customer"} started checkout for "${opts.productName}" (₹${amountRs}). Awaiting payment.`,
      priority: "low",
      tags: ["shopping_cart"],
    });
  }
};
