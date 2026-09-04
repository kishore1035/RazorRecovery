import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";
import Link from "next/link";
import { InsightEngine } from "@/lib/insights";

export default async function InsightsPage() {
  const data = await withTenant(async (merchantId) => {
    const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
    const storeIds = stores.map(s => s.id);

    const mainStore = storeIds[0];
    const healthScore = mainStore ? await InsightEngine.getRevenueHealthScore(mainStore) : "Healthy";

    const activeLeaks = await prisma.revenueLeak.findMany({
      where: { storeId: { in: storeIds }, status: "ACTIVE" },
      orderBy: { affectedRevenue: "desc" }
    });

    const memories = await prisma.recoveryMemory.findMany({
      where: { storeId: { in: storeIds } },
      orderBy: { sampleSize: "desc" }
    });

    return { healthScore, activeLeaks, memories };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-zinc-800 text-zinc-100 text-xs px-2.5 py-0.5 rounded-full font-bold border border-zinc-700">
              Systemic Intelligence
            </span>
            <span className="text-xs text-slate-500">Evidence-Backed Financial Insights</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Revenue Insights Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured financial insights derived from payment health, funnel metrics, and empirical memory
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
            data.healthScore === "Critical" ? "bg-zinc-900 text-white border-zinc-900" : "bg-zinc-100 text-black border-zinc-300"
          }`}>
            Status: {data.healthScore}
          </span>
        </div>
      </div>

      {/* Sub-navigation Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/insights/leaks" className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-xs font-bold text-slate-900 flex justify-between items-center shadow-2xs">
          <span>Revenue Leaks ({data.activeLeaks.length})</span>
          <span className="text-zinc-600 group-hover:text-black">Explore →</span>
        </Link>
        <Link href="/insights/payment-health" className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-xs font-bold text-slate-900 flex justify-between items-center shadow-2xs">
          <span>Payment Health</span>
          <span className="text-zinc-600 group-hover:text-black">Monitor →</span>
        </Link>
        <Link href="/insights/checkout-health" className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-xs font-bold text-slate-900 flex justify-between items-center shadow-2xs">
          <span>Checkout Funnel</span>
          <span className="text-zinc-600 group-hover:text-black">Track →</span>
        </Link>
        <Link href="/insights/memory" className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-xs font-bold text-slate-900 flex justify-between items-center shadow-2xs">
          <span>Recovery Memory ({data.memories.length})</span>
          <span className="text-zinc-600 group-hover:text-black">Learn →</span>
        </Link>
      </div>

      {/* Structured Insight Cards */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Systemic Insights</h2>

        {data.activeLeaks.length === 0 && data.memories.length === 0 ? (
          <div className="bg-white p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            No active revenue degradation or systemic insights detected yet.
          </div>
        ) : (
          <div className="space-y-4">
            {data.activeLeaks.map(leak => (
              <div key={leak.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Active Revenue Risk</span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">{leak.title}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-black border border-zinc-300">
                    {isNaN(Number(leak.confidence)) ? leak.confidence : `${Math.round(Number(leak.confidence || 0.8) * 100)}%`} Confidence
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Financial Impact</span>
                    <span className="font-bold text-slate-900 text-base block">
                      ₹{(leak.affectedRevenue / 100).toLocaleString("en-IN")}
                    </span>
                    <span className="text-slate-500 text-[11px] block">Est. ₹{(leak.estimatedRecoverableRevenue / 100).toLocaleString("en-IN")} recoverable</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Evidence</span>
                    <span className="font-medium text-slate-700 block">{leak.description}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Affected Segment</span>
                    <span className="font-semibold text-slate-800 block">UPI / Mobile Checkout</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Recommended Action</span>
                    <span className="font-semibold text-slate-800 block">{leak.recommendedAction}</span>
                  </div>
                </div>
              </div>
            ))}

            {data.memories.map(mem => (
              <div key={mem.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Empirical Recovery Memory</span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      Segment: {mem.segmentKey} ({mem.segmentType})
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {mem.confidence} Confidence ({mem.sampleSize} samples)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Optimal Strategy</span>
                    <span className="font-bold text-slate-900 text-sm block">{mem.intervention.replace(/_/g, " ")}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Recovery Rate</span>
                    <span className="font-bold text-slate-900 text-sm block">{(mem.recoveryRate * 100).toFixed(0)}%</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Avg Net Recovered</span>
                    <span className="font-bold text-slate-900 text-sm block">
                      ₹{mem.recoveries > 0 ? (mem.netRecovered / mem.recoveries / 100).toFixed(2) : "0.00"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Empirical Synthesis</span>
                    <span className="font-medium text-slate-700 block italic">
                      "{mem.intervention} has achieved {(mem.recoveryRate * 100).toFixed(0)}% conversion rate across {mem.sampleSize} historical attempts."
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
