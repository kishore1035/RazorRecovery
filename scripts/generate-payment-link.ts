import Razorpay from "razorpay";

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

async function main() {
  const orderId = process.argv[2];
  if (!orderId) {
    console.error("Please provide a Razorpay Order ID. Example: npx tsx scripts/generate-payment-link.ts order_XYZ");
    process.exit(1);
  }

  const order = await rzp.orders.fetch(orderId);

  const paymentLink = await rzp.paymentLink.create({
    amount: order.amount as number,
    currency: order.currency,
    accept_partial: false,
    description: "Checkout Payment",
    customer: {
      name: "Rahul Sharma",
      email: "rahul@example.com",
      contact: "+919876543210"
    },
    notify: {
      sms: false,
      email: false
    },
    reminder_enable: false,
    options: {
      checkout: {
        method: {
          netbanking: "1",
          card: "1",
          upi: "1",
          wallet: "1"
        }
      }
    }
    // We cannot attach order_id directly to a standard payment link, but Razorpay dashboard webhooks work better if we just fail a payment.
  });

  console.log("✅ Payment Link Created:");
  console.log(paymentLink.short_url);
  console.log("Open this URL, select UPI or Card, and INTENTIONALLY FAIL the payment.");
}

main().catch(console.error);
