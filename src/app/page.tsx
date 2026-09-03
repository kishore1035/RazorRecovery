import { getAuthContext, withTenant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import {
  getRevenueHealthData,
  getRevenueRecoveryTrend,
  getStrategyPerformanceData,
  getPaymentHealthData
} from "@/lib/analytics";
import { LineChart, HorizontalBarChart, StrategyComparisonVisual } from "@/components/charts/Charts";

export default async function OverviewPage({
  searchParams
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const authContext = await getAuthContext();
  const params = await searchParams;
  const days = parseInt(params.days || "30", 10);

  if (!authContext) {
    return (
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 mx-auto mt-12">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <h1 className="text-2xl font-semibold text-black tracking-tight">Welcome back</h1>
          <p className="text-sm text-zinc-500 mt-2">Sign in to your RazorRecovery workspace</p>
        </div>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email address</label>
            <input type="email" className="w-full px-3 py-2 border border-zinc-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-700 sm:text-sm" placeholder="you@company.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <input type="password" className="w-full px-3 py-2 border border-zinc-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-700 sm:text-sm" placeholder="••••••••" />
          </div>
          <button type="button" className="w-full bg-zinc-800 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-zinc-700 transition-colors shadow-2xs text-sm">
            Sign In
          </button>
        </form>
      </div>
    );
  }

  const data = await withTenant(async (merchantId) => {
    const health = await getRevenueHealthData(merchantId, days);
    const trend = await getRevenueRecoveryTrend(merchantId, days);
    const strategyPerf = await getStrategyPerformanceData(merchantId);
    const paymentHealth = await getPaymentHealthData(merchantId);

    const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
    const storeIds = stores.map(s => s.id);

    const recentCases = await prisma.recoveryCase.findMany({
      where: { storeId: { in: storeIds } },
      include: {
        customer: true,
        order: { include: { items: true } },
        aiDecisions: { take: 1, orderBy: { createdAt: "desc" } },
        recoveryOutcome: true
      },
      orderBy: { createdAt: "desc" },
      take: 6
    });

    const activeLeaks = await prisma.revenueLeak.findMany({
      where: { storeId: { in: storeIds }, status: "ACTIVE" },
      orderBy: { affectedRevenue: "desc" }
    });

    const memories = await prisma.recoveryMemory.findMany({
      where: { storeId: { in: storeIds } },
      orderBy: { sampleSize: "desc" },
      take: 4
    });

    return {
      health,
      trend,
      strategyPerf,
      paymentHealth,
      recentCases,
      activeLeaks,
      memories
    };
  });

  const { health, trend, strategyPerf, paymentHealth, recentCases, activeLeaks, memories } = data;

  // Format trend series with distinct shades of black & line styles for maximum readability
  const trendSeries = [
    {
      name: "Revenue at Risk",
      color: "#09090b", // Pitch Black
      dashStyle: "solid",
      data: trend.map(t => ({ label: t.label, value: t.risk }))
    },
    {
      name: "Gross Recovered",
      color: "#71717a", // Slate Gray
      dashStyle: "dashed",
      data: trend.map(t => ({ label: t.label, value: t.gross }))
    },
    {
      name: "Net Recovered Revenue",
      color: "#27272a", // Dark Charcoal Ink
      dashStyle: "dotted",
      data: trend.map(t => ({ label: t.label, value: t.net }))
    }
  ];

  // Leak items for Graph C (Distinct Dark Shades)
  const leakBarItems = activeLeaks.map((l, idx) => ({
    id: l.id,
    label: l.title,
    sublabel: l.type.replace(/_/g, " "),
    value: l.affectedRevenue,
    formattedValue: `₹${(l.affectedRevenue / 100).toLocaleString("en-IN")}`,
    secondaryValue: `Est. ₹${(l.estimatedRecoverableRevenue / 100).toLocaleString("en-IN")} recoverable`,
    color: l.severity === "CRITICAL" ? "#09090b" : idx % 2 === 0 ? "#27272a" : "#52525b",
    badgeText: `${Math.round(Number(l.confidence ?? 0.8) * 100)}% Confidence`
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 font-sans">
      {/* Top Banner Header (Glassmorphic Dark) */}
      <div className="glass-card-dark text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-zinc-800/80 backdrop-blur-md text-white text-xs px-2.5 py-0.5 rounded-full font-bold border border-zinc-700">
              Autonomous Revenue Recovery Control Plane
            </span>
            <span className="text-xs text-zinc-400">MONEY → PROBLEM → WHY → ACTION → NET RESULT</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Here's what needs your attention.</h1>
          <p className="text-sm text-zinc-300 mt-1 max-w-2xl">
            RazorRecovery doesn't just chase failed payments. It detects revenue at risk, predicts counterfactual net ROI, executes bounded recovery plans, and verifies financial outcomes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="bg-zinc-800/80 backdrop-blur-md border border-zinc-700/60 rounded-xl p-1 flex items-center gap-1 text-xs font-semibold">
            {[7, 30, 90].map(d => (
              <Link
                key={d}
                href={`/?days=${d}`}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  days === d ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                {d}D
              </Link>
            ))}
          </div>
          <Link href="/payment-links/new" className="shrink-0 bg-white text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors shadow-sm">
            + Create Payment Link
          </Link>
        </div>
      </div>

      {/* REVENUE HEALTH & PRIMARY METRICS */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Revenue Health & Key Financial Indicators</h2>
          <span className="text-xs text-zinc-500">
            {health.hasBaseline ? `Baseline comparison vs previous ${days}D period` : "Not enough historical data for baseline yet"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Revenue at Risk */}
          <div className="glass-card p-5 rounded-2xl">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Revenue at Risk</span>
            <p className="text-2xl font-bold text-black mt-1">₹{(health.revenueAtRisk / 100).toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-zinc-500 mt-1">Active checkout/payment failures</p>
          </div>

          {/* Recoverable Revenue */}
          <div className="glass-card p-5 rounded-2xl">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Recoverable Revenue</span>
            <p className="text-2xl font-bold text-black mt-1">₹{(health.recoverableRevenue / 100).toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-zinc-500 mt-1">Weighted opportunity score</p>
          </div>

          {/* Net Recovered Revenue */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Net Recovered</span>
              {health.netDeltaPercent !== null && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100/80 text-black border border-zinc-300">
                  {health.netDeltaPercent >= 0 ? `+${health.netDeltaPercent.toFixed(1)}%` : `${health.netDeltaPercent.toFixed(1)}%`}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-black mt-1">₹{(health.netRecoveredRevenue / 100).toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-zinc-500 mt-1">After incentive cost deduction</p>
          </div>

          {/* Recovery Rate */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Recovery Rate</span>
              {health.rateDeltaPercent !== null && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100/80 text-black border border-zinc-300">
                  {health.rateDeltaPercent >= 0 ? `+${health.rateDeltaPercent.toFixed(1)}%` : `${health.rateDeltaPercent.toFixed(1)}%`}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-black mt-1">{(health.recoveryRate * 100).toFixed(1)}%</p>
            <p className="text-[11px] text-zinc-500 mt-1">Verified converted cases</p>
          </div>

          {/* Recovery ROI */}
          <div className="glass-card p-5 rounded-2xl">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Net Recovery ROI</span>
            <p className="text-2xl font-bold text-black mt-1">
              {health.totalIncentiveCost > 0 ? `${health.recoveryROI.toFixed(1)}x` : "100% Net"}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">Net gain per ₹1 incentive</p>
          </div>

          {/* Active Opportunities */}
          <div className="glass-card p-5 rounded-2xl">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Opportunities</span>
            <p className="text-2xl font-bold text-black mt-1">{health.activeOpportunities}</p>
            <p className="text-[11px] text-zinc-500 mt-1">Queued for intervention</p>
          </div>
        </div>
      </div>

      {/* GRAPH A & GRAPH C GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRAPH A — REVENUE RECOVERY TREND */}
        <div className="lg:col-span-2 glass-card-static p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-black">Revenue Recovery Trend</h3>
              <p className="text-xs text-zinc-500">Real-time tracking of Risk vs Gross Recovered vs Net Recovered</p>
            </div>
            <span className="text-xs font-semibold text-zinc-600 bg-zinc-100/80 backdrop-blur-sm px-2.5 py-1 rounded-md border border-zinc-200">
              Last {days} Days
            </span>
          </div>
          <LineChart series={trendSeries} height={240} />
        </div>

        {/* GRAPH C — REVENUE LEAK BREAKDOWN */}
        <div className="glass-card-static p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-black">Revenue Leak Breakdown</h3>
              <p className="text-xs text-zinc-500">Active leaks ranked by financial impact</p>
            </div>
            <Link href="/insights/leaks" className="text-xs font-bold text-black hover:underline">
              Explorer →
            </Link>
          </div>

          {leakBarItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200/80 rounded-xl">
              No active systemic revenue leaks detected.
            </div>
          ) : (
            <HorizontalBarChart items={leakBarItems} />
          )}
        </div>
      </div>

      {/* GRAPH D & GRAPH E GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRAPH D — RECOVERY STRATEGY PERFORMANCE */}
        <div className="lg:col-span-2 glass-card-static p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-black">Recovery Strategy Performance</h3>
              <p className="text-xs text-zinc-500">Verified historical outcomes prioritized strictly by NET RECOVERED REVENUE</p>
            </div>
            <Link href="/insights/memory" className="text-xs font-bold text-black hover:underline">
              Memory →
            </Link>
          </div>
          <StrategyComparisonVisual data={strategyPerf} />
        </div>

        {/* GRAPH E — PAYMENT HEALTH */}
        <div className="glass-card-static p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-black">Payment Health</h3>
              <p className="text-xs text-zinc-500">Live payment success rates by method</p>
            </div>
            <Link href="/insights/payment-health" className="text-xs font-bold text-black hover:underline">
              Details →
            </Link>
          </div>

          {paymentHealth.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200/80 rounded-xl">
              No payment transactions recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {paymentHealth.map(ph => (
                <div key={ph.method} className="p-3.5 rounded-xl border border-zinc-200/70 bg-zinc-50/70 backdrop-blur-xs space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-black">{ph.method}</span>
                    <div className="flex items-center gap-2">
                      {ph.isDegraded && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-white uppercase tracking-wider">
                          ANOMALY DEGRADED
                        </span>
                      )}
                      <span className="font-bold text-black">{ph.successRate}% Success</span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-200/80 rounded-full h-2 overflow-hidden border border-zinc-300/80">
                    <div
                      className="h-full rounded-full bg-zinc-700 transition-all"
                      style={{ width: `${ph.successRate}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Attempts: {ph.total}</span>
                    <span>Failed: {ph.failed}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT AGENT INTERVENTIONS QUEUE */}
      <div className="glass-card-static rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200/80 flex justify-between items-center bg-zinc-50/70 backdrop-blur-xs">
          <div>
            <h3 className="text-base font-bold text-black">Autonomous Interventions Queue</h3>
            <p className="text-xs text-zinc-500">MONEY → PROBLEM → WHY → RECOMMENDATION → ACTION → RESULT</p>
          </div>
          <Link href="/recoveries" className="text-xs font-bold text-black hover:underline">
            View All Opportunities →
          </Link>
        </div>

        {recentCases.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-zinc-100/80 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-zinc-400 font-bold">₹</span>
            </div>
            <h4 className="text-sm font-bold text-black">No active recovery cases yet</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Create a payment link and simulate a failure to test how the AI diagnoses failures and calculates counterfactual net recovery.
            </p>
            <Link href="/payment-links/new" className="inline-block mt-4 text-xs font-bold bg-zinc-800 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors shadow-2xs">
              Create Payment Link →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200/80 text-xs">
              <thead className="bg-zinc-100/70 backdrop-blur-xs text-zinc-700 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3 text-left">Customer / Order</th>
                  <th className="px-6 py-3 text-right">Risk Amount</th>
                  <th className="px-6 py-3 text-left">Diagnosis & Why</th>
                  <th className="px-6 py-3 text-left">AI Recommendation</th>
                  <th className="px-6 py-3 text-right">Net Recovered</th>
                  <th className="px-6 py-3 text-left">State</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white/60 backdrop-blur-xs divide-y divide-zinc-200/80">
                {recentCases.map(rec => {
                  const decision = rec.aiDecisions[0];
                  const outcome = rec.recoveryOutcome;
                  return (
                    <tr key={rec.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-black">
                        {rec.customer.name || "Guest"}
                        <div className="text-[11px] text-zinc-500 font-normal">
                          {rec.order.items[0]?.productNameSnapshot || "Order Item"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-black">
                        ₹{(rec.riskAmount / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-zinc-700 max-w-xs truncate">
                        {decision?.diagnosis || rec.riskReason.replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-black bg-zinc-100/80 px-2 py-1 rounded border border-zinc-300/80 text-[11px]">
                          {decision?.recommendedAction.replace(/_/g, " ") || "ANALYZING"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold">
                        {outcome ? (
                          <span className="text-black">₹{(outcome.netRecovered / 100).toLocaleString("en-IN")}</span>
                        ) : (
                          <span className="text-zinc-400">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100/80 text-black border border-zinc-300/80 uppercase tracking-wider">
                          {rec.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold">
                        <Link href={`/recoveries/${rec.id}`} className="text-black hover:underline">
                          Journey →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECOVERY MEMORY SECTION */}
      <div className="glass-card-static rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-zinc-200/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-black">Recovery Memory & Segment Insights</h3>
            <p className="text-xs text-zinc-500">Synthesized empirical memory from past recovery outcomes</p>
          </div>
          <Link href="/insights/memory" className="text-xs font-bold text-black hover:underline">
            View All Memory →
          </Link>
        </div>

        {memories.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200/80 rounded-xl">
            Not enough historical evidence yet to establish segment memory.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memories.map(m => (
              <div key={m.id} className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/70 backdrop-blur-xs space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{m.segmentType}</span>
                    <h4 className="text-xs font-bold text-black">{m.segmentKey}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100/80 text-black border border-zinc-300/80 uppercase tracking-wider">
                    {m.confidence} Confidence
                  </span>
                </div>
                <div className="flex justify-between text-xs text-zinc-700 pt-1">
                  <span>Strategy: <strong className="text-black">{m.intervention.replace(/_/g, " ")}</strong></span>
                  <span>Recovery Rate: <strong className="text-black">{(m.recoveryRate * 100).toFixed(0)}%</strong></span>
                  <span>Avg Net: <strong className="text-black">₹{m.recoveries > 0 ? (m.netRecovered / m.recoveries / 100).toFixed(2) : "0.00"}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
