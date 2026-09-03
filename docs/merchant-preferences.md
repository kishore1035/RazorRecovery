# Merchant Preferences (Teach RazorRecovery)

Merchants can "teach" the AI their business heuristics via the **MerchantRecoveryPreference** model.

## Decision Flow
1. AI receives the standard Context + Memory.
2. AI also receives active Merchant Preferences.
3. The prompt explicitly instructs the AI to adhere to these preferences.
4. **Safety Net**: Regardless of the AI output, the **Policy Engine** evaluates the final recommendation. If a merchant sets a preference that violates a safety policy, the policy engine blocks the execution.

## Example
Scope: `CUSTOMER_SEGMENT`
Condition: `NEW_CUSTOMER`
Avoided Strategy: `PAYMENT_LINK_WITH_VOUCHER`
