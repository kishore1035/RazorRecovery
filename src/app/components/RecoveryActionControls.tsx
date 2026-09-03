"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RecoveryActionControls({
  caseId,
  status,
  hasPlan,
  hasOutcome
}: {
  caseId: string;
  status: string;
  hasPlan: boolean;
  hasOutcome: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAction = async (action: "EXECUTE" | "CONFIRM_PAYMENT") => {
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
        alert("Action failed: " + (data.error || "Unknown error"));
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (hasOutcome || status === "RECOVERED" || status === "STOPPED") {
    return null; // Completed or stopped
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h3 className="text-sm font-bold text-black">Interactive Recovery Controls (Pin-to-Pin Verification)</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Execute recovery autopilot steps or simulate customer payment confirmation to test the full lifecycle.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {(!hasPlan || status === "ACTION_READY" || status === "DETECTED") && (
          <button
            disabled={loading}
            onClick={() => handleAction("EXECUTE")}
            className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-2xs"
          >
            {loading ? "Processing..." : "▶ Step 8: Execute Action"}
          </button>
        )}

        {(hasPlan || status === "RECOVERING" || status === "ACTION_READY") && (
          <button
            disabled={loading}
            onClick={() => handleAction("CONFIRM_PAYMENT")}
            className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-2xs border border-black"
          >
            {loading ? "Confirming..." : "✓ Step 9: Confirm Payment"}
          </button>
        )}
      </div>
    </div>
  );
}
