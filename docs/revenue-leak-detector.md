# Revenue Leak Detector

The Revenue Leak Detector actively monitors critical commerce flows to answer: "Is there a larger payment or checkout problem affecting many customers?"

## Methodology
The detector operates continuously in the background. It reads:
1. `RevenueBaselineService` to determine the 30-day historical baseline of success rates for dimensions like `PAYMENT_METHOD` (e.g., UPI, CARD).
2. The past 24 hours of data.
3. If the drop exceeds **15 percentage points**, it generates a `RevenueLeak` with severity `HIGH` or `CRITICAL`.

It automatically estimates recoverable revenue using a conservative mathematical assumption to guide merchant urgency.
