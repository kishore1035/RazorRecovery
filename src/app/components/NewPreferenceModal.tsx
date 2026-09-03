"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewPreferenceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    scope: "CUSTOMER_SEGMENT",
    condition: "RETURNING_CUSTOMER",
    preferredStrategy: "PAYMENT_LINK",
    disallowedStrategy: "PAYMENT_LINK_WITH_VOUCHER",
    reason: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        alert("Failed to save preference: " + data.error);
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
        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-xs"
      >
        + Add Preference
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Teach RazorRecovery a Rule</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Scope
                </label>
                <select
                  value={formData.scope}
                  onChange={e => setFormData({ ...formData, scope: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="CUSTOMER_SEGMENT">Customer Segment</option>
                  <option value="PRODUCT_CATEGORY">Product Category</option>
                  <option value="FAILURE_TYPE">Failure Type</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Condition / Target
                </label>
                <input
                  required
                  placeholder="e.g. RETURNING_CUSTOMER, ELECTRONICS, or GATEWAY_TIMEOUT"
                  value={formData.condition}
                  onChange={e => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Preferred Strategy
                  </label>
                  <select
                    value={formData.preferredStrategy}
                    onChange={e => setFormData({ ...formData, preferredStrategy: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="PAYMENT_LINK">Payment Link</option>
                    <option value="PAYMENT_LINK_WITH_VOUCHER">Payment Link + Voucher</option>
                    <option value="RETRY">Silent Retry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Disallowed Strategy
                  </label>
                  <select
                    value={formData.disallowedStrategy}
                    onChange={e => setFormData({ ...formData, disallowedStrategy: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="PAYMENT_LINK_WITH_VOUCHER">Payment Link + Voucher</option>
                    <option value="NO_ACTION">No Action</option>
                    <option value="RETRY">Silent Retry</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Business Rationale
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain why this rule must be strictly followed by the AI"
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
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
                  {loading ? "Saving..." : "Save Preference"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
