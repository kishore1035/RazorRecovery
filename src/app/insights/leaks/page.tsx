import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";
import Link from "next/link";
import { HorizontalBarChart } from "@/components/charts/Charts";

export default async function RevenueLeaksPage() {
  const leaks = await withTenant(async (merchantId) => {
    const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
    return prisma.revenueLeak.findMany({
      where: { storeId: { in: stores.map(s => s.id) } },
      orderBy: { affectedRevenue: "desc" }
    });
  });

  const barItems = leaks.map(l => ({
    id: l.id,
    label: l.title,
    sublabel: l.type.replace(/_/g, " "),
    value: l.affectedRevenue,
    formattedValue: `₹${(l.affectedRevenue / 100).toLocaleString("en-IN")}`,
    secondaryValue: `Est. ₹${(l.estimatedRecoverableRevenue / 100).toLocaleString("en-IN")} recoverable`,
    color: l.severity === "CRITICAL" ? "#ef4444" : "#f59e0b"
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Banner Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-red-100 text-red-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-red-200">
              Systemic Risk Diagnostic
            </span>
            <span className="text-xs text-slate-500">Ranked by Financial Impact</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Revenue Leak Explorer</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify WHAT is leaking revenue, HOW MUCH is affected, WHY it happens, and WHERE it occurs.
          </p>
        </div>
      </div>

      {/* Visual Impact Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue Impact Ranking</h2>
        <HorizontalBarChart items={barItems} />
      </div>

      {/* Structured Diagnostic Cards */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnostic Leaks Breakdown</h2>
        {leaks.length === 0 ? (
          <div className="bg-white p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            No active revenue leaks detected.
          </div>
        ) : (
          leaks.map(leak => (
            <div
              key={leak.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-4"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${leak.severity === "CRITICAL" ? "bg-red-500 animate-pulse" : "bg-amber-500"}`}></span>
                  <h3 className="text-lg font-bold text-slate-900">{leak.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {leak.type.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                    {(Number(leak.confidence ?? 0.8) * 100).toFixed(0)}% Confidence
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">WHAT</span>
                  <span className="font-bold text-slate-900 block">{leak.title}</span>
                  <span className="text-slate-500 block text-[11px] mt-0.5">{leak.description}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">HOW MUCH</span>
                  <span className="font-bold text-red-600 text-base block">
                    ₹{(leak.affectedRevenue / 100).toLocaleString("en-IN")}
                  </span>
                  <span className="text-green-700 text-[11px] block mt-0.5">
                    Est. ₹{(leak.estimatedRecoverableRevenue / 100).toLocaleString("en-IN")} recoverable
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">WHY & RECOMMENDED</span>
                  <span className="font-semibold text-slate-800 block">{leak.recommendedAction}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">WHERE & SEGMENT</span>
                  <span className="font-semibold text-slate-700 block">UPI / Mobile Checkouts</span>
                  <span className="text-slate-400 text-[10px] block mt-1">Status: {leak.status}</span>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Link
                  href="/insights/payment-health"
                  className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Investigate Payment Health →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
