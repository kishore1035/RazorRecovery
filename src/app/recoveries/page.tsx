import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";
import Link from "next/link";

export default async function RecoveriesPage() {
  const data = await withTenant(async (merchantId) => {
    const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true, name: true } });
    const storeIds = stores.map(s => s.id);

    const cases = await prisma.recoveryCase.findMany({
      where: { storeId: { in: storeIds } },
      include: {
        customer: true,
        order: { include: { items: true, payments: true } },
        aiDecisions: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { recoveryOptions: true }
        },
        recoveryOutcome: true
      },
      orderBy: { createdAt: "desc" }
    });

    const activeCases = cases.filter(c => c.status !== "RECOVERED" && c.status !== "STOPPED" && c.status !== "FAILED");
    const totalRiskAmount = activeCases.reduce((sum, c) => sum + c.riskAmount, 0);

    const totalRecoverableAmount = activeCases.reduce((sum, c) => {
      const decision = c.aiDecisions[0];
      const selectedOpt = decision?.recoveryOptions.find(o => o.selected);
      const expectedNet = selectedOpt ? selectedOpt.predictedNetRecovery : Math.round(c.riskAmount * (c.recoveryProbability || 0.7));
      return sum + expectedNet;
    }, 0);

    const sortedOpportunities = [...cases].sort((a, b) => {
      const optA = a.aiDecisions[0]?.recoveryOptions.find(o => o.selected)?.predictedNetRecovery || a.riskAmount * (a.recoveryProbability || 0.5);
      const optB = b.aiDecisions[0]?.recoveryOptions.find(o => o.selected)?.predictedNetRecovery || b.riskAmount * (b.recoveryProbability || 0.5);
      return optB - optA;
    });

    // Build storeId -> name lookup for real store names
    const storeNameMap: Record<string, string> = {};
    for (const s of stores) storeNameMap[s.id] = s.name;

    return {
      cases: sortedOpportunities,
      totalRiskAmount,
      totalRecoverableAmount,
      activeCount: activeCases.length,
      storeNameMap
    };
  });

  const { cases, totalRiskAmount, totalRecoverableAmount, activeCount, storeNameMap } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Banner Header (Black & White) */}
      <div className="bg-black text-white p-6 rounded-2xl border border-zinc-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-zinc-800 text-white text-xs px-2.5 py-0.5 rounded-full font-bold border border-zinc-700">
              Opportunity Queue
            </span>
            <span className="text-xs text-zinc-400">Sorted by Expected Net Recovery</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Revenue at Risk</h1>
          <p className="text-xs text-zinc-300 mt-0.5">
            Prioritized recovery opportunities evaluated by AI counterfactual net ROI
          </p>
        </div>

        <div className="flex items-center gap-6 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Currently at Risk</span>
            <p className="text-2xl font-bold text-white">₹{(data.totalRiskAmount / 100).toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-zinc-400">{data.activeCount} active cases</p>
          </div>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Appears Recoverable</span>
            <p className="text-2xl font-bold text-white">₹{(data.totalRecoverableAmount / 100).toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-zinc-400">Expected net recovery</p>
          </div>
        </div>
      </div>

      {/* Opportunity Cards List */}
      {data.cases.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-zinc-200 shadow-xs space-y-3">
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-500 font-bold">
            ₹
          </div>
          <h3 className="text-base font-bold text-black">No revenue currently at risk</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            All checkout attempts are healthy or already recovered. Launch a test checkout simulation to test opportunity queue processing.
          </p>
          <Link href="/demo" className="inline-block bg-black text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors">
            + Run Test Checkout
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {data.cases.map(rec => {
            const decision = rec.aiDecisions[0];
            const selectedOpt = decision?.recoveryOptions.find(o => o.selected);
            const expectedNet = selectedOpt ? selectedOpt.predictedNetRecovery : Math.round(rec.riskAmount * (rec.recoveryProbability || 0.7));
            const failedPayment = rec.order.payments.find(p => p.status === "FAILED");

            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs transition-all hover:border-black space-y-4"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-zinc-200 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        {rec.riskReason === "CHECKOUT_ABANDONMENT" ? "Checkout Drop-off" : "Payment Failure"}
                      </span>
                      <h3 className="text-lg font-bold text-black">{rec.customer.name || "Guest Customer"}</h3>
                      <span className="text-xs text-zinc-500 font-medium">({rec.customer.email || "No email"})</span>
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-zinc-100 text-black border border-zinc-300 uppercase tracking-wider">
                        {rec.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">
                      {rec.order.items[0]?.productNameSnapshot && <span>Product: <strong>{rec.order.items[0].productNameSnapshot}</strong> • </span>}Store: <strong>{storeNameMap[rec.storeId] || rec.storeId.slice(0, 8)}</strong> • Order ID: #{rec.order.id.slice(0, 8)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Risk Amount</span>
                      <span className="text-lg font-bold text-black">₹{(rec.riskAmount / 100).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="h-8 w-px bg-zinc-200"></div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Expected Net</span>
                      <span className="text-lg font-bold text-black">₹{(expectedNet / 100).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* Recommendation & Why Banner (Monochrome) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-xs">
                  <div>
                    <span className="font-bold text-zinc-400 uppercase tracking-wider block text-[10px] mb-1">Recommended Action</span>
                    <span className="font-bold text-black bg-white px-2.5 py-1 rounded border border-zinc-300 inline-block">
                      {decision?.recommendedAction.replace(/_/g, " ") || "NO_ACTION"}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-zinc-400 uppercase tracking-wider block text-[10px] mb-1">Recovery Prob / Score</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-16 h-2 bg-zinc-200 rounded-full overflow-hidden border border-zinc-300">
                        <div
                          className="h-full bg-black"
                          style={{ width: `${rec.opportunityScore || 50}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-black">{Math.round((rec.recoveryProbability || 0.7) * 100)}%</span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <span className="font-bold text-zinc-400 uppercase tracking-wider block text-[10px] mb-1">Why & Evidence</span>
                    <p className="text-zinc-800 font-medium leading-relaxed">
                      {decision?.reason || `${rec.riskReason.replace(/_/g, " ")} (${failedPayment?.method || "UPI"} failure)`}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-zinc-400">
                    Detected: {new Date(rec.createdAt).toLocaleString("en-IN")}
                  </span>
                  <Link
                    href={`/recoveries/${rec.id}`}
                    className="shrink-0 bg-black text-white font-bold px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors shadow-2xs"
                  >
                    Review Agent Journey →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
