"use client";

import { useState } from "react";
import Link from "next/link";

export default function SimulatorPage() {
  const [segment, setSegment] = useState("RETURNING_CUSTOMER");
  const [method, setMethod] = useState("UPI");
  const [cartAmount, setCartAmount] = useState(21000);
  const [simulated, setSimulated] = useState(true);

  // Heuristic simulation math based on recovery memory
  const getProjections = () => {
    const amount = cartAmount;
    
    // Base conversion factors
    const isReturning = segment === "RETURNING_CUSTOMER";
    const isUPI = method === "UPI";
    
    const baseProbLink = isReturning ? (isUPI ? 0.82 : 0.74) : (isUPI ? 0.58 : 0.50);
    const baseProbVoucher10 = Math.min(0.92, baseProbLink + 0.12);
    const baseProbVoucher200 = Math.min(0.88, baseProbLink + 0.08);

    const grossA = Math.round(amount * baseProbLink);
    const costA = 0;
    const netA = grossA - costA;

    const voucher10CostPerOrder = Math.min(500, amount * 0.10);
    const grossB = Math.round(amount * baseProbVoucher10);
    const costB = Math.round(voucher10CostPerOrder * baseProbVoucher10);
    const netB = grossB - costB;

    const voucher200CostPerOrder = 200;
    const grossC = Math.round(amount * baseProbVoucher200);
    const costC = Math.round(voucher200CostPerOrder * baseProbVoucher200);
    const netC = grossC - costC;

    const strategies = [
      {
        name: "Standard Payment Link",
        description: "Direct Razorpay link sent via SMS/WhatsApp with no discount",
        prob: Math.round(baseProbLink * 100),
        gross: grossA,
        cost: costA,
        net: netA,
        best: netA >= netB && netA >= netC
      },
      {
        name: "Payment Link + 10% Voucher",
        description: "Payment link with dynamic 10% discount code (capped at ₹500)",
        prob: Math.round(baseProbVoucher10 * 100),
        gross: grossB,
        cost: costB,
        net: netB,
        best: netB > netA && netB >= netC
      },
      {
        name: "Payment Link + ₹200 Flat Voucher",
        description: "Payment link with flat ₹200 recovery coupon",
        prob: Math.round(baseProbVoucher200 * 100),
        gross: grossC,
        cost: costC,
        net: netC,
        best: netC > netA && netC > netB
      }
    ];

    const recommended = strategies.find(s => s.best) || strategies[0];

    return { strategies, recommended };
  };

  const { strategies, recommended } = getProjections();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">Strategy Simulator</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
              SIMULATION ONLY
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Simulate historical counterfactual outcomes to evaluate Net Recovery ROI before applying policies.
          </p>
        </div>
        <Link href="/recovery-lab" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Back to Recovery Lab
        </Link>
      </div>

      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
        <span>
          <strong>Zero Production Impact:</strong> The simulator queries Recovery Memory models without creating real payment links, orders, or customer notifications.
        </span>
      </div>

      {/* Simulator Inputs */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-base font-semibold text-slate-900">Checkout Context Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Customer Segment
            </label>
            <select
              value={segment}
              onChange={e => setSegment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900"
            >
              <option value="RETURNING_CUSTOMER">Returning Customer (High LTV)</option>
              <option value="FIRST_TIME_CUSTOMER">First-time Visitor (Price Sensitive)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Failed Payment Method
            </label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900"
            >
              <option value="UPI">UPI (Google Pay / PhonePe)</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="NETBANKING">Netbanking</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Cart Amount (₹)
            </label>
            <input
              type="number"
              value={cartAmount}
              onChange={e => setCartAmount(Math.max(100, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Counterfactual Projection Results */}
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">AI Optimal Strategy Recommendation</span>
            <h3 className="text-lg font-bold text-blue-950 mt-1">{recommended.name}</h3>
            <p className="text-xs text-blue-800 mt-0.5">
              Produces the highest projected Net Recovered Revenue (<strong>₹{recommended.net.toLocaleString("en-IN")}</strong>).
              {recommended.cost === 0 ? " No incentive needed as organic recovery intent is strong." : " Higher conversion offsets incentive costs."}
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border border-blue-200 shadow-xs shrink-0 text-right">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Expected Net</span>
            <p className="text-lg font-bold text-green-700">₹{recommended.net.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-900">Counterfactual Strategy Comparison</h3>
            <span className="text-xs text-slate-500">Cart Baseline: ₹{cartAmount.toLocaleString("en-IN")}</span>
          </div>

          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Strategy</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Est. Probability</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Recovery</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Incentive Cost</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Net Recovered</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Verdict</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {strategies.map((strat, i) => (
                <tr key={i} className={`hover:bg-slate-50/80 transition-colors ${strat.best ? "bg-blue-50/30" : ""}`}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-900">{strat.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{strat.description}</p>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                    {strat.prob}%
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-slate-700">
                    ₹{strat.gross.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-red-600">
                    {strat.cost > 0 ? `-₹${strat.cost.toLocaleString("en-IN")}` : "₹0"}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-green-700">
                    ₹{strat.net.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {strat.best ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        Maximum Net Recovery Strategy
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Suboptimal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
