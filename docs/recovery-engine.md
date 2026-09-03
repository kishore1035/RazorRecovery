# Recovery Intelligence Engine

RazorRecovery evaluates checkout abandonment and payment failures using a deterministic eligibility layer combined with an AI-driven counterfactual strategy engine.

## Lifecycle
1. **DETECTED**: A verified payment failure triggers `RecoveryEligibilityService`. Idempotency guarantees exactly one `RecoveryCase` is created per risk reason for an order.
2. **ANALYZING**: The `RecoveryAnalysisService` gathers context (historical success/fail rates, order values, checkout stages) and queries the AI model (e.g., Llama 3 via Groq) for structured JSON decisions.
3. **ACTION_READY**: The optimal recovery strategy is identified. No execution occurs automatically.

## Counterfactual Strategies
For every case, multiple strategies (e.g., `NO_ACTION`, `PAYMENT_LINK`, `RETRY`, `PAYMENT_LINK_WITH_VOUCHER`) are compared. The system computes expected values deterministically from AI probability estimates.

### Expected Net Recovery Calculation
```
Expected Gross Recovery = Predicted Gross
Expected Net Recovery = Max(0, Expected Gross - Predicted Incentive Cost)
```
The strategy with the highest **Expected Net Recovery** is recommended.

## Opportunity Score
The Opportunity Score normalizes the expected net recovery against the total risk amount and probability:
```
Score = (Highest Expected Net Recovery / Risk Amount) * Recovery Probability * 100
```
This is capped at a maximum of 100 and displayed in the UI as a percentage indicator.
