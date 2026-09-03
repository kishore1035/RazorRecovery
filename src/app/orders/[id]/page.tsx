import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const order = await withTenant(async (merchantId) => {
    const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
    return prisma.order.findFirst({
      where: { id, storeId: { in: stores.map(s => s.id) } },
      include: {
        customer: true,
        items: true,
        payments: { orderBy: { createdAt: "desc" } }
      }
    });
  });
  
  if (!order) notFound();
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Order #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-slate-500 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          order.status === "PAID" ? "bg-green-100 text-green-800" :
          order.status === "FAILED" ? "bg-red-100 text-red-800" :
          "bg-yellow-100 text-yellow-800"
        }`}>
          {order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Customer Details</h2>
          <div>
            <Link href={`/customers/${order.customer.id}`} className="text-blue-600 font-medium hover:underline">
              {order.customer.name || "Guest"}
            </Link>
            <p className="text-sm text-slate-500 mt-1">{order.customer.email}</p>
            <p className="text-sm text-slate-500">{order.customer.phone}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Payment Attempts</h2>
          {order.payments.length === 0 ? (
            <p className="text-sm text-slate-500">Not connected to Razorpay yet (No attempts)</p>
          ) : (
            <ul className="space-y-3">
              {order.payments.map((payment) => (
                <li key={payment.id} className="text-sm flex justify-between">
                  <div>
                    <span className="font-medium text-slate-900">{payment.method}</span>
                    <span className="text-slate-500 ml-2">
                      {payment.razorpayPaymentId || "Not connected to Razorpay yet"}
                    </span>
                    {payment.failureReason && (
                      <p className="text-red-500 text-xs mt-0.5">Error: {payment.failureReason}</p>
                    )}
                  </div>
                  <span className={`font-medium ${payment.status === "CAPTURED" ? "text-green-600" : "text-slate-900"}`}>
                    {payment.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                  <Link href={`/products/${item.productId}`} className="hover:underline text-blue-600">
                    {item.productNameSnapshot}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">
                  ₹{(item.unitPrice / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">
                  {item.quantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium text-right">
                  ₹{((item.unitPrice * item.quantity) / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr>
              <th colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-slate-500">Subtotal</th>
              <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">₹{(order.subtotal / 100).toFixed(2)}</td>
            </tr>
            {order.tax > 0 && (
              <tr>
                <th colSpan={3} className="px-6 py-2 text-right text-sm font-medium text-slate-500">Tax</th>
                <td className="px-6 py-2 text-right text-sm font-medium text-slate-900">₹{(order.tax / 100).toFixed(2)}</td>
              </tr>
            )}
            <tr>
              <th colSpan={3} className="px-6 py-4 text-right text-sm font-bold text-slate-900">Total</th>
              <td className="px-6 py-4 text-right text-lg font-bold text-slate-900">₹{(order.total / 100).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
