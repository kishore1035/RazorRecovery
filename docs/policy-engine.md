# Policy Engine

The RazorRecovery Policy Engine sits deterministically between the AI's recommendations and real financial execution.

## Rules Enforced
1. **Disabled Autopilot**: Requires human approval if disabled.
2. **Value Limits**: Order amount > `maximumAutomaticRecoveryAmount` triggers mandatory human approval.
3. **Discount Checks**: `maximumDiscountPercent` and `maximumDiscountAmount` strictly block excessive discounts.
4. **Contact Limits**: Halts campaigns attempting to exceed `maximumContacts`.
5. **Recovery Window**: Drops expired recovery cases based on `recoveryWindowHours`.
6. **Payment Status Safety**: Blocks execution immediately if order becomes PAID, REFUNDED, or CANCELLED.

## PolicyEvaluations
Every analysis outputs a `PolicyEvaluation` record. This guarantees an immutable audit trail of exactly *why* a particular strategy was allowed, required approval, or was blocked at that exact moment in time.
