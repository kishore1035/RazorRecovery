"use client";

import { useTransition } from "react";

export function VoucherActionButtons({ 
  voucherId, 
  status, 
  onToggle 
}: { 
  voucherId: string, 
  status: string,
  onToggle: (id: string, currentStatus: string) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex justify-end items-center gap-4">
      <button 
        onClick={() => alert("Editing vouchers is restricted to preserve financial audit trails. Please pause this voucher and create a new one.")}
        className="text-slate-900 hover:underline font-semibold"
      >
        Edit
      </button>
      
      {status === "EXHAUSTED" ? (
        <span className="text-slate-400 cursor-not-allowed">Used</span>
      ) : (
        <button 
          onClick={() => {
            startTransition(() => {
              onToggle(voucherId, status);
            });
          }}
          disabled={isPending}
          className={`${status === "ACTIVE" ? "text-slate-600" : "text-slate-900 font-bold"} hover:underline disabled:opacity-50`}
        >
          {isPending ? "..." : status === "ACTIVE" ? "Pause" : "Enable"}
        </button>
      )}
    </div>
  );
}
