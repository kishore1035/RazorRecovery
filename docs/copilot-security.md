# Recovery Copilot

The Recovery Copilot translates natural language into secure, structured data retrievals and scoped action proposals.

## Security Model
The Copilot is an orchestration layer, **not a financial authority**. It never directly modifies the payment state or database metrics. It relies entirely on `CopilotActionProposal`, which mandates explicit human review and adherence to the Policy Engine.

## Zod Validation
The LLM response is strictly validated against a predefined JSON schema ensuring an `intent`, an `answer`, optional `evidence`, and optionally structured `actions`.
