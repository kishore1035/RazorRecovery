# Prediction vs Reality

To ensure explainability, AI predictions are *never* overwritten by actual outcomes.

When an `AIDecision` is generated, the `RecoveryOption` locks in the `predictedGrossRecovery`, `predictedIncentiveCost`, and `predictedNetRecovery`.

Once the `RecoveryOutcome` resolves, the actual metrics are calculated and displayed side-by-side in the Case Detail UI. This persistent contrast forms the baseline for calculating prediction error and tuning the model weighting.
