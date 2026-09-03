# Learning System

The Learning Loop orchestrates safe, autonomous continuous improvement without unconstrained model self-modification.

1. **Outcome:** A webhoook validates a successful payment.
2. **Learning Event:** An immutable `RecoveryLearningEvent` is logged containing contextual features.
3. **Memory Aggregation:** `RecoveryMemory` updates success rates, net recovery, and computes `confidence` thresholds (Low < 5, Medium 5-19, High 20+).
4. **Retrieval:** The next identical failure prompts retrieval of this memory.
5. **AI Inference:** The AI reads the historical data directly inside the prompt context and recommends the mathematically optimal historical strategy.
