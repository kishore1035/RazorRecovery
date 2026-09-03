# Notification System

Outbound communication uses an explicit abstraction `NotificationProvider`.

## Simulated Truthfulness
If no third-party provider (e.g. Twilio or Gupshup) is wired up, the notification is explicitly marked as `SIMULATED` with a delivery state of `NOT_APPLICABLE`. The UI will reflect "Simulation — not delivered". The application *never* fakes delivery success.

## Context Injection
Variables injected into the notification (customer name, store name, Razorpay Payment Link) are sourced from canonical database entities. Untrusted user inputs are discarded.
