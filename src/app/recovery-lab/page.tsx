import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";
import Link from "next/link";
import { NewExperimentModal } from "@/app/components/NewExperimentModal";
import { StrategyComparisonVisual } from "@/components/charts/Charts";

export default async function RecoveryLabPage() {
  const experiments = await withTenant(async (merchantId) => {
    const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
    return prisma.recoveryExperiment.findMany({
      where: { storeId: { in: stores.map(s => s.id) } },
      include: { arms: true }
    });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Banner Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-purple-200">
              Controlled A/B Experiments
            </span>
            <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-slate-200">
              PRODUCTION ENVIRONMENT
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Recovery Lab</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate recovery strategies with randomized A/B trial arms. Outcomes are strictly measured by NET RECOVERED REVENUE.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NewExperimentModal />
          <Link
            href="/recovery-lab/simulator"
            className="bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Open Simulator (SIMULATION) →
          </Link>
        </div>
      </div>

      {/* Active Experiments Arm Comparison */}
      <div className="space-y-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Production Experiment Arm Comparison</h2>

        {experiments.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-500 font-bold text-xs">
              LAB
            </div>
            <h3 className="text-base font-bold text-slate-900">No active recovery experiments</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Create an A/B experiment to split recovery cases between Control (Standard Payment Link) and Variant (Discount Voucher) arms to verify net ROI lift.
            </p>
          </div>
        ) : (
          experiments.map(exp => {
            const totalAttempts = exp.arms.reduce((sum, a) => sum + a.attemptCount, 0);
            const armComparisonData = exp.arms.map(arm => ({
              strategy: `${arm.name} (${arm.strategy})`,
              attempts: arm.attemptCount,
              recoveryRate: arm.attemptCount > 0 ? arm.recoveryCount / arm.attemptCount : 0,
              grossRecovered: arm.grossRecovered,
              incentiveCost: arm.incentiveCost,
              netRecovered: arm.netRecovered
            }));

            return (
              <div key={exp.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                        {exp.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">ID: {exp.id.slice(0, 8)}</span>
                      <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        PRODUCTION DATA
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">{exp.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{exp.hypothesis}</p>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Trial Cases</span>
                      <span className="text-lg font-bold text-slate-900">{totalAttempts}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recovery Control Lab</span>
                      <span className="text-lg font-bold text-green-600">NET RECOVERY LIFT</span>
                    </div>
                  </div>
                </div>

                {/* Analytical Arm Comparison Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Strategy Arm Breakdown</h4>
                  <StrategyComparisonVisual data={armComparisonData} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
