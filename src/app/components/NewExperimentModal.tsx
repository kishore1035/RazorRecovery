"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewExperimentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    hypothesis: "",
    controlStrategy: "PAYMENT_LINK",
    variantStrategy: "PAYMENT_LINK_WITH_VOUCHER",
    sampleTarget: "50",
    budgetLimit: "10000"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        alert("Failed to create experiment: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs"
      >
        + New Experiment
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Create Recovery Experiment (A/B)</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Experiment Name
                </label>
                <input
                  required
                  placeholder="e.g. VIP Carts: Link vs 15% Voucher"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Hypothesis
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="What mathematical impact do you expect on Net Recovered Revenue?"
                  value={formData.hypothesis}
                  onChange={e => setFormData({ ...formData, hypothesis: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Control Strategy (50%)
                  </label>
                  <select
                    value={formData.controlStrategy}
                    onChange={e => setFormData({ ...formData, controlStrategy: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="PAYMENT_LINK">Payment Link</option>
                    <option value="NO_ACTION">No Action</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Variant Strategy (50%)
                  </label>
                  <select
                    value={formData.variantStrategy}
                    onChange={e => setFormData({ ...formData, variantStrategy: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="PAYMENT_LINK_WITH_VOUCHER">Payment Link + 10% Voucher</option>
                    <option value="PAYMENT_LINK">Standard Payment Link</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Sample Target
                  </label>
                  <input
                    type="number"
                    value={formData.sampleTarget}
                    onChange={e => setFormData({ ...formData, sampleTarget: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Budget Cap (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.budgetLimit}
                    onChange={e => setFormData({ ...formData, budgetLimit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? "Launching..." : "Launch Experiment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
