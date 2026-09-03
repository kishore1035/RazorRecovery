# Experiment Learning Loop

When an experiment completes, the data is fed back into the AI's collective intelligence.

## Data Pipeline
1. `RecoveryOutcomeService` calculates the verified Net Recovered amount.
2. If the case has an `experimentAssignmentId`, the result is logged to `RecoveryLearningEvent` with `sourceType = "EXPERIMENT"`.
3. The `RecoveryExperimentArm` receives an aggregated real-time tally of `grossRecovered`, `incentiveCost`, and `netRecovered`.
4. The `MemoryService` consumes the learning event asynchronously, adjusting the historical success probability that future simulations and AI decisions will query.
