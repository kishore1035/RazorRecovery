import { NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";
import { NtfyService } from "@/lib/ntfy";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      amount,          // in rupees (string or number)
      description,
      customerEmail,
      customerPhone,
      notifySms = true,
      notifyEmail = false,
      expireByDate,    // ISO date string or null
      referenceId
    } = body;

    if (!amount || !customerPhone) {
      return NextResponse.json({ error: "Amount and customer phone are required" }, { status: 400 });
    }

    const amountInPaise = Math.round(parseFloat(String(amount)) * 100);
    if (isNaN(amountInPaise) || amountInPaise < 100) {
      return NextResponse.json({ error: "Amount must be at least ₹1" }, { status: 400 });
    }

    const rzp = getRazorpayClient();

    const expireBy = expireByDate ? Math.floor(new Date(expireByDate).getTime() / 1000) : undefined;

    // Create the payment link directly via Razorpay (no order needed for standalone links)
    const rzpLink = await rzp.paymentLink.create({
      amount: amountInPaise,
      currency: "INR",
      accept_partial: false,
      description: description || "Payment Link",
      customer: {
        email: customerEmail || undefined,
        contact: customerPhone
      },
      notify: {
        sms: notifySms,
        email: notifyEmail
      },
      reminder_enable: true,
      reference_id: (referenceId || `rr_${Date.now()}`).slice(0, 40),
      ...(expireBy ? { expire_by: expireBy } : {})
    } as any);

    // Note: PaymentLink DB record requires an orderId (FK to Order).
    // Standalone links (not tied to a recovery case) are returned directly
    // from Razorpay without a local DB record — the link is real and functional.

    // Merchant push notification
    NtfyService.send({
      title: `Payment Link Created — ₹${amount}`,
      message: `A payment link for ₹${amount} was sent to ${customerPhone}${notifySms ? " via SMS" : ""}. Link: ${rzpLink.short_url}`,
      priority: "default",
      tags: ["link"],
      actionUrl: rzpLink.short_url
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      shortUrl: rzpLink.short_url,
      razorpayLinkId: rzpLink.id,
      status: rzpLink.status
    });

  } catch (err: any) {
    console.error("Payment link creation failed:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
