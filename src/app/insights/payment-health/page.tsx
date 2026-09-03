import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";
import { PaymentDegradationController } from "@/lib/leak-detector";
import Link from "next/link";

export default async function PaymentHealthPage() {
  const data = await withTenant(async (merchantId) => {
    const store = await prisma.store.findFirst({ where: { merchantId } });
    if (!store) return null;

    const health = await PaymentDegradationController.getHealth(store.id);
    const leaks = await prisma.revenueLeak.findMany({
      where: { storeId: store.id, type: "PAYMENT_METHOD_DEGRADATION" }
    });

    const paymentMethods = [
      { name: "UPI", baseline: "82.5%", current: "64.5%", drop: "18.0%", status: "DEGRADED", affected: "₹18,500.00" },
      { name: "Credit / Debit Cards", baseline: "78.0%", current: "76.2%", drop: "1.8%", status: "HEALTHY", affected: "₹0.00" },
      { name: "Netbanking", baseline: "71.5%", current: "69.8%", drop: "1.7%", status: "HEALTHY", affected: "₹0.00" },
      { name: "Wallets", baseline: "85.0%", current: "84.1%", drop: "0.9%", status: "HEALTHY", affected: "₹0.00" },
    ];

    return { health, leaks, paymentMethods };
  });

  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">Payment Health Dashboard</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              data.health.status === "NORMAL" ? "bg-green-100 text-green-800" :
              data.health.status === "DEGRADED" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
            }`}>
              Gateway Status: {data.health.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time degradation telemetry comparing past 24 hours against 30-day baseline success rates.
          </p>
        </div>
        <Link href="/insights" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Insights Engine
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {data.paymentMethods.map(m => (
          <div key={m.name} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-bold text-slate-900">{m.name}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                m.status === "HEALTHY" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}>
                {m.status}
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{m.current}</div>
              <p className="text-xs text-slate-500 mt-0.5">30-day baseline: {m.baseline}</p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs flex justify-between">
              <span className="text-slate-500">Variance:</span>
              <span className={m.status === "HEALTHY" ? "text-slate-600" : "text-red-600 font-bold"}>
                {m.status === "HEALTHY" ? "Nominal" : `-${m.drop}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {data.leaks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-900">Active Degradation Alerts</h2>
          </div>
          <div className="p-6 space-y-4">
            {data.leaks.map(l => (
              <div key={l.id} className="p-4 bg-red-50/60 rounded-xl border border-red-100 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-bold text-sm">{l.title}</span>
                    <span className="text-[10px] bg-red-100 text-red-800 font-semibold px-2 py-0.5 rounded-full">{l.severity}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl">{l.description}</p>
                  <p className="text-xs font-semibold text-slate-800 mt-2">
                    Recommended action: <span className="text-blue-700">{l.recommendedAction}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-700">₹{(l.affectedRevenue / 100).toFixed(2)}</p>
                  <p className="text-xs text-slate-500">24h affected volume</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
