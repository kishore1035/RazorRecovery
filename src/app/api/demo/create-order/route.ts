import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Razorpay from "razorpay";
import { NtfyService } from "@/lib/ntfy";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerName, customerEmail, customerPhone, productTitle, amountInRupees } = body;

    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!
    });

    const store = await prisma.store.findFirst();
    if (!store) throw new Error("No store found");

    const customer = await prisma.customer.create({
      data: {
        storeId: store.id,
        name: customerName,
        email: customerEmail,
        phone: customerPhone
      }
    });

    const amountInPaise = Math.round(parseFloat(amountInRupees) * 100);

    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        name: productTitle,
        sku: `SKU-${Date.now()}`,
        price: amountInPaise,
        currency: "INR",
        inventoryStatus: "IN_STOCK"
      }
    });

    const rzpOrder = await rzp.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { customer_id: customer.id }
    });

    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        razorpayOrderId: rzpOrder.id,
        status: "PAYMENT_PENDING",
        subtotal: amountInPaise,
        total: amountInPaise,
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
      data: { storeId: store.id, customerId: customer.id, status: "ACTIVE" }
    });

    await prisma.checkoutSession.create({
      data: { storeId: store.id, customerId: customer.id, cartId: cart.id, orderId: order.id, status: "PAYMENT_PENDING" }
    });

    // Real mobile push — merchant sees new checkout started (like Razorpay order notification)
    NtfyService.checkoutCreated({
      customerName: customerName,
      productName: productTitle,
      amount: amountInPaise,
      appBaseUrl: process.env.NEXT_PUBLIC_APP_URL
    }).catch(console.error);

    return NextResponse.json({ success: true, razorpayOrderId: rzpOrder.id, localOrderId: order.id, amountInPaise, productTitle });

  } catch (error: any) {
    console.error("Demo checkout creation failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
