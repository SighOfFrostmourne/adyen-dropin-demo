# Adyen Drop-in Demo (Sessions Flow)

A working integration of **Adyen's Drop-in** component using the **Sessions flow**, built with Node.js (Express) and vanilla JavaScript.

## Architecture

```
┌─────────────────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│   Browser (Frontend)    │      │   Node.js Server    │      │   Adyen API      │
│                         │      │   (Express)         │      │                  │
│  ┌───────────────────┐  │      │                     │      │                  │
│  │  Adyen Drop-in    │  │      │                     │      │                  │
│  │  (Web SDK v6)     │  │      │                     │      │                  │
│  └────────┬──────────┘  │      │                     │      │                  │
│           │              │      │                     │      │                  │
│  1. Page loads           │      │                     │      │                  │
│  2. POST /api/sessions ──┼──────▶ 3. POST /sessions ──┼──────▶                  │
│                          │      │                     │◀─────┤ 4. sessionId +   │
│  5. SDK initialized  ◀───┼──────┤ Return session data │      │    sessionData   │
│     with session         │      │                     │      │                  │
│  6. Shopper enters       │      │                     │      │                  │
│     payment details      │      │                     │      │                  │
│  7. SDK handles ─────────┼──────┼─────────────────────┼──────▶ 8. Authorize     │
│     payment directly     │      │                     │      │                  │
│  9. onPaymentCompleted   │      │                     │      │                  │
│     callback fires       │      │                     │      │                  │
│                          │      │ 10. Webhook ◀───────┼──────┤ AUTHORISATION    │
│                          │      │     (not in demo)   │      │ notification     │
└──────────────────────────┘      └─────────────────────┘      └──────────────────┘
```

## Key Concepts

### Sessions Flow
The **Sessions flow** simplifies integration by combining session creation and payment handling into a single API call. The SDK manages the entire payment lifecycle:

1. **Server** creates a session via `POST /v71/sessions`
2. **SDK** receives `sessionId` + `sessionData` and renders payment methods
3. **SDK** handles payment submission, 3DS challenges, and redirects internally
4. **Server** receives the final result via webhook (production) or the SDK's `onPaymentCompleted` callback (client-side)

### Payment Methods Demonstrated
- **Cards** — with and without 3D Secure authentication
- **Alipay** — redirect-based payment flow (shopper leaves site → returns to `/result`)

## Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd adyen-dropin-demo

# 2. Install dependencies
npm install

# 3. Configure environment variables
#    Edit .env with your Adyen test credentials (already pre-filled)

# 4. Start the server
npm start

# 5. Open in browser
open http://localhost:3000
```

## Project Structure

```
adyen-dropin-demo/
├── src/
│   └── server.js          # Express server — session creation, result handling
├── public/
│   ├── index.html         # Checkout page with Drop-in SDK
│   └── result.html        # Redirect landing page (for Alipay, etc.)
├── .env                   # Adyen credentials (gitignored)
├── .gitignore
├── package.json
└── README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sessions` | Creates Adyen payment session |
| `GET` | `/api/client-config` | Returns client key + environment |
| `GET` | `/result` | Serves redirect result page |

## Testing Card Numbers

| Card | Number | Behavior |
|------|--------|----------|
| Visa (no 3DS) | `4111 1111 1111 1111` | Direct authorisation |
| Visa (3DS2) | `4212 3456 7891 0006` | Triggers 3DS2 challenge |
| Mastercard | `5555 3412 4444 1115` | Direct authorisation |
| Refused | `4000 0000 0000 0002` | Payment refused |

- **Expiry**: any future date (e.g. `03/30`)
- **CVC**: `737` (or any 3 digits)

## Webhooks (Production Note)

In production, **always** verify payment results via webhooks — not client-side callbacks alone. Key webhook event codes:

- `AUTHORISATION` — payment authorized (check `success` field)
- `CANCELLATION` — payment cancelled
- `REFUND` — refund processed
- `CAPTURE` — payment captured (for manual capture flows)

Webhook endpoint would accept `POST /api/webhooks/adyen` and must:
1. Verify HMAC signature
2. Process the event
3. Return `[accepted]` with HTTP 200

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ADYEN_API_KEY` | API key from Adyen Customer Area |
| `ADYEN_MERCHANT_ACCOUNT` | Your merchant account name |
| `ADYEN_CLIENT_KEY` | Client-side key for SDK |
| `ADYEN_ENV` | `test` or `live` |
| `PORT` | Server port (default: 3000) |
