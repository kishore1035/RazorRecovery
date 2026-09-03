import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";

export default async function IncentivesPage() {
  const vouchers = await withTenant(async (merchantId) => {
    const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
    return prisma.voucher.findMany({
      where: { storeId: { in: stores.map(s => s.id) } },
      orderBy: { createdAt: "desc" }
    });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Incentives & Vouchers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage discounts AI can offer during revenue recovery.</p>
        </div>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm hover:bg-slate-800">
          Create Voucher
        </button>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Discount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Limits</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {vouchers.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">No vouchers created yet.</td></tr>
            )}
            {vouchers.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                  {v.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {v.discountType === "PERCENTAGE" ? `${v.discountValue}%` : `₹${(v.discountValue / 100).toFixed(2)}`}
                  {v.maximumDiscount ? <span className="block text-xs text-slate-400">Max ₹{(v.maximumDiscount / 100).toFixed(2)}</span> : null}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  Min: {v.minimumOrderValue ? `₹${(v.minimumOrderValue / 100).toFixed(2)}` : "None"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    v.status === "ACTIVE" ? "bg-green-100 text-green-800" :
                    v.status === "PAUSED" ? "bg-yellow-100 text-yellow-800" :
                    v.status === "EXHAUSTED" ? "bg-red-100 text-red-800" :
                    "bg-slate-100 text-slate-800"
                  }`}>
                    {v.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                  <button className="text-blue-600 hover:underline mr-4">Edit</button>
                  {v.status === "ACTIVE" ? (
                    <button className="text-yellow-600 hover:underline">Pause</button>
                  ) : (
                    <button className="text-green-600 hover:underline">Enable</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
