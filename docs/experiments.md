# Recovery Experiments

Controlled experiments allow merchants to scientifically measure the causal impact of different recovery interventions.

## Architecture
- **RecoveryExperiment**: Defines the hypothesis, budget limit, and sample targets.
- **RecoveryExperimentArm**: Defines the control and variant strategies.
- **ExperimentAssignmentService**: Hooks into the AI eligibility pipeline. If a case matches an active experiment, it is deterministically assigned to an arm (via ID parity).

## Safety & Budget
Experiments tracking incentives (e.g., Vouchers) enforce a `budgetLimit`. Once `currentSpend` reaches the limit, the assignment falls back to standard AI/Policy routing to prevent unbounded financial risk.
