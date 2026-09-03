# Recovery Memory

RazorRecovery aggregates actual historical recovery outcomes to answer: *"Which recovery strategy works best in this situation?"*

## Architecture
Every `RecoveryOutcome` calculation creates a canonical `RecoveryLearningEvent`.
The `MemoryService` aggregates these asynchronously into `RecoveryMemory` records segmented by:
- `PAYMENT_METHOD`
- `CUSTOMER_SEGMENT`
- `PRODUCT`

## Contextual Retrieval
Before the AI proposes a new strategy, the Intelligence Engine queries the Memory Service with the current case's context. If historical memory exists, it is appended to the AI's prompt as grounded, factual historical evidence to steer the recommendation toward historically superior strategies.
