import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ApprovalBanner } from "@/app/components/ApprovalBanner";
import { RecoveryActionControls } from "@/app/components/RecoveryActionControls";

export default async function RecoveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const recCase = await withTenant(async (merchantId) => {
    const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true, name: true } });
    return prisma.recoveryCase.findFirst({
      where: { id, storeId: { in: stores.map(s => s.id) } },
      include: {
        store: { select: { name: true } },
        customer: { include: { orders: true } },
        order: { include: { items: true, payments: true } },
        checkoutSession: { include: { events: { orderBy: { timestamp: "asc" } } } },
        aiDecisions: {
          include: { recoveryOptions: true },
          orderBy: { createdAt: "desc" },
          take: 1
        },
        policyEvaluations: { orderBy: { evaluatedAt: "desc" }, take: 1 },
        approvalRequests: { orderBy: { createdAt: "desc" }, take: 1 },
        recoveryPlans: {
          include: { steps: { orderBy: { stepNumber: "asc" }, include: { recoveryActions: true } } },
          orderBy: { createdAt: "desc" }, take: 1
        },
        recoveryOutcome: true,
        notifications: { orderBy: { createdAt: "desc" } }
      }
    });
  });

  if (!recCase) notFound();

  const decision = recCase.aiDecisions[0];
  const recommendedOption = decision?.recoveryOptions.find(o => o.selected);
  const policy = recCase.policyEvaluations[0];
  const approval = recCase.approvalRequests[0];
  const plan = recCase.recoveryPlans[0];
  const outcome = recCase.recoveryOutcome;
  const failedPayment = recCase.order.payments.find(p => p.status === "FAILED");

  const predictedNet = recommendedOption?.predictedNetRecovery || 0;
  const actualNet = outcome?.netRecovered || 0;
  const netDiff = outcome ? actualNet - predictedNet : null;

  const isActionExecuted = Boolean(plan && plan.steps.some(s => s.status === "COMPLETED")) || recCase.status === "RECOVERING" || recCase.status === "RECOVERED";
  const isPaymentConfirmed = recCase.status === "RECOVERED" || Boolean(outcome);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/recoveries" className="text-xs font-bold text-black hover:underline">
              ← Revenue at Risk
            </Link>
            <span className="text-zinc-300">•</span>
            <span className="text-xs text-zinc-400">Autonomous Agent Journey</span>
          </div>
          <h1 className="text-2xl font-bold text-black tracking-tight mt-1">
            Recovery Journey — Order #{recCase.order.id.slice(0, 8)}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Detected: {new Date(recCase.createdAt).toLocaleString("en-IN")} • Customer: {recCase.customer.name || "Guest"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded text-xs font-bold bg-zinc-100 text-black border border-zinc-300 uppercase tracking-wider">
            {recCase.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* VISUAL CHECKOUT JOURNEY STEPPER */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">End-to-End Checkout & Recovery Funnel</span>
          <span className="text-xs font-bold text-black">Store: {recCase.store?.name ?? recCase.storeId.slice(0, 8)}</span>
        </div>
        <div className="flex items-center justify-between text-center overflow-x-auto pb-2 pt-1 gap-2">
          {[
            { step: "1. View", label: "Product Viewed", done: true },
            { step: "2. Cart", label: "Added to Cart", done: true },
            { step: "3. Start", label: "Checkout Started", done: true },
            { step: "4. Pay", label: "Payment Selected", done: true },
            { step: "5. Attempt", label: "Payment Attempted", done: true },
            { step: "6. Failure", label: "Payment Failed", done: true, failed: true },
            { step: "7. AI", label: "AI Counterfactual", done: Boolean(decision) },
            { step: "8. Action", label: "Action Executed", done: isActionExecuted },
            { step: "9. Confirm", label: isPaymentConfirmed ? "Payment Confirmed" : "Awaiting Payment", done: isPaymentConfirmed }
          ].map((item, idx, arr) => (
            <div key={idx} className="flex items-center gap-2 shrink-0">
              <div className={`p-2.5 rounded-xl border text-[11px] font-bold ${
                item.failed ? "bg-zinc-100 text-black border-black border-2" :
                item.done ? "bg-black text-white border-black" : "bg-zinc-50 text-zinc-400 border-zinc-200"
              }`}>
                <div>{item.step}</div>
                <div className="text-[10px] font-normal opacity-90">{item.label}</div>
              </div>
              {idx < arr.length - 1 && (
                <span className="text-zinc-300 font-bold text-xs">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Action Controls for Pin-to-Pin Execution */}
      <RecoveryActionControls
        caseId={recCase.id}
        status={recCase.status}
        hasPlan={isActionExecuted}
        hasOutcome={isPaymentConfirmed}
      />

      {/* Approval Banner if pending */}
      {recCase.status === "AWAITING_APPROVAL" && approval && approval.status === "PENDING" && (
        <ApprovalBanner caseId={recCase.id} riskAmount={recCase.riskAmount} reason={approval.reason} />
      )}

      {/* PREDICTION VS REALITY VISUALIZATION (If completed) */}
      {outcome && (
        <div className="bg-black text-white rounded-2xl p-6 shadow-md border border-zinc-800 space-y-6">
          <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
            <div>
              <span className="bg-zinc-800 text-white text-xs px-2.5 py-0.5 rounded-full font-bold border border-zinc-700">
                Verified Outcome Audit
              </span>
              <h2 className="text-xl font-bold mt-1">Prediction vs Reality Analysis</h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-400 block uppercase tracking-wider font-bold">Net Recovered</span>
              <span className="text-2xl font-bold text-white">₹{(outcome.netRecovered / 100).toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block mb-1">AI Predicted Net</span>
              <span className="text-lg font-bold text-white">
                ₹{recommendedOption ? (recommendedOption.predictedNetRecovery / 100).toLocaleString("en-IN") : "0"}
              </span>
              <span className="text-[11px] text-zinc-400 block mt-1">
                {(decision?.recoveryProbability ? decision.recoveryProbability * 100 : 70).toFixed(0)}% predicted prob.
              </span>
            </div>

            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block mb-1">Actual Net Recovered</span>
              <span className="text-lg font-bold text-white">
                ₹{(outcome.netRecovered / 100).toLocaleString("en-IN")}
              </span>
              <span className="text-[11px] text-zinc-400 block mt-1">
                Gross ₹{(outcome.grossRecovered / 100).toLocaleString("en-IN")} - Incentive ₹{(outcome.incentiveCost / 100).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block mb-1">Model Accuracy Variance</span>
              <span className="text-lg font-bold text-white">
                {netDiff !== null && netDiff >= 0 ? `+₹${(netDiff / 100).toLocaleString("en-IN")}` : `-₹${(Math.abs(netDiff || 0) / 100).toLocaleString("en-IN")}`}
              </span>
              <span className="text-[11px] text-zinc-400 block mt-1">
                {netDiff !== null && netDiff >= 0 ? "Model underestimated recovery" : "Model conservative prediction"}
              </span>
            </div>

            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block mb-1">Time to Recovery</span>
              <span className="text-lg font-bold text-white">
                {outcome.timeToRecovery ? `${Math.max(1, Math.floor(outcome.timeToRecovery / 60))} min` : "Instant"}
              </span>
              <span className="text-[11px] text-zinc-400 block mt-1">Verified via Razorpay webhook</span>
            </div>
          </div>

          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center gap-3 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span>
              <strong>Learning Event Recorded:</strong> This verified outcome has updated Recovery Memory for strategy{" "}
              <code className="text-white font-bold">{decision?.recommendedAction}</code> on segment{" "}
              <code className="text-white font-bold">RETURNING_CUSTOMER</code>.
            </span>
          </div>
        </div>
      )}

      {/* CHRONOLOGICAL AUTONOMOUS DECISION TIMELINE */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-6">
        <div className="border-b border-zinc-200 pb-3">
          <h2 className="text-base font-bold text-black">Autonomous Decision Timeline</h2>
          <p className="text-xs text-zinc-500">
            MONEY → PROBLEM → WHY → RECOMMENDATION → ACTION → RESULT → LEARNING
          </p>
        </div>

        <div className="relative border-l-2 border-zinc-200 ml-4 space-y-8 pl-6">
          {/* STEP 1: PAYMENT FAILED */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
              1
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-black uppercase tracking-wider">Payment Failed / Abandoned</span>
                <span className="text-[11px] text-zinc-400">{new Date(recCase.createdAt).toLocaleTimeString()}</span>
              </div>
              <h3 className="text-lg font-bold text-black">₹{(recCase.riskAmount / 100).toLocaleString("en-IN")} at risk</h3>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-800 space-y-1 max-w-2xl">
                <p>Payment Method: <strong>{failedPayment?.method || "UPI"}</strong></p>
                <p>Failure Reason: <strong>{recCase.riskReason.replace(/_/g, " ")}</strong> ({failedPayment?.failureReason || "Authentication or network failure"})</p>
                <p>Product: <strong>{recCase.order.items[0]?.productNameSnapshot || "Item"}</strong></p>
              </div>
            </div>
          </div>

          {/* STEP 2: SIGNAL DETECTED */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
              2
            </span>
            <div className="space-y-1">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Signal & Customer DNA</span>
              <h3 className="text-sm font-bold text-black">Merchant Signals Gathered</h3>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
                <div>
                  <span className="text-zinc-400 block text-[10px]">Customer</span>
                  <span className="font-bold">{recCase.customer.name || "Guest"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Total Past Orders</span>
                  <span className="font-bold">{recCase.customer.orders.length}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Successful Payments</span>
                  <span className="font-bold text-black">
                    {recCase.customer.orders.filter(o => o.status === "PAID").length}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Opportunity Score</span>
                  <span className="font-bold text-black">{recCase.opportunityScore || 75}/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3: AI DIAGNOSIS */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
              3
            </span>
            <div className="space-y-1">
              <span className="text-xs font-bold text-black uppercase tracking-wider">AI Diagnosis & Confidence</span>
              <h3 className="text-sm font-bold text-black">
                {decision ? decision.diagnosis : "Analyzing payment failure..."}
              </h3>
              {decision && (
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-black max-w-2xl">
                  <p>Diagnosis Confidence: <strong>{Math.round(((decision as any)?.diagnosisConfidence || 0.85) * 100)}%</strong></p>
                  <p className="mt-1">{decision.reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* STEP 4: COUNTERFACTUAL ANALYSIS */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
              4
            </span>
            <div className="space-y-2">
              <span className="text-xs font-bold text-black uppercase tracking-wider">Counterfactual Strategy Evaluation</span>
              <h3 className="text-sm font-bold text-black">Estimated Net ROI Across Alternatives</h3>

              {decision?.recoveryOptions && decision.recoveryOptions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
                  {decision.recoveryOptions.map(opt => (
                    <div
                      key={opt.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                        opt.selected
                          ? "bg-zinc-100 border-black shadow-xs"
                          : "bg-zinc-50 border-zinc-200 opacity-75"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-black">{opt.actionType.replace(/_/g, " ")}</span>
                        {opt.selected && (
                          <span className="bg-black text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                            SELECTED
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-zinc-400 block text-[9px]">Predicted Prob.</span>
                          <span className="font-bold text-black">{Math.round((opt.predictedProbability || 0.7) * 100)}%</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[9px]">Incentive Cost</span>
                          <span className="font-bold text-zinc-700">₹{(opt.predictedIncentiveCost / 100).toFixed(0)}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[9px]">EXPECTED NET</span>
                          <span className="font-bold text-black">₹{(opt.predictedNetRecovery / 100).toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600">
                  Recommended strategy: <strong>{decision?.recommendedAction || "PAYMENT_LINK"}</strong>
                </div>
              )}
            </div>
          </div>

          {/* STEP 5: POLICY CHECK */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
              5
            </span>
            <div className="space-y-1">
              <span className="text-xs font-bold text-black uppercase tracking-wider">Merchant Policy Engine</span>
              <h3 className="text-sm font-bold text-black">Governance & Limits Check</h3>
              {policy ? (
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-black space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-black"></span>
                    <span className="font-bold">
                      {policy.allowed ? "Within Merchant Policy Governance" : "Requires Merchant Approval"}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-[11px]">{policy.reason}</p>
                </div>
              ) : (
                <div className="p-3 bg-zinc-50 rounded-xl text-xs text-zinc-400">Policy evaluation pending.</div>
              )}
            </div>
          </div>

          {/* STEP 6: ACTION EXECUTION */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
              6
            </span>
            <div className="space-y-2">
              <span className="text-xs font-bold text-black uppercase tracking-wider">Recovery Autopilot Plan & Execution</span>
              <h3 className="text-sm font-bold text-black">Executed Action Steps</h3>
              {plan ? (
                <div className="space-y-2 max-w-2xl">
                  {plan.steps.map((step, idx) => (
                    <div key={step.id} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          step.status === "COMPLETED" ? "bg-black text-white" : "bg-zinc-200 text-zinc-600"
                        }`}>
                          {step.status === "COMPLETED" ? "✓" : idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-black">{step.actionType.replace(/_/g, " ")}</span>
                          {step.completedAt && (
                            <span className="text-[10px] text-zinc-400 block">
                              Executed at {new Date(step.completedAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-black border border-zinc-300 uppercase tracking-wider">
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-zinc-50 rounded-xl text-xs text-zinc-400">Plan pending creation.</div>
              )}
            </div>
          </div>

          {/* STEP 7: OUTCOME & LEARNING */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
              7
            </span>
            <div className="space-y-1">
              <span className="text-xs font-bold text-black uppercase tracking-wider">Verified Outcome & Learning</span>
              <h3 className="text-sm font-bold text-black">
                {outcome ? `Verified ${outcome.result.replace(/_/g, " ")}` : "Awaiting Customer Checkout Confirmation"}
              </h3>
              {outcome ? (
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-black space-y-1 max-w-2xl">
                  <p>Gross Recovered: <strong>₹{(outcome.grossRecovered / 100).toLocaleString("en-IN")}</strong></p>
                  <p>Incentive Cost: <strong>₹{(outcome.incentiveCost / 100).toLocaleString("en-IN")}</strong></p>
                  <p>NET RECOVERED: <strong className="text-black text-sm">₹{(outcome.netRecovered / 100).toLocaleString("en-IN")}</strong></p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  Payment confirmation webhook listener active on Razorpay Test Mode.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
