# Strategy Simulator

The Strategy Simulator allows merchants to preview counterfactual outcomes.

## How it works
It leverages `RecoveryMemory`, querying the deterministic historical performance (Net Recovered, Recovery Rate, Incentive Cost) of various strategies against specific parameters (e.g., UPI failures for Returning Customers).

**Crucial Constraints:**
- The simulator is explicitly marked as **SIMULATION ONLY**.
- It does not mutate production data.
- It never executes actual API calls or sends real notifications.
