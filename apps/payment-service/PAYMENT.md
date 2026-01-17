# Payment Service Documentation

## Overview

The Payment Service handles all payment-related operations for the Youshop platform, integrating with Stripe for secure payment processing.

## Features

✅ **Stripe Checkout Integration** - Create secure checkout sessions  
✅ **Idempotency** - Prevent duplicate payments  
✅ **Order Validation** - Verify order ownership and status  
✅ **Comprehensive Logging** - Full audit trail of all payment operations  
✅ **Type Safety** - Zero 'any' types, full TypeScript support  
✅ **Error Handling** - Graceful handling of all error scenarios

## API Endpoints

### Create Checkout Session

**Endpoint:** `POST /api/v1/payment/checkout`  
**Authentication:** Required (JWT)  
**Description:** Creates a Stripe checkout session for a pending order

**Request Body:**

```json
{
  "orderId": "uuid",
  "successUrl": "https://youshop.com/payment/success?session_id={CHECKOUT_SESSION_ID}",
  "cancelUrl": "https://youshop.com/payment/cancel"
}
```

**Success Response (201):**

```json
{
  "sessionId": "cs_test_a1b2c3d4e5f6g7h8i9j0",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "expiresAt": "2024-01-18T12:00:00.000Z",
  "paymentId": "uuid",
  "orderId": "uuid",
  "amount": 9999,
  "currency": "USD"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid order status or malformed request
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - User cannot pay for another user's order
- `404 Not Found` - Order not found
- `409 Conflict` - Payment already exists for this order

## Environment Variables

```env
# Required
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Optional (with defaults)
STRIPE_SUCCESS_URL=http://localhost:3000/payment/success
STRIPE_CANCEL_URL=http://localhost:3000/payment/cancel
STRIPE_CURRENCY=USD
```

## Database Schema

### Payment Model

```prisma
model Payment {
  id                String        @id @default(uuid())
  orderId           String
  stripeSessionId   String?       @unique
  stripePaymentId   String?       @unique
  amount            Float
  currency          String        @default("USD")
  status            PaymentStatus @default(PENDING)
  metadata          Json?
  idempotencyKey    String?       @unique
  failureReason     String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  order             Order         @relation(fields: [orderId], references: [id])

  @@index([orderId])
  @@index([stripeSessionId])
  @@index([status])
  @@index([createdAt])
  @@map("payments")
}

enum PaymentStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  REFUNDED
  CANCELLED
}
```

## Usage Examples

### 1. Create Checkout Session

```typescript
// Frontend: Create order first
const order = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    items: [{ productId: 'uuid', quantity: 2 }],
  }),
}).then((r) => r.json());

// Create payment checkout session
const checkout = await fetch('/api/v1/payment/checkout', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    orderId: order.id,
  }),
}).then((r) => r.json());

// Redirect to Stripe
window.location.href = checkout.checkoutUrl;
```

### 2. Handle Success/Cancel

```typescript
// Success page (parse session_id from URL)
const params = new URLSearchParams(window.location.search);
const sessionId = params.get('session_id');

// Verify payment status with backend
const payment = await fetch(`/api/v1/payment/verify/${sessionId}`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

if (payment.status === 'SUCCEEDED') {
  // Show success message
}
```

## Idempotency

The service implements idempotency to prevent duplicate payments:

1. **First Request:** Creates new payment and Stripe session
2. **Duplicate Request:** Returns existing session if still valid
3. **Expired Session:** Returns conflict error

## Security Features

✅ **JWT Authentication** - All endpoints require valid JWT  
✅ **Order Ownership Validation** - Users can only pay their own orders  
✅ **Status Validation** - Only PENDING orders can initiate payment  
✅ **Idempotency Keys** - Prevent duplicate charges  
✅ **Error Sanitization** - Sensitive data never exposed in errors  
✅ **Audit Logging** - All operations logged for compliance

## Testing

### Manual Testing with Stripe Test Mode

1. Use Stripe test credit cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
2. Any future expiry date
3. Any 3-digit CVC
4. Any postal code

### Unit Tests

```bash
npm run test apps/payment-service
```

### Integration Tests

```bash
npm run test:e2e payment
```

## Monitoring

All payment operations generate logs with the following structure:

```json
{
  "level": "info",
  "message": "Creating checkout session for order: uuid, user: uuid",
  "context": "PaymentService",
  "timestamp": "2024-01-17T12:00:00.000Z"
}
```

Monitor these events:

- `"Creating checkout session"` - Payment attempt started
- `"Stripe checkout session created"` - Session created successfully
- `"Payment record created"` - Database record created
- `"Payment already exists"` - Idempotency triggered

## Error Handling

### Common Errors

**"Order not found"**

- Cause: Invalid order ID
- Action: Verify order exists

**"Cannot create payment for order with status: PAID"**

- Cause: Order already paid
- Action: Check order status before payment

**"You can only pay for your own orders"**

- Cause: Authorization failure
- Action: Verify JWT contains correct user ID

**"Payment already exists for this order"**

- Cause: Duplicate payment attempt
- Action: Use existing payment session or contact support

## Integration Points

### Dependencies

- **Auth Service** - JWT validation
- **Orders Service** - Order validation and status updates
- **Prisma** - Database operations
- **Stripe** - Payment processing

### Consumed By

- **API Gateway** - Exposes payment endpoints

## Support

For issues or questions:

1. Check logs in `logs/combined.log` and `logs/error.log`
2. Verify Stripe dashboard for session details
3. Review database `payments` table
4. Check application logs for detailed error traces

## Best Practices

1. **Always use test mode** in development
2. **Never commit** `.env` file with real keys
3. **Rotate secrets** regularly in production
4. **Monitor webhook delivery** for reliability
5. **Set up alerts** for payment failures
6. **Implement retry logic** for transient failures
7. **Keep audit logs** for compliance

---
