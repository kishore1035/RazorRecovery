# Commerce Data Model

The RazorRecovery data architecture maps out the complete customer journey, explicitly separating checkout intention from actual payment processing. This separation is required to correctly differentiate **Checkout Abandonment** from **Payment Failures** for the future Recovery Engine.

## Core Models

### 1. `Customer`
Belongs to a `Store`. Stores contact information and unique `externalCustomerId` references. Customers contain multiple `Orders` and `CheckoutSessions`.

### 2. `Product`
Belongs to a `Store`. Defines standard product details, SKU, and a `price` (stored consistently in *integer minor units*). Avoids floating point inaccuracies. Inventory states (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, `UNKNOWN`) are supported natively.

### 3. `Cart` & `CartItem`
Belongs to a `Store` (and optionally a `Customer` for Guest Checkouts in future). Represents the transient pre-checkout state. 

### 4. `Order` & `OrderItem`
Created upon moving to the Checkout phase. `OrderItem` preserves `productNameSnapshot` and unit prices at the time of purchase ensuring future product mutations don't incorrectly retroactively alter historical orders. Subtotal, Tax, Shipping, and Total are stored in integer minor units.
An order's status (`CREATED`, `PAYMENT_PENDING`, `PAID`, `FAILED`, `CANCELLED`, `REFUNDED`) is independent of any single payment attempt.

### 5. `CheckoutSession` & `CheckoutEvent`
Crucial entity representing the *Journey*. Contains the `startedAt`, `lastActivityAt`, and an ordered list of `CheckoutEvent`s (`PRODUCT_VIEWED`, `ADDED_TO_CART`, `CHECKOUT_STARTED`, `PAYMENT_METHOD_SELECTED`, `PAYMENT_ATTEMPTED`, `PAYMENT_FAILED`, `PAYMENT_COMPLETED`, `CHECKOUT_ABANDONED`).

### 6. `Payment`
A one-to-many relationship attached to `Order`. Maps `method` (UPI, CARD, etc.), and in the future, standardizes integrations with the Razorpay Webhook Engine (`razorpayPaymentId`). Maintains granular status like `AUTHORIZED`, `CAPTURED`, `FAILED`.

## Tenant Isolation Boundary
All queries must execute via `withTenant(merchantId)` wrapper resolving the active authenticated user session. Every child entity is validated against its Parent `Store`, mapping back to the `Merchant`. Client-side IDs are strictly validated during fetching.
