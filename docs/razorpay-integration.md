# Razorpay Integration

The Razorpay integration handles actual Payment interactions securely via Server Actions and Next.js Webhooks.

## Environment Variables
- `RAZORPAY_KEY_ID`: Used to initialize the `razorpay` SDK in test or live mode.
- `RAZORPAY_KEY_SECRET`: Private secret for creating orders and fetching payment information. **Never exposed to the frontend.**
- `RAZORPAY_WEBHOOK_SECRET`: Secure string used to cryptographically verify incoming webhook payloads.

## Webhooks
Located at `POST /api/webhooks/razorpay`.
- **Signature Verification**: We compute an `HMAC-SHA256` signature using the raw request body and compare it with the `x-razorpay-signature` header via `crypto.timingSafeEqual`.
- **Idempotency**: All processed events are recorded in `WebhookEvent` mapping `providerEventId` (using `x-razorpay-event-id`). Any duplicate hits are instantly ignored returning a 200 OK.
- **Transactional Updates**: When `payment.captured` or `payment.failed` is received, we execute a Prisma `$transaction` combining `payment` creation and `order` state updates synchronously.

## Payment Links
We support Payment Link creation natively via `RazorpayService.createPaymentLink`. The resulting short URLs and provider metadata are tracked locally inside the `PaymentLink` model to facilitate subsequent SMS/Email recoveries in future chunks.
