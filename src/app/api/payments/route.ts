import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "all";
    const statusFilter = searchParams.get("status") || "ALL";
    const methodFilter = searchParams.get("method") || "ALL";
    const dateRange = searchParams.get("dateRange") || "all";
    const search = (searchParams.get("search") || "").trim();
    const searchField = searchParams.get("searchField") || "paymentId";

    const data = await withTenant(async (merchantId) => {
      const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
      const storeIds = stores.map((s) => s.id);

      // Date range filter
      let dateCondition: any = {};
      const now = new Date();
      if (dateRange === "today") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateCondition = { gte: startOfDay };
      } else if (dateRange === "7d") {
        const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateCondition = { gte: start7d };
      } else if (dateRange === "30d") {
        const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateCondition = { gte: start30d };
      }

      // Fetch all payments for store
      const payments = await prisma.payment.findMany({
        where: {
          order: {
            storeId: { in: storeIds },
          },
          ...(Object.keys(dateCondition).length > 0 ? { createdAt: dateCondition } : {}),
        },
        include: {
          order: {
            include: {
              customer: true,
              items: true,
              recoveryCases: {
                select: { id: true, status: true },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Calculate tab counts before filtering by active tab/status
      const tabCounts = {
        all: payments.length,
        created: payments.filter((p) => p.status === "CREATED").length,
        captured: payments.filter((p) => p.status === "CAPTURED" || p.status === "AUTHORIZED").length,
        refunded: payments.filter((p) => p.status === "REFUNDED").length,
        failed: payments.filter((p) => p.status === "FAILED").length,
      };

      // Filter by Tab
      let filtered = payments;
      if (tab === "created") {
        filtered = filtered.filter((p) => p.status === "CREATED");
      } else if (tab === "captured") {
        filtered = filtered.filter((p) => p.status === "CAPTURED" || p.status === "AUTHORIZED");
      } else if (tab === "refunded") {
        filtered = filtered.filter((p) => p.status === "REFUNDED");
      } else if (tab === "failed") {
        filtered = filtered.filter((p) => p.status === "FAILED");
      }

      // Filter by Status Dropdown
      if (statusFilter !== "ALL") {
        filtered = filtered.filter((p) => p.status.toUpperCase() === statusFilter.toUpperCase());
      }

      // Filter by Method Dropdown
      if (methodFilter !== "ALL") {
        filtered = filtered.filter(
          (p) => (p.method || "UNKNOWN").toUpperCase() === methodFilter.toUpperCase()
        );
      }

      // Filter by Search Query
      if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter((p) => {
          const rzpId = (p.razorpayPaymentId || "").toLowerCase();
          const internalId = p.id.toLowerCase();
          const orderId = p.orderId.toLowerCase();
          const phone = (p.order.customer?.phone || "").toLowerCase();
          const email = (p.order.customer?.email || "").toLowerCase();
          const name = (p.order.customer?.name || "").toLowerCase();

          if (searchField === "paymentId") {
            return rzpId.includes(query) || internalId.includes(query);
          } else if (searchField === "phone") {
            return phone.includes(query);
          } else if (searchField === "email") {
            return email.includes(query);
          } else if (searchField === "orderId") {
            return orderId.includes(query);
          } else {
            // "all"
            return (
              rzpId.includes(query) ||
              internalId.includes(query) ||
              orderId.includes(query) ||
              phone.includes(query) ||
              email.includes(query) ||
              name.includes(query)
            );
          }
        });
      }

      const formatted = filtered.map((p) => {
        // Pretty failure reason logic matching Razorpay dashboard strings
        let displayStatus = p.status;
        let failureDisplay = p.failureReason || p.failureCode || null;

        if (p.status === "FAILED") {
          const raw = (p.failureReason || p.failureCode || "").toLowerCase();
          if (p.failureCode === "GATEWAY_ERROR" || raw.includes("gateway") || raw.includes("technical")) {
            failureDisplay = "Gateway Error";
          } else if (p.failureCode === "CUSTOMER_CANCELLED" || raw.includes("cancel")) {
            failureDisplay = "Payment Cancelled";
          } else if (raw.includes("declined") || raw.includes("bank")) {
            failureDisplay = "Bank Declined";
          } else if (raw.includes("timeout") || raw.includes("timed out") || p.failureCode === "BAD_REQUEST_PAYMENT_TIMED_OUT") {
            failureDisplay = "Timeout";
          } else if (p.failureReason && p.failureReason.length > 22) {
            failureDisplay = p.failureReason.slice(0, 22) + "…";
          } else {
            failureDisplay = p.failureReason || "Payment Failed";
          }
        }

        return {
          id: p.id,
          razorpayPaymentId: p.razorpayPaymentId || `pay_${p.id.slice(0, 14)}`,
          orderId: p.orderId,
          amount: p.amount,
          currency: p.currency,
          method: p.method || "Netbanking",
          status: p.status,
          failureCode: p.failureCode,
          failureReason: failureDisplay,
          rawFailureReason: p.failureReason || p.failureCode || null,
          createdAt: p.createdAt,
          customer: {
            id: p.order.customer.id,
            name: p.order.customer.name || "Customer",
            phone: p.order.customer.phone || "NA",
            email: p.order.customer.email || "NA",
          },
          orderItem: p.order.items[0]?.productNameSnapshot || "Order Item",
          recoveryCase: p.order.recoveryCases[0] || null,
        };
      });

      return {
        payments: formatted,
        counts: tabCounts,
        total: formatted.length,
      };
    });

    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("Fetch payments failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
