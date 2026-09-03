"use client";

import { useState } from "react";

export default function CreatePaymentLinkPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ shortUrl: string; razorpayLinkId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    amount: "",
    description: "",
    customerEmail: "",
    customerPhone: "+91",
    notifySms: true,
    notifyEmail: false,
    hasExpiry: false,
    expireByDate: "",
    referenceId: ""
  });

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/payment-links/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: form.amount,
          description: form.description,
          customerEmail: form.customerEmail || undefined,
          customerPhone: form.customerPhone,
          notifySms: form.notifySms,
          notifyEmail: form.notifyEmail,
          expireByDate: form.hasExpiry && form.expireByDate ? form.expireByDate : undefined,
          referenceId: form.referenceId || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create payment link");
      } else {
        setResult({ shortUrl: data.shortUrl, razorpayLinkId: data.razorpayLinkId });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setForm({
      amount: "",
      description: "",
      customerEmail: "",
      customerPhone: "+91",
      notifySms: true,
      notifyEmail: false,
      hasExpiry: false,
      expireByDate: "",
      referenceId: ""
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-black text-white px-6 py-5 rounded-2xl border border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Create Payment Link</h1>
            <p className="text-zinc-400 text-xs mt-0.5">Send a real Razorpay payment link directly to your customer</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase tracking-wider">
            Live · Razorpay
          </span>
        </div>
      </div>

      {/* Success State */}
      {result && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white font-bold text-sm shrink-0">✓</div>
            <div>
              <h2 className="font-bold text-black text-sm">Payment Link Created</h2>
              <p className="text-xs text-zinc-500">Razorpay ID: <span className="font-mono text-zinc-700">{result.razorpayLinkId}</span></p>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Payment Link URL</p>
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-black font-bold text-sm break-all hover:underline"
            >
              {result.shortUrl}
            </a>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { navigator.clipboard.writeText(result.shortUrl); }}
              className="flex-1 bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors"
            >
              Copy Link
            </button>
            <button
              onClick={reset}
              className="flex-1 bg-zinc-100 text-black px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors border border-zinc-300"
            >
              + Create Another
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {!result && (
        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-100">

            {/* Amount */}
            <div className="px-6 py-4 space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-zinc-100 border border-zinc-300 rounded-lg px-3 py-2 text-xs font-bold text-black shrink-0">
                  ₹ (INR)
                </div>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  placeholder="100.00"
                  value={form.amount}
                  onChange={e => set("amount", e.target.value)}
                  className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
                />
              </div>
            </div>

            {/* Payment For */}
            <div className="px-6 py-4 space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Payment For</label>
              <input
                type="text"
                placeholder="Payment description"
                value={form.description}
                onChange={e => set("description", e.target.value)}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Customer Details */}
            <div className="px-6 py-4 space-y-3">
              <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Customer Details</p>

              {/* Email */}
              <div className="space-y-1.5">
                <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
                  <span className="px-3 py-2 text-zinc-400 text-sm">✉</span>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={form.customerEmail}
                    onChange={e => set("customerEmail", e.target.value)}
                    className="flex-1 py-2 pr-3 text-sm focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.notifyEmail}
                    onChange={e => set("notifyEmail", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-400 accent-black"
                  />
                  Notify via Email
                </label>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
                  <span className="px-3 py-2 text-zinc-500 text-xs font-bold shrink-0">🇮🇳 +91</span>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={form.customerPhone.replace("+91", "")}
                    onChange={e => set("customerPhone", `+91${e.target.value.replace(/\D/g, "")}`)}
                    className="flex-1 py-2 pr-3 text-sm focus:outline-none font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.notifySms}
                    onChange={e => set("notifySms", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-400 accent-black"
                  />
                  Notify via SMS
                  <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-black text-white rounded uppercase tracking-wider">Default ON</span>
                </label>
              </div>
            </div>

            {/* Reference ID */}
            <div className="px-6 py-4 space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Reference ID</label>
              <input
                type="text"
                placeholder="123456"
                maxLength={40}
                value={form.referenceId}
                onChange={e => set("referenceId", e.target.value)}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>

            {/* Link Expiry */}
            <div className="px-6 py-4 space-y-2">
              <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Link Expiry</p>
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!form.hasExpiry}
                  onChange={e => set("hasExpiry", !e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-zinc-400 accent-black"
                />
                No Expiry
              </label>
              {form.hasExpiry && (
                <input
                  type="date"
                  required={form.hasExpiry}
                  value={form.expireByDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={e => set("expireByDate", e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              )}
              {!form.hasExpiry && (
                <p className="text-[11px] text-zinc-400">Reminders are not sent on links with no expiry.</p>
              )}
            </div>

          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-4 px-4 py-3 bg-zinc-100 border border-zinc-300 rounded-xl text-xs text-black font-semibold">
              Error: {error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-xl hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.amount || !form.customerPhone || form.customerPhone === "+91"}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-black rounded-xl hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating..." : "Create Payment Link →"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
