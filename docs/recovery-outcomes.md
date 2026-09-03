# Recovery Outcomes

A Recovery Outcome is deterministically created *only* when a verified successful payment is captured through the system.

## Statuses
- **RECOVERED**: The captured payment amount + actual incentive discount is equal to or greater than the original order risk amount.
- **PARTIALLY_RECOVERED**: The captured payment amount + actual incentive discount is less than the original order risk amount.
- **FAILED / EXPIRED / STOPPED**: Fallbacks for unsuccessful paths.

## Stop Execution
When an outcome evaluates to `RECOVERED` or `PARTIALLY_RECOVERED`, all pending `RecoveryPlanSteps` immediately transition to `CANCELLED` safely blocking any further duplicate links, retry attempts, or SMS pings.
