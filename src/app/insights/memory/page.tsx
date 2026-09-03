import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";

export default async function InsightsMemoryPage() {
  const memories = await withTenant(async (merchantId) => {
    const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
    return prisma.recoveryMemory.findMany({
      where: { storeId: { in: stores.map(s => s.id) } },
      orderBy: { sampleSize: "desc" }
    });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Recovery Memory</h1>
          <p className="text-sm text-slate-500 mt-1">What RazorRecovery has learned from historical evidence.</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Context Segment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Strategy</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Recovery Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Net</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Confidence</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sample Size</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {memories.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">Learning from your recovery outcomes. No history yet.</td></tr>
            )}
            {memories.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{m.segmentType}</span>
                  <p className="text-sm font-medium text-slate-900">{m.segmentKey}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {m.intervention.replace(/_/g, " ")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  <span className="font-bold">{(m.recoveryRate * 100).toFixed(1)}%</span>
                  <p className="text-xs text-slate-500">{m.recoveries} / {m.attempts}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  ₹{m.recoveries > 0 ? (m.netRecovered / m.recoveries / 100).toFixed(2) : "0.00"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    m.confidence === "HIGH" ? "bg-green-100 text-green-800" :
                    m.confidence === "MEDIUM" ? "bg-yellow-100 text-yellow-800" :
                    "bg-slate-100 text-slate-800"
                  }`}>
                    {m.confidence}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {m.sampleSize} attempts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
