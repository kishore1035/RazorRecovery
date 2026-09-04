"use client";

import { useState } from "react";
import Link from "next/link";

export default function CreatePaymentLinkPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    shortUrl: string;
    razorpayLinkId: string;
    razorpayOrderId?: string;
    localOrderId?: string;
    amountInPaise?: number;
    productTitle?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    productUrl?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    productTitle: "Sony WH-1000XM5 Headphones",
    productUrl: "https://store.example.com/products/sony-wh-1000xm5",
    amount: "29990",
    description: "Purchase: Sony WH-1000XM5 Headphones",
    customerName: "Kishore P",
    customerEmail: "pkishore530@gmail.com",
    customerPhone: "+919876543210",
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
          productTitle: form.productTitle,
          productUrl: form.productUrl || undefined,
          description: form.description || undefined,
          customerName: form.customerName,
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
        setResult(data);
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
    setCopied(false);
    setForm({
      productTitle: "Sony WH-1000XM5 Headphones",
      productUrl: "https://store.example.com/products/sony-wh-1000xm5",
      amount: "29990",
      description: "Purchase: Sony WH-1000XM5 Headphones",
      customerName: "Kishore P",
      customerEmail: "pkishore530@gmail.com",
      customerPhone: "+919876543210",
      notifySms: true,
      notifyEmail: false,
      hasExpiry: false,
      expireByDate: "",
      referenceId: ""
    });
  };

  const handleCopy = () => {
    if (!result?.shortUrl) return;
    navigator.clipboard.writeText(result.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-zinc-800 text-zinc-100 px-6 py-5 rounded-2xl border border-zinc-700/80 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Create Payment Link</h1>
            <p className="text-zinc-300 text-xs mt-0.5">
              Generate a live Razorpay payment link with customer, product &amp; order data synced directly to your store
            </p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-zinc-700 text-zinc-200 border border-zinc-600 uppercase tracking-wider">
            Live · Razorpay
          </span>
        </div>
      </div>

      {/* Success State */}
      {result && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-2xs">
                ✓
              </div>
              <div>
                <h2 className="font-bold text-black text-sm">Payment Link Created &amp; Data Synced</h2>
                <p className="text-xs text-zinc-500">
                  Razorpay Link ID: <span className="font-mono text-zinc-700">{result.razorpayLinkId}</span>
                  {result.razorpayOrderId && (
                    <> • Order ID: <span className="font-mono text-zinc-700">{result.razorpayOrderId}</span></>
                  )}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-green-100 text-green-800 rounded-full uppercase tracking-wider">
              Ready
            </span>
          </div>

          {/* Payment Link Box */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Live Payment Link URL</p>
              <span className="text-[10px] text-zinc-400">Official Razorpay Hosted Link</span>
            </div>
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-black font-bold text-sm break-all hover:underline block"
            >
              {result.shortUrl}
            </a>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleCopy}
              className="w-full bg-zinc-100 text-black px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors border border-zinc-300"
            >
              {copied ? "✓ Copied to Clipboard!" : "Copy Link"}
            </button>
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center bg-zinc-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              Open Payment Link ↗
            </a>
          </div>

          {/* Interactive Simulation Option */}
          <div className="bg-zinc-900/60 text-zinc-100 rounded-xl p-4 space-y-3 border border-zinc-700/60">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-white">Simulate Checkout &amp; Test AI Recovery</p>
                <p className="text-[11px] text-zinc-300 mt-0.5">
                  Launch the interactive test checkout modal for this order. Click &quot;Failure&quot; to test real-time webhook interception &amp; AI recovery!
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={`/checkout-demo.html?orderId=${result.razorpayOrderId}&amount=${result.amountInPaise}&product=${encodeURIComponent(result.productTitle || '')}&name=${encodeURIComponent(result.customerName || '')}&email=${encodeURIComponent(result.customerEmail || '')}&phone=${encodeURIComponent(result.customerPhone || '')}`}
                className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors shadow-2xs"
              >
                Launch Checkout Simulator in Modal →
              </a>
              <Link
                href="/recoveries"
                className="text-xs font-bold text-zinc-300 hover:text-white underline underline-offset-4"
              >
                View Recoveries Dashboard
              </Link>
            </div>
          </div>

          {/* Synchronized Data Summary */}
          <div className="border border-zinc-200 rounded-xl p-4 space-y-3 bg-white">
            <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
              Saved Store Data (Available Across Platform)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Customer</p>
                <p className="font-bold text-black mt-1 truncate">{result.customerName || "Customer"}</p>
                <p className="text-[11px] text-zinc-500 truncate">{result.customerEmail || result.customerPhone}</p>
                <Link href="/customers" className="text-[10px] text-zinc-700 font-bold hover:underline mt-2 inline-block">
                  View in Customers →
                </Link>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Product</p>
                <p className="font-bold text-black mt-1 truncate">{result.productTitle || "Product"}</p>
                <p className="text-[11px] text-zinc-500">₹{((result.amountInPaise || 0) / 100).toFixed(2)}</p>
                <Link href="/products" className="text-[10px] text-zinc-700 font-bold hover:underline mt-2 inline-block">
                  View in Products →
                </Link>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Order Record</p>
                <p className="font-bold text-black mt-1">₹{((result.amountInPaise || 0) / 100).toFixed(2)}</p>
                <span className="inline-block text-[9px] px-1.5 py-0.5 rounded font-bold bg-yellow-100 text-yellow-800 uppercase mt-0.5">
                  Payment Pending
                </span>
                <br />
                <Link href="/orders" className="text-[10px] text-zinc-700 font-bold hover:underline mt-2 inline-block">
                  View in Orders →
                </Link>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={reset}
            className="w-full bg-zinc-100 text-black py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors border border-zinc-300"
          >
            + Create Another Payment Link
          </button>
        </div>
      )}

      {/* Form */}
      {!result && (
        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-100">

            {/* PRODUCT DETAILS */}
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Product &amp; Pricing Details</p>
                <span className="text-[10px] text-zinc-400 font-semibold">Saves to Products &amp; Orders</span>
              </div>

              {/* Product Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Product Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony WH-1000XM5 Headphones"
                  value={form.productTitle}
                  onChange={e => {
                    const title = e.target.value;
                    setForm(prev => ({
                      ...prev,
                      productTitle: title,
                      description: !prev.description || prev.description.startsWith("Purchase: ") ? `Purchase: ${title}` : prev.description
                    }));
                  }}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Product Link */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Product Link / Store URL
                  </label>
                  <span className="text-[10px] text-zinc-400 font-medium">Optional</span>
                </div>
                <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
                  <span className="px-3 py-2 text-zinc-400 text-sm">🔗</span>
                  <input
                    type="url"
                    placeholder="https://store.example.com/products/sony-wh-1000xm5"
                    value={form.productUrl}
                    onChange={e => set("productUrl", e.target.value)}
                    className="flex-1 py-2 pr-3 text-sm focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Price / Amount <span className="text-red-500">*</span>
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
                    placeholder="29990"
                    value={form.amount}
                    onChange={e => set("amount", e.target.value)}
                    className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
                  />
                </div>
              </div>

              {/* Payment For / Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Payment Description</label>
                <input
                  type="text"
                  placeholder="Purchase: Sony WH-1000XM5 Headphones"
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* CUSTOMER DETAILS */}
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Customer Details</p>
                <span className="text-[10px] text-zinc-400 font-semibold">Saves to Customer Directory</span>
              </div>

              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Kishore P"
                  value={form.customerName}
                  onChange={e => set("customerName", e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Customer Email</label>
                <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
                  <span className="px-3 py-2 text-zinc-400 text-sm">✉</span>
                  <input
                    type="email"
                    placeholder="pkishore530@gmail.com"
                    value={form.customerEmail}
                    onChange={e => set("customerEmail", e.target.value)}
                    className="flex-1 py-2 pr-3 text-sm focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer select-none mt-1">
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
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Customer Phone <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
                  <span className="px-3 py-2 text-zinc-500 text-xs font-bold shrink-0">🇮🇳 +91</span>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={form.customerPhone.startsWith("+91") ? form.customerPhone.replace("+91", "") : form.customerPhone}
                    onChange={e => set("customerPhone", `+91${e.target.value.replace(/\D/g, "")}`)}
                    className="flex-1 py-2 pr-3 text-sm focus:outline-none font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer select-none mt-1">
                  <input
                    type="checkbox"
                    checked={form.notifySms}
                    onChange={e => set("notifySms", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-400 accent-black"
                  />
                  Notify via SMS
                  <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-zinc-800 text-white rounded uppercase tracking-wider">Default ON</span>
                </label>
              </div>
            </div>

            {/* ADDITIONAL OPTIONS */}
            <div className="px-6 py-4 space-y-4">
              <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Additional Options</p>

              {/* Reference ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Reference ID</label>
                <input
                  type="text"
                  placeholder="e.g. 123456"
                  maxLength={40}
                  value={form.referenceId}
                  onChange={e => set("referenceId", e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700 font-mono"
                />
              </div>

              {/* Link Expiry */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Link Expiry</p>
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!form.hasExpiry}
                    onChange={e => set("hasExpiry", !e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-400 accent-zinc-800"
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
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700"
                  />
                )}
                {!form.hasExpiry && (
                  <p className="text-[11px] text-zinc-400">Reminders are not sent on links with no expiry.</p>
                )}
              </div>
            </div>

          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
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
              disabled={loading || !form.amount || !form.customerPhone || form.customerPhone === "+91" || !form.customerName}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-zinc-800 rounded-xl hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
            >
              {loading ? "Creating & Syncing Data..." : "Create Payment Link →"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

