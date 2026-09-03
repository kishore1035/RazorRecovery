import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";
import Link from "next/link";

export default async function CheckoutHealthPage() {
  const data = await withTenant(async (merchantId) => {
    const store = await prisma.store.findFirst({ where: { merchantId } });
    if (!store) return null;

    const totalSessions = await prisma.checkoutSession.count({ where: { storeId: store.id } });
    const completedSessions = await prisma.checkoutSession.count({ where: { storeId: store.id, status: "COMPLETED" } });
    const abandonedSessions = await prisma.checkoutSession.count({ where: { storeId: store.id, status: { in: ["ABANDONED", "PAYMENT_PENDING"] } } });

    const stages = [
      { name: "1. Cart Initiated", visitors: "100%", count: 124, dropRate: "12%" },
      { name: "2. Shipping Details", visitors: "88%", count: 109, dropRate: "18%" },
      { name: "3. Payment Method Selection", visitors: "70%", count: 87, dropRate: "24%" },
      { name: "4. Payment Gateway Authorization", visitors: "46%", count: 57, dropRate: "14%" },
      { name: "5. Completed Purchases", visitors: "32%", count: 40, dropRate: "—" },
    ];

    return { totalSessions, completedSessions, abandonedSessions, stages };
  });

  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Checkout Health Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Funnel drop-off and checkout abandonment trends across buyer journey milestones.
          </p>
        </div>
        <Link href="/insights" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Insights Engine
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Conversion</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">32.2%</p>
          <p className="text-xs text-slate-500 mt-2">Cart to captured payment</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Abandonment Hotspot</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">Payment Step</p>
          <p className="text-xs text-slate-500 mt-2">24% drop at gateway selection</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recoverable Carts</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">₹47,100</p>
          <p className="text-xs text-slate-500 mt-2">Estimated 30-day opportunity</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-sm font-semibold text-slate-900">Checkout Funnel Drop-off Velocity</h2>
        </div>
        <div className="p-6 space-y-4">
          {data.stages.map((st, idx) => (
            <div key={st.name} className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>{st.name}</span>
                <span className="text-slate-500">{st.count} sessions ({st.visitors}) • Step Drop: {st.dropRate}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${idx === 4 ? 'bg-green-600' : 'bg-slate-800'}`}
                  style={{ width: st.visitors }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
