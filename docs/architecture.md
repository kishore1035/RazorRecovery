# Architecture

RazorRecovery is designed as a secure orchestration pipeline rather than a generic CRUD app.

```text
Commerce Data
↓
Detection (RecoveryEligibilityService)
↓
Recovery Intelligence (AI generates options & Net Recovery estimate)
↓
Policy (Evaluates maximum discount, contact frequency)
↓
Execution (RecoveryPlanService handles async execution steps)
↓
Verification (Webhook Event Processor ensures idempotency)
↓
Learning (Outcome mapped to RecoveryLearningEvent)
↓
Insights (RevenueLeaks generated asynchronously)
↓
Copilot (Context-aware querying engine)
```

## Tenets
1. **AI is not an authority**: AI produces `AIDecision` and `RecoveryOption` records. These are inputs to the `PolicyEngine`. AI never executes a payment, refund, or discount directly.
2. **Financial Precision**: All monetary values are handled as integer minor units (e.g., paise).
3. **Idempotency**: Webhook events, detection events, and execution events all enforce idempotency keys to prevent duplicate billing or notification.
