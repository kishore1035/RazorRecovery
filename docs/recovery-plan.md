# Adaptive Recovery Plan

The `RecoveryPlan` replaces static linear follow-ups with an adaptive strategy that halts or branches according to external payment state dynamically.

## Step Types
- `PAYMENT_LINK`: Connects securely to the provider SDK to create a short url and maps it back.
- `MESSAGE`: Integrates through `NotificationProvider` to email/SMS/simulate outreach.
- `WAIT`: Stalls the step progression by mapping `delaySeconds` to `scheduledAt`.
- `CHECK_STATUS`: Authoritatively polls the provider, updating the internal status.

## Stop Conditions
The `RecoveryStopService` runs *before every step*.
If the payment succeeds, the order is cancelled, or the recovery window expires, remaining steps transition safely to `CANCELLED` and the overarching plan transitions to `STOPPED`. 
This guarantees the system will never accidentally send a "payment failed" message to a customer who has already paid.
