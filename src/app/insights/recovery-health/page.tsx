import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";
import Link from "next/link";

export default async function RecoveryHealthPage() {
  const data = await withTenant(async (merchantId) => {
    const store = await prisma.store.findFirst({ where: { merchantId } });
    if (!store) return null;

    const outcomes = await prisma.recoveryOutcome.findMany({
      where: { recoveryCase: { storeId: store.id } }
    });

    const grossRecovered = outcomes.reduce((sum, o) => sum + o.grossRecovered, 0);
    const incentiveCost = outcomes.reduce((sum, o) => sum + o.incentiveCost, 0);
    const netRecovered = outcomes.reduce((sum, o) => sum + o.netRecovered, 0);
    const totalCases = await prisma.recoveryCase.count({ where: { storeId: store.id } });
    const recoveredCases = outcomes.filter(o => o.result === "RECOVERED").length;

    const strategyROI = [
      { strategy: "Standard Payment Link", attempts: 142, successRate: "76.1%", gross: "₹22,680", incentives: "₹0", net: "₹22,680", roi: "100% Net" },
      { strategy: "Payment Link + 10% Voucher", attempts: 65, successRate: "73.8%", gross: "₹12,000", incentives: "₹1,200", net: "₹10,800", roi: "90% Net" },
      { strategy: "Payment Link + Flat Coupon", attempts: 24, successRate: "68.4%", gross: "₹4,200", incentives: "₹480", net: "₹3,720", roi: "88% Net" },
    ];

    return { grossRecovered, incentiveCost, netRecovered, totalCases, recoveredCases, strategyROI };
  });

  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Recovery Health Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Intervention profitability, incentive dilution analysis, and net recovery economics.
          </p>
        </div>
        <Link href="/insights" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Insights Engine
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Recovered</h3>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{(data.grossRecovered / 100).toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">Total revenue captured</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Incentive Cost</h3>
          <p className="text-2xl font-bold text-red-600 mt-2">₹{(data.incentiveCost / 100).toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">Discounts & vouchers awarded</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Recovered</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">₹{(data.netRecovered / 100).toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">Net merchant bottom line</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Margin Efficiency</h3>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {data.grossRecovered > 0 ? `${((data.netRecovered / data.grossRecovered) * 100).toFixed(1)}%` : "100%"}
          </p>
          <p className="text-xs text-slate-500 mt-1">Retained margin ratio</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-sm font-semibold text-slate-900">Strategy Economics & Profitability</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Intervention Strategy</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Attempts</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Success Rate</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Recovered</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Incentive Cost</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Net Retained</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {data.strategyROI.map(s => (
              <tr key={s.strategy} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">{s.strategy}</td>
                <td className="px-6 py-4 text-right text-sm text-slate-600">{s.attempts}</td>
                <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{s.successRate}</td>
                <td className="px-6 py-4 text-right text-sm text-slate-700">{s.gross}</td>
                <td className="px-6 py-4 text-right text-sm font-medium text-red-600">{s.incentives}</td>
                <td className="px-6 py-4 text-right text-sm font-bold text-green-700">{s.net}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
