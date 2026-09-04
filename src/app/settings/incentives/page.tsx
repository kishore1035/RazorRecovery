import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { VoucherActionButtons } from "./VoucherActionButtons";

export default async function IncentivesPage() {
  const vouchers = await withTenant(async (merchantId) => {
    const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
    return prisma.voucher.findMany({
      where: { storeId: { in: stores.map(s => s.id) } },
      orderBy: { createdAt: "desc" }
    });
  });

  async function toggleVoucher(id: string, currentStatus: string) {
    "use server";
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    await prisma.voucher.update({ where: { id }, data: { status: newStatus } });
    revalidatePath("/settings/incentives");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Incentives & Vouchers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage discounts AI can offer during revenue recovery.</p>
        </div>
        <Link href="/settings/incentives/new" className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm hover:bg-slate-800">
          Create Voucher
        </Link>
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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    v.status === "ACTIVE" ? "bg-slate-900 text-white border-transparent" :
                    v.status === "PAUSED" ? "bg-slate-100 text-slate-700 border-transparent" :
                    v.status === "EXHAUSTED" ? "bg-white text-slate-900 border-slate-300" :
                    "bg-slate-100 text-slate-700 border-transparent"
                  }`}>
                    {v.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                  <VoucherActionButtons 
                    voucherId={v.id} 
                    status={v.status} 
                    onToggle={toggleVoucher} 
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
