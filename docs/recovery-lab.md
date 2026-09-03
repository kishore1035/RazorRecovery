# Recovery Lab

The Recovery Lab is the command center for controlled experimentation and continuous learning within RazorRecovery.

## Core Features
1. **Experiments**: A/B test recovery strategies (e.g., Payment Link vs Payment Link + Voucher) safely.
2. **Strategy Simulator**: Use historical Recovery Memory to estimate what *would* have happened under a different strategy for a specific context.
3. **Teach RazorRecovery**: Provide explicit merchant preferences (e.g., "Always require approval for VIPs") that the AI integrates into its decision matrix.

## Safety First
All actions within the Recovery Lab are constrained by the **Policy Engine**. Experiments cannot bypass maximum discount rules, approval gates, or contact limits.
