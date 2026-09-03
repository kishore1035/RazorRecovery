import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await withTenant(async (merchantId) => {
    const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
    return prisma.product.findFirst({
      where: { id, storeId: { in: stores.map(s => s.id) } },
      include: {
        orderItems: {
          include: {
            order: {
              include: {
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
        }
      }
    });
  });

  if (!product) notFound();

  const totalAppearances = product.orderItems.length;
  const paidItems = product.orderItems.filter(i => i.order.status === "PAID");
  const unitsSold = paidItems.reduce((sum, i) => sum + i.quantity, 0);
  const paidRevenue = paidItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);

  const productCases = product.orderItems.flatMap(i => i.order.recoveryCases);
  const revenueAtRisk = productCases.reduce((sum, c) => sum + c.riskAmount, 0);

  const recoveredCases = productCases.filter(c => c.status === "RECOVERED" || c.status === "PARTIALLY_RECOVERED");
  const netRecoveredRevenue = recoveredCases.reduce((sum, c) => sum + (c.recoveryOutcome?.netRecovered || 0), 0);
  const recoveryRate = productCases.length > 0 ? (recoveredCases.length / productCases.length) * 100 : 0;

  // Best Intervention
  const stratCounts: Record<string, number> = {};
  recoveredCases.forEach(c => {
    const s = c.aiDecisions[0]?.recommendedAction || "PAYMENT_LINK";
    stratCounts[s] = (stratCounts[s] || 0) + 1;
  });
  const bestIntervention = Object.entries(stratCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "PAYMENT_LINK";

  // Product Conversion Intelligence
  const failureRate = totalAppearances > 0 ? (productCases.length / totalAppearances) * 100 : 0;
  const isHighAbandonment = failureRate > 30;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Product Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xl">
            {product.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Product Intelligence</span>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                Product Recovery DNA
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">{product.name}</h1>
            <p className="text-xs text-slate-500">SKU: {product.sku || "N/A"} • Price: ₹{(product.price / 100).toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-right">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Paid Revenue</span>
            <span className="text-xl font-bold text-slate-900">₹{(paidRevenue / 100).toLocaleString("en-IN")}</span>
            <span className="text-[11px] text-slate-500 block">{unitsSold} units sold</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Net Recovered</span>
            <span className="text-xl font-bold text-green-600">₹{(netRecoveredRevenue / 100).toLocaleString("en-IN")}</span>
            <span className="text-[11px] text-slate-500 block">{recoveredCases.length} recoveries</span>
          </div>
        </div>
      </div>

      {/* PRODUCT RECOVERY DNA metrics */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-base font-bold">Product Recovery DNA</h2>
          </div>
          <span className="text-xs text-slate-400">ID: {product.id.slice(0, 12)}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Total Checkout Appearances</span>
            <span className="text-xl font-bold text-white">{totalAppearances}</span>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Payment Failures</span>
            <span className="text-xl font-bold text-amber-400">{productCases.length}</span>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Revenue at Risk</span>
            <span className="text-xl font-bold text-red-400">₹{(revenueAtRisk / 100).toLocaleString("en-IN")}</span>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Recovery Rate</span>
            <span className="text-xl font-bold text-white">{recoveryRate.toFixed(0)}%</span>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Best Intervention</span>
            <span className="text-xs font-bold text-blue-300 truncate block mt-1">{bestIntervention.replace(/_/g, " ")}</span>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Abandonment Impact</span>
            <span className={`text-xs font-bold block mt-1 ${isHighAbandonment ? "text-red-400" : "text-green-400"}`}>
              {failureRate.toFixed(0)}% Rate
            </span>
          </div>
        </div>

        {/* Product Conversion Discovery Box */}
        <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700 space-y-1">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">Product Discovery Intelligence</span>
          <p className="text-xs text-slate-300 leading-relaxed italic">
            {isHighAbandonment
              ? `"${product.name} experiences unusually high checkout payment failures (${failureRate.toFixed(0)}% of checkouts). Recommended to evaluate pricing or payment gateway compatibility."`
              : `"${product.name} displays healthy conversion metrics. Recovery strategy ${bestIntervention.replace(/_/g, " ")} maintains a ${recoveryRate.toFixed(0)}% recovery conversion rate."`}
          </p>
        </div>
      </div>

      {/* RECOVERY CASES FOR THIS PRODUCT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-900">Recovery Cases Involving This Product</h3>
          <p className="text-xs text-slate-500">Autonomous interventions for orders containing {product.name}</p>
        </div>

        {productCases.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No payment failures recorded for this product.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Order ID</th>
                <th className="px-6 py-3 text-right font-semibold">Risk Amount</th>
                <th className="px-6 py-3 text-left font-semibold">AI Recommendation</th>
                <th className="px-6 py-3 text-right font-semibold">Net Recovered</th>
                <th className="px-6 py-3 text-left font-semibold">Status</th>
                <th className="px-6 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {productCases.map(c => {
                const decision = c.aiDecisions[0];
                const outcome = c.recoveryOutcome;
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                      #{c.orderId.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-900">
                      ₹{(c.riskAmount / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                      {decision?.recommendedAction.replace(/_/g, " ") || "ANALYZING"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-600">
                      {outcome ? `₹${(outcome.netRecovered / 100).toLocaleString("en-IN")}` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link href={`/recoveries/${c.id}`} className="text-blue-600 font-semibold hover:underline">
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
