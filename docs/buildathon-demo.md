# Buildathon Demo Guide

Target Duration: 5-8 minutes

## 1. Overview (1 min)
- **Goal:** Show the core product value.
- Start at the `/` Overview dashboard. Point out "Revenue at Risk" and "Net Recovered".
- Highlight the "What RazorRecovery Learned" section. Emphasize that this is not a static tool; it is actively improving based on past recovery outcomes.

## 2. Revenue at Risk -> Golden Case (2 mins)
- Navigate to `/recoveries`. Click on the most recent case for **Rahul Sharma (Nike Air Max 270)**.
- **Narrative:** "Rahul's UPI payment failed. Normally, you'd send a generic payment link. But look what RazorRecovery did."
- Show the AI Recommendation and Counterfactuals (Prediction vs Reality if already completed).
- Explain how the AI chose the action based on maximum *Net* recovered revenue.

## 3. Recovery Lab (1.5 mins)
- Go to `/recovery-lab`.
- Show how a merchant can create A/B tests (e.g., Payment Link vs Voucher) in a strictly controlled manner with budget limits.
- Show `/settings/preferences` (Teach RazorRecovery) where merchants can hardcode behaviors that the AI strictly follows (e.g., "Always use Payment Link for Returning Customers").

## 4. Copilot (1.5 mins)
- Open `/copilot`.
- **Query 1:** "What is my revenue summary for this month?" (Shows context retrieval).
- **Query 2:** "Show me active revenue leaks." (Shows insight capability without hallucinations).
- Point out that Copilot cannot move money—it only proposes actions requiring approval.

## 5. Insights (1 min)
- Briefly show `/insights/leaks`.
- Show how RazorRecovery detects funnel degradation (e.g., UPI failures spiking by 15%) saving the merchant far more than just a single abandoned cart.
