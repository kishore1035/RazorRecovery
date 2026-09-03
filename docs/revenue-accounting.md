# Revenue Accounting

Financial data is strictly processed in integer minor units (e.g., paise).

## Gross vs Net
- **Gross Recovered Revenue**: The *exact* amount captured successfully via Razorpay that maps directly back to the Recovery Case.
- **Incentive Cost**: The *exact* discount amount granted via a `VoucherRedemption` directly attributable to this specific transaction.
- **Net Recovered Revenue**: `Gross - Incentive`.

## Partial Recovery
If the recovered amount does not cover the complete value of the `riskAmount`, it is handled safely as a partial recovery.
Net expected vs Actual prediction metrics are frozen and tracked independently in the `RecoveryLearningEvent` for AI evaluation.
