# Revenue Health Score

The Revenue Health Score represents the overarching health of the commerce flow. 

## Calculation
It aggregates `RevenueLeak` severities provided by the `PaymentDegradationController`:
- **CRITICAL:** If any active leak has a drop > 25 percentage points.
- **NEEDS ATTENTION:** If active leaks exist but fall in the 15-25% range.
- **HEALTHY:** Baseline operations normal.
