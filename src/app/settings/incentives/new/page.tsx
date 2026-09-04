import { createVoucher } from "./actions";
import Link from "next/link";

export default function CreateVoucherPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 font-sans">
      <div className="bg-zinc-800 text-zinc-100 px-6 py-5 rounded-2xl border border-zinc-700/80 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Create New Voucher</h1>
            <p className="text-zinc-300 text-xs mt-0.5">
              Add a new discount code for the AI to offer during revenue recovery
            </p>
          </div>
        </div>
      </div>

      <form action={createVoucher} className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-100">
          <div className="px-6 py-4 space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Voucher Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                required
                placeholder="e.g. RECOVER20"
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black uppercase font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Discount Type <span className="text-red-500">*</span>
              </label>
              <select
                name="discountType"
                required
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="discountValue"
                min="1"
                required
                placeholder="e.g. 10"
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Maximum Discount (₹)
                </label>
                <span className="text-[10px] text-zinc-400 font-medium">Optional</span>
              </div>
              <input
                type="number"
                name="maximumDiscount"
                min="1"
                placeholder="e.g. 500"
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Minimum Order Value (₹)
                </label>
                <span className="text-[10px] text-zinc-400 font-medium">Optional</span>
              </div>
              <input
                type="number"
                name="minimumOrderValue"
                min="1"
                placeholder="e.g. 1000"
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>

          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex gap-3">
          <Link
            href="/settings/incentives"
            className="flex-1 px-4 py-2.5 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-xl hover:bg-zinc-100 transition-colors text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors shadow-2xs"
          >
            Create Voucher →
          </button>
        </div>
      </form>
    </div>
  );
}
