"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApprovalBanner({ caseId, riskAmount, reason }: { caseId: string; riskAmount: number; reason: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    setLoading(true);
    try {
      const res = await fetch("/api/recoveries/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryCaseId: caseId, action })
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        alert("Action failed: " + data.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-800 text-zinc-100 border border-zinc-700/80 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <span className="bg-zinc-700 text-zinc-200 text-xs px-2.5 py-0.5 rounded-full font-bold border border-zinc-600 uppercase tracking-wider">
            Governance Approval Required
          </span>
          <h2 className="text-lg font-bold mt-2 text-white">Merchant Approval Pending</h2>
          <p className="text-xs text-zinc-300 mt-1">₹{(riskAmount / 100).toLocaleString("en-IN")} at risk. Reason: {reason}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          disabled={loading}
          onClick={() => handleAction("APPROVE")}
          className="bg-zinc-100 text-zinc-900 px-5 py-2 rounded-xl text-xs font-bold hover:bg-white disabled:opacity-50 transition-colors shadow-xs"
        >
          {loading ? "Executing..." : "Approve & Execute Autopilot →"}
        </button>
        <button
          disabled={loading}
          onClick={() => handleAction("REJECT")}
          className="bg-zinc-900/60 border border-zinc-700/60 text-zinc-200 px-5 py-2 rounded-xl text-xs font-bold hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          Reject Recovery
        </button>
      </div>
    </div>
  );
}
