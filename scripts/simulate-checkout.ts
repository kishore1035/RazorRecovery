import { PrismaClient } from "@prisma/client";
import Razorpay from "razorpay";

const prisma = new PrismaClient();

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

async function main() {
  console.log("Simulating a real checkout start...");

  const store = await prisma.store.findFirst();
  if (!store) throw new Error("No store found");

  // Create a real customer in DB
  const customer = await prisma.customer.create({
    data: {
      storeId: store.id,
      name: "Rahul Sharma",
      email: "rahul@example.com",
      phone: "+919876543210"
    }
  });

  // Create a real product in DB
  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      name: "Nike Air Max 270",
      sku: "NIKE-270",
      price: 2100000, // 21,000 INR in minor units (paise)
      currency: "INR",
      inventoryStatus: "IN_STOCK"
    }
  });

  // Create a Razorpay Order
  const rzpOrder = await rzp.orders.create({
    amount: 2100000,
    currency: "INR",
    receipt: `rcpt_${Date.now()}`,
    notes: { customer_id: customer.id }
  });

  console.log("Created Razorpay Order:", rzpOrder.id);

  // Sync to local DB
  const order = await prisma.order.create({
    data: {
      storeId: store.id,
      customerId: customer.id,
      razorpayOrderId: rzpOrder.id,
      status: "PAYMENT_PENDING",
      subtotal: 2100000,
      total: 2100000,
      currency: "INR"
    }
  });
  
  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: product.id,
      productNameSnapshot: product.name,
      quantity: 1,
      unitPrice: product.price
    }
  });

  const cart = await prisma.cart.create({
    data: {
      storeId: store.id,
      customerId: customer.id,
      status: "ACTIVE"
    }
  });

  await prisma.checkoutSession.create({
    data: {
      storeId: store.id,
      customerId: customer.id,
      cartId: cart.id,
      orderId: order.id,
      status: "PAYMENT_PENDING"
    }
  });

  console.log("✅ Checkout synced to local database.");
  
  console.log(`
=============================================
Now, create a payment link for this exact order to test it!

To generate a payment link connected to this exact order:
Run this script: npx tsx scripts/generate-payment-link.ts ${rzpOrder.id}
=============================================
`);
}

main().catch(console.error);
