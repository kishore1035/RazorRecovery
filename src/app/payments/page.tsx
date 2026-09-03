"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface PaymentItem {
  id: string;
  razorpayPaymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  failureCode: string | null;
  failureReason: string | null;
  rawFailureReason?: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  orderItem: string;
  recoveryCase: {
    id: string;
    status: string;
  } | null;
}

interface TabCounts {
  all: number;
  created: number;
  captured: number;
  refunded: number;
  failed: number;
}

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "created" | "captured" | "refunded" | "failed">("all");
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<"paymentId" | "phone" | "email" | "orderId" | "all">("paymentId");
  const [dateRange, setDateRange] = useState<"all" | "today" | "7d" | "30d">("all");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [counts, setCounts] = useState<TabCounts>({ all: 0, created: 0, captured: 0, refunded: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPayments = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const params = new URLSearchParams({
        tab: activeTab,
        status: statusFilter,
        method: methodFilter,
        dateRange: dateRange,
        search: search,
        searchField: searchField,
      });

      const res = await fetch(`/api/payments?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setPayments(data.payments);
        setCounts(data.counts);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [activeTab, statusFilter, methodFilter, dateRange, search, searchField]);

  // Initial fetch and dependency trigger
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Polling every 5 seconds for live data updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPayments(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchPayments]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const monthName = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.getDate();
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
    return `${dayName} ${monthName} ${day}, ${time}`;
  };

  const tabs: { key: "all" | "created" | "captured" | "refunded" | "failed"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "created", label: "Created" },
    { key: "captured", label: "Captured" },
    { key: "refunded", label: "Refunded" },
    { key: "failed", label: "Failed" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      
      {/* Top Header & Live Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-black tracking-tight">Payments</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-black text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Razorpay Test Mode
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">Real-time payment transactions & failure recovery statuses</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-black bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-300">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
            Live Stream Active ({lastRefreshed.toLocaleTimeString()})
          </span>
          <button
            onClick={() => fetchPayments()}
            className="text-xs font-bold bg-white text-black border border-zinc-300 px-3.5 py-1.5 rounded-xl hover:bg-zinc-100 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Main Table Container (Razorpay Dashboard Style) */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
        
        {/* Top Section: Tab Bar + Search */}
        <div className="p-4 border-b border-zinc-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white">
          
          {/* Filter Tabs (All, Created, Captured, Refunded, Failed) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {tabs.map((t) => {
              const isActive = activeTab === t.key;
              const count = counts[t.key] || 0;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                    isActive
                      ? "bg-black text-white shadow-2xs"
                      : "text-zinc-600 hover:text-black hover:bg-zinc-100"
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box with Field Selector */}
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-black">
            <span className="text-zinc-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-black focus:outline-none w-48 md:w-56"
            />
            <span className="text-zinc-300 text-xs">in</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-black focus:outline-none cursor-pointer pr-1"
            >
              <option value="paymentId">Payment ID</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="orderId">Order ID</option>
              <option value="all">All Fields</option>
            </select>
          </div>

        </div>

        {/* Filter Pills Bar (Date Range, Status, Payment Method) */}
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-zinc-300 rounded-xl px-3 py-1.5 shadow-2xs">
              <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-wider">Date Range:</span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-black focus:outline-none cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7d">Past 7 Days</option>
                <option value="30d">Past 30 Days</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-zinc-300 rounded-xl px-3 py-1.5 shadow-2xs">
              <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-wider">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-black focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="CAPTURED">Captured</option>
                <option value="FAILED">Failed</option>
                <option value="CREATED">Created</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            {/* Payment Method Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-zinc-300 rounded-xl px-3 py-1.5 shadow-2xs">
              <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-wider">Method:</span>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-black focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Methods</option>
                <option value="NETBANKING">Netbanking</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="WALLET">Wallet</option>
              </select>
            </div>

            {/* Reset Filters if modified */}
            {(search || statusFilter !== "ALL" || methodFilter !== "ALL" || dateRange !== "all" || activeTab !== "all") && (
              <button
                onClick={() => {
                  setActiveTab("all");
                  setSearch("");
                  setStatusFilter("ALL");
                  setMethodFilter("ALL");
                  setDateRange("all");
                }}
                className="text-[11px] font-bold text-zinc-500 hover:text-black underline ml-1"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Item Counter */}
          <div className="text-xs font-bold text-zinc-500">
            Showing {payments.length} Item{payments.length !== 1 ? "s" : ""}
          </div>

        </div>

        {/* Payments Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-zinc-500 font-medium">
              Loading live transactions...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-sm font-bold text-black">No payments found</p>
              <p className="text-xs text-zinc-500">Try adjusting your filters or search query, or run a test checkout.</p>
              <Link
                href="/demo"
                className="inline-block mt-2 bg-black text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                + Run Test Checkout
              </Link>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Bank RRN / Method</th>
                  <th className="py-3 px-4">Customer Detail</th>
                  <th className="py-3 px-4">Created On</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {payments.map((p) => {
                  const isCaptured = p.status === "CAPTURED" || p.status === "AUTHORIZED";
                  const isFailed = p.status === "FAILED";
                  const isRefunded = p.status === "REFUNDED";

                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/80 transition-colors group">
                      
                      {/* Payment ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-black">
                        <div className="flex items-center gap-1.5">
                          <span>{p.razorpayPaymentId}</span>
                          <button
                            onClick={() => copyToClipboard(p.razorpayPaymentId)}
                            title="Copy Payment ID"
                            className="text-zinc-400 hover:text-black text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {copiedId === p.razorpayPaymentId ? "✓" : "📋"}
                          </button>
                        </div>
                      </td>

                      {/* Bank RRN / Method */}
                      <td className="py-3.5 px-4 text-zinc-600">
                        <div className="font-semibold text-black">{p.method}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">--</div>
                      </td>

                      {/* Customer Detail */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-black">{p.customer.phone}</div>
                        <div className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                          {p.customer.email}
                        </div>
                      </td>

                      {/* Created On */}
                      <td className="py-3.5 px-4 text-zinc-600 font-medium whitespace-nowrap">
                        {formatDate(p.createdAt)}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-bold text-black whitespace-nowrap font-mono text-sm">
                        ₹{(p.amount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isCaptured ? (
                          <span className="inline-flex items-center gap-1 bg-zinc-100 text-black border border-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold">
                            <span>✓</span> Captured
                          </span>
                        ) : isFailed ? (
                          <span
                            title={p.rawFailureReason || p.failureReason || "Payment Failed"}
                            className="inline-flex items-center gap-1 bg-black text-white px-2 py-0.5 rounded text-[10px] font-bold max-w-[160px] cursor-help"
                          >
                            <span className="text-zinc-400 shrink-0">✕</span>
                            <span className="truncate">{p.failureReason || "Payment Failed"}</span>
                          </span>
                        ) : isRefunded ? (
                          <span className="inline-flex items-center gap-1 bg-zinc-200 text-black border border-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold">
                            <span>↩</span> Refunded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-700 border border-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold">
                            <span>⏱</span> {p.status}
                          </span>
                        )}
                      </td>

                      {/* Details Link */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {p.recoveryCase ? (
                          <Link
                            href={`/recoveries/${p.recoveryCase.id}`}
                            className="inline-flex items-center text-xs font-bold text-black hover:underline"
                          >
                            Details &gt;
                          </Link>
                        ) : (
                          <Link
                            href={`/orders/${p.orderId}`}
                            className="inline-flex items-center text-xs font-bold text-black hover:underline"
                          >
                            Details &gt;
                          </Link>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50/50 text-center text-xs font-bold text-zinc-500">
          Showing 1 - {payments.length}
        </div>

      </div>
    </div>
  );
}
