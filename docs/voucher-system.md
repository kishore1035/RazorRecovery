# Voucher System

AI does *not* generate arbitrary vouchers. It merely selects from pre-approved `Voucher` entities strictly governed by the Merchant's explicit settings.

## Redemption
During outcome evaluation, `VoucherRedemption` records are cross-checked against the `RecoveryCase` and `Order`. 

## Limits
Vouchers must respect:
- `maximumDiscountPercent`
- `maximumDiscountAmount`
- `minimumOrderValue`
- `usageLimit`
- `usagePerCustomer`

Duplicate redemption attempts throw explicit bounds errors.
