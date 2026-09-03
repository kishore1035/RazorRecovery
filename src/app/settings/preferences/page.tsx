import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";
import { NewPreferenceModal } from "@/app/components/NewPreferenceModal";

export default async function TeachRazorRecoveryPage() {
  const preferences = await withTenant(async (merchantId) => {
    return prisma.merchantRecoveryPreference.findMany({
      where: { merchantId }
    });
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Teach RazorRecovery</h1>
          <p className="text-sm text-slate-500 mt-1">Configure your preferred strategies. System safety always takes priority.</p>
        </div>
        <NewPreferenceModal />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {preferences.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            You haven't added any preferences yet. AI will use historical data and global policy.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {preferences.map(p => (
              <li key={p.id} className="p-6">
                 <p className="text-sm text-slate-900 font-medium">When <span className="font-bold">{p.scope.replace(/_/g, " ")}</span> is <span className="font-bold">{p.condition}</span></p>
                 <div className="mt-2 space-y-1">
                   {p.preferredStrategy && <p className="text-sm text-green-700">✓ Prefer: {p.preferredStrategy.replace(/_/g, " ")}</p>}
                   {p.disallowedStrategy && <p className="text-sm text-red-700">✕ Avoid: {p.disallowedStrategy.replace(/_/g, " ")}</p>}
                 </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
