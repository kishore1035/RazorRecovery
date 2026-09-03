# Security & Safety

## AI Safety Boundaries
The LLM cannot directly modify database state or interface with external APIs like Razorpay. 
- During `RecoveryAnalysis`, the LLM only generates an `AIDecision` record.
- During `Copilot` sessions, the LLM generates `CopilotActionProposal` records.

## Policy Enforcement
All actions are piped through the `PolicyEngine` (see `src/lib/policy.ts`). Even if the AI hallucinated a 90% discount recommendation, the deterministic Policy Engine immediately rejects it due to the `maximumDiscountPercent` constraint set by the merchant.

## Auth & Tenant Isolation
All API endpoints dynamically extract the currently authenticated user's `storeId` and `merchantId` and apply them to queries. No queries are built directly from untrusted client IDs.

## Prompt Injection Defense
Context variables (like Customer Names or Product Descriptions) are strictly passed as JSON objects appended below `SYSTEM` instructions, preventing string manipulation overrides. Zod schemas validate the output.

## Webhooks
All Razorpay webhooks require `x-razorpay-signature` verification using `crypto` against the `RAZORPAY_WEBHOOK_SECRET`. Duplicate webhook events are discarded by returning a 200 without reprocessing the state.
