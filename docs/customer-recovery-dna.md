# Customer Recovery DNA

Customer Recovery DNA uses historical transaction/recovery behavior to categorize customers into segments like `NEW_CUSTOMER` or `RETURNING_CUSTOMER`.

## Principles
- No sensitive profiling (demographics, health, political). 
- Based entirely on purchase and recovery history (payment method, failure type, lifetime spend).

Memory aggregates by these segments to learn, for instance, that `RETURNING_CUSTOMER` groups might respond to Payment Links alone without needing to subsidize a voucher.
