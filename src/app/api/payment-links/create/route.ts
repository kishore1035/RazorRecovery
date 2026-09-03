import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRazorpayClient } from "@/lib/razorpay";
import { NtfyService } from "@/lib/ntfy";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      amount,          // in rupees (string or number)
      productTitle,    // product title / name
      productUrl,      // optional product link / URL
      description,     // optional payment description
      customerName,    // customer name
      customerEmail,   // customer email
      customerPhone,   // customer phone
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

    const cleanedPhone = String(customerPhone).trim();
    const resolvedCustomerName = customerName?.trim() || "Customer";
    const resolvedProductTitle = productTitle?.trim() || description?.trim() || "Custom Product";

    const store = await prisma.store.findFirst();
    if (!store) {
      return NextResponse.json({ error: "No store found in database" }, { status: 500 });
    }

    // 1. Find or create Customer record
    let customer = await prisma.customer.findFirst({
      where: {
        storeId: store.id,
        OR: [
          ...(customerEmail ? [{ email: String(customerEmail).trim() }] : []),
          ...(cleanedPhone ? [{ phone: cleanedPhone }] : [])
        ]
      }
    });

    if (customer) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: resolvedCustomerName,
          email: customerEmail ? String(customerEmail).trim() : customer.email,
          phone: cleanedPhone || customer.phone
        }
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          storeId: store.id,
          name: resolvedCustomerName,
          email: customerEmail ? String(customerEmail).trim() : null,
          phone: cleanedPhone || null
        }
      });
    }

    // 2. Create Product record
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        name: resolvedProductTitle,
        sku: `SKU-${Date.now()}`,
        price: amountInPaise,
        currency: "INR",
        productUrl: productUrl ? String(productUrl).trim() : null,
        inventoryStatus: "IN_STOCK"
      }
    });

    const rzp = getRazorpayClient();

    // 3. Create Razorpay Order
    const rzpOrder = await rzp.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        customer_id: customer.id,
        customer_name: resolvedCustomerName,
        product_title: resolvedProductTitle,
        product_url: productUrl ? String(productUrl).trim() : ""
      }
    });

    const expireBy = expireByDate ? Math.floor(new Date(expireByDate).getTime() / 1000) : undefined;
    const resolvedRefId = (referenceId?.trim() || `pl_${Date.now()}`).slice(0, 40);

    // 4. Create Razorpay Payment Link
    const rzpLink = await rzp.paymentLink.create({
      amount: amountInPaise,
      currency: "INR",
      accept_partial: false,
      description: description?.trim() || `Payment for ${resolvedProductTitle}`,
      customer: {
        name: resolvedCustomerName,
        email: customerEmail ? String(customerEmail).trim() : undefined,
        contact: cleanedPhone
      },
      notify: {
        sms: Boolean(notifySms),
        email: Boolean(notifyEmail)
      },
      reminder_enable: true,
      reference_id: resolvedRefId,
      notes: {
        customer_id: customer.id,
        order_id: rzpOrder.id,
        product_title: resolvedProductTitle,
        product_url: productUrl ? String(productUrl).trim() : ""
      },
      ...(expireBy ? { expire_by: expireBy } : {})
    } as any);

    // 5. Create Order in DB
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

    // 6. Create OrderItem in DB
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        productNameSnapshot: product.name,
        quantity: 1,
        unitPrice: product.price
      }
    });

    // 7. Create Cart & CheckoutSession in DB
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

    // 8. Create PaymentLink record in DB
    await prisma.paymentLink.create({
      data: {
        storeId: store.id,
        orderId: order.id,
        razorpayPaymentLinkId: rzpLink.id,
        shortUrl: rzpLink.short_url,
        amount: amountInPaise,
        currency: "INR",
        status: "CREATED",
        expiresAt: expireBy ? new Date(expireBy * 1000) : null,
        providerMetadata: JSON.stringify(rzpLink)
      }
    });

    // 9. Send push notifications
    NtfyService.checkoutCreated({
      customerName: resolvedCustomerName,
      productName: resolvedProductTitle,
      amount: amountInPaise,
      appBaseUrl: process.env.NEXT_PUBLIC_APP_URL
    }).catch(console.error);

    NtfyService.send({
      title: `Payment Link Created — ₹${(amountInPaise / 100).toFixed(2)}`,
      message: `Payment link for ${resolvedCustomerName} (₹${(amountInPaise / 100).toFixed(2)} - ${resolvedProductTitle}) created: ${rzpLink.short_url}`,
      priority: "default",
      tags: ["link"],
      actionUrl: rzpLink.short_url
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      shortUrl: rzpLink.short_url,
      razorpayLinkId: rzpLink.id,
      razorpayOrderId: rzpOrder.id,
      localOrderId: order.id,
      amountInPaise,
      productTitle: resolvedProductTitle,
      customerName: resolvedCustomerName,
      customerEmail: customerEmail ? String(customerEmail).trim() : "",
      customerPhone: cleanedPhone,
      productUrl: productUrl ? String(productUrl).trim() : "",
      status: rzpLink.status
    });

  } catch (err: any) {
    console.error("Payment link creation failed:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
