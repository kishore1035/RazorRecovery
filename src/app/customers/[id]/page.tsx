import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          items: true,
          payments: true,
          recoveryCases: {
            include: {
              aiDecisions: true,
              recoveryOutcome: true
            }
          }
        }
      }
    }
  });

  if (!customer) notFound();

  const totalOrders = customer.orders.length;
  const paidOrders = customer.orders.filter(o => o.status === "PAID");
  const lifetimeValue = paidOrders.reduce((sum, o) => sum + o.total, 0);

  const allPayments = customer.orders.flatMap(o => o.payments);
  const failedPayments = allPayments.filter(p => p.status === "FAILED").length;

  const allCases = customer.orders.flatMap(o => o.recoveryCases);
  const recoveredCases = allCases.filter(c => c.status === "RECOVERED" || c.status === "PARTIALLY_RECOVERED");
  const recoveryRate = allCases.length > 0 ? (recoveredCases.length / allCases.length) * 100 : 0;

  const times = recoveredCases
    .map(c => c.recoveryOutcome?.timeToRecovery)
    .filter((t): t is number => typeof t === "number");
  const avgRecoveryTimeMin = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 60) : null;

  const methodCounts: Record<string, number> = {};
  allPayments.forEach(p => {
    const m = (p.method || "card").toUpperCase();
    methodCounts[m] = (methodCounts[m] || 0) + 1;
  });
  const preferredMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "UPI";

  const strategyCounts: Record<string, number> = {};
  let totalIncentiveUsed = 0;
  recoveredCases.forEach(c => {
    const strat = c.aiDecisions[0]?.recommendedAction || "PAYMENT_LINK";
    strategyCounts[strat] = (strategyCounts[strat] || 0) + 1;
    if (c.recoveryOutcome) totalIncentiveUsed += c.recoveryOutcome.incentiveCost;
  });
  const bestStrategy = Object.entries(strategyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "PAYMENT_LINK";
  const isIncentiveSensitive = totalIncentiveUsed > 0;

  let insightText = "Not enough recovery evidence recorded yet for custom profiling.";
  if (allCases.length > 0) {
    if (recoveredCases.length > 0) {
      insightText = `${bestStrategy.replace(/_/g, " ")} has historically worked best for this customer. Converted ${recoveredCases.length} of ${allCases.length} attempts${avgRecoveryTimeMin ? ` — avg ${avgRecoveryTimeMin}min to recovery` : ""}.`;
      insightText += isIncentiveSensitive
        ? " Customer shows sensitivity to incentive discounts."
        : " Customer responds without requiring vouchers.";
    } else {
      insightText = `Customer experienced ${failedPayments} payment failure${failedPayments !== 1 ? "s" : ""}. Recovery attempts are in progress.`;
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 font-sans">

      {/* Customer Header */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-zinc-800 text-zinc-100 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0">
            {(customer.name || "G").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Customer Profile</span>
              <span className="bg-zinc-100 text-black text-[10px] font-bold px-2 py-0.5 rounded border border-zinc-300 uppercase tracking-wider">
                Recovery DNA
              </span>
            </div>
            <h1 className="text-2xl font-bold text-black tracking-tight mt-0.5">{customer.name || "Guest Customer"}</h1>
            <p className="text-xs text-zinc-500">{customer.email || "No email"} • {customer.phone || "No phone"}</p>
          </div>
        </div>

        <div className="text-right bg-zinc-50 p-4 rounded-xl border border-zinc-200">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Customer Lifetime Value</span>
          <span className="text-2xl font-bold text-black">₹{(lifetimeValue / 100).toLocaleString("en-IN")}</span>
          <span className="text-[11px] text-zinc-500 block">{paidOrders.length} paid orders</span>
        </div>
      </div>

      {/* RECOVERY DNA CARD — Soft Charcoal / Light Black */}
      <div className="bg-zinc-800 text-zinc-100 p-6 rounded-2xl border border-zinc-700/80 shadow-xs space-y-6">
        <div className="flex justify-between items-center border-b border-zinc-700/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-300 animate-pulse"></span>
            <h2 className="text-base font-bold text-white">Customer Recovery DNA</h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">ID: {customer.id.slice(0, 12)}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-700/60">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block mb-1">Total Orders</span>
            <span className="text-xl font-bold text-white">{totalOrders}</span>
          </div>

          <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-700/60">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block mb-1">Failed Payments</span>
            <span className="text-xl font-bold text-white">{failedPayments}</span>
          </div>

          <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-700/60">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block mb-1">Recovered</span>
            <span className="text-xl font-bold text-white">{recoveredCases.length}</span>
          </div>

          <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-700/60">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block mb-1">Recovery Rate</span>
            <span className="text-xl font-bold text-white">{recoveryRate.toFixed(0)}%</span>
          </div>

          <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-700/60">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block mb-1">Best Strategy</span>
            <span className="text-xs font-bold text-white truncate block mt-1">{bestStrategy.replace(/_/g, " ")}</span>
          </div>

          <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-700/60">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block mb-1">Preferred Pay</span>
            <span className="text-xs font-bold text-white block mt-1">{preferredMethod}</span>
          </div>
        </div>

        {/* Intelligence Insight Box */}
        <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-700/60 space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">RazorRecovery Intelligence</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed italic">
            "{insightText}"
          </p>
        </div>
      </div>

      {/* RECOVERY HISTORY TABLE */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <h3 className="text-sm font-bold text-black">Recovery Case History</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Historical interventions and outcomes for this customer</p>
        </div>

        {allCases.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400 font-medium">
            No recovery cases recorded for this customer.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-zinc-200 text-xs">
            <thead className="bg-zinc-100 text-zinc-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-6 py-3 text-left">Order ID</th>
                <th className="px-6 py-3 text-right">Risk Amount</th>
                <th className="px-6 py-3 text-left">AI Recommendation</th>
                <th className="px-6 py-3 text-right">Net Recovered</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-100">
              {allCases.map(c => {
                const decision = c.aiDecisions[0];
                const outcome = c.recoveryOutcome;
                return (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-black">
                      #{c.orderId.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-black">
                      ₹{(c.riskAmount / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-zinc-700">
                      {decision?.recommendedAction.replace(/_/g, " ") || "ANALYZING"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-black">
                      {outcome ? `₹${(outcome.netRecovered / 100).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-black border border-zinc-300 uppercase tracking-wide">
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link href={`/recoveries/${c.id}`} className="text-black font-bold hover:underline text-xs">
                        View Journey →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
