# Adyen Drop-in Demo (Sessions Flow)

A working integration of **Adyen's Drop-in** component using the **Sessions flow**, built with Node.js (Express) and vanilla JavaScript. No frontend framework — just esbuild for bundling and Express for serving.

## Architecture

```
┌─────────────────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│   Browser (Frontend)    │      │   Node.js Server    │      │   Adyen API      │
│                         │      │   (Express :3000)   │      │                  │
│  1. Shopper clicks      │      │                     │      │                  │
│     "Confirm & Pay"     │      │                     │      │                  │
│  2. POST /api/sessions ─┼──────▶ 3. PaymentsApi     ─┼──────▶                  │
│                         │      │    .sessions()      │◀─────┤ 4. sessionId +   │
│  5. Drop-in mounts  ◀───┼──────┤ Return session data │      │    sessionData   │
│     (Adyen Web v6)      │      │                     │      │                  │
│  6. Shopper pays        │      │                     │      │                  │
│  7. SDK submits ────────┼──────┼─────────────────────┼──────▶ 8. Authorise     │
│     payment directly    │      │                     │      │                  │
│  9. onPaymentCompleted /│      │ 10. Webhook ◀───────┼──────┤ AUTHORISATION    │
│     onPaymentFailed     │      │     (not in demo)   │      │ notification     │
│     callback fires      │      │                     │      │                  │
│                         │      │                     │      │                  │
│  [Redirect payments]    │      │                     │      │                  │
│  11. Redirect back with │      │                     │      │                  │
│      redirectResult     │      │                     │      │                  │
│  12. Drop-in calls      │      │                     │      │                  │
│      handleAdditional   ┼──────┼─────────────────────┼──────▶ 13. resultCode  │
│      Details() directly │      │                     │◀─────┤                  │
└─────────────────────────┘      └─────────────────────┘      └──────────────────┘
```

## Key Concepts

### Sessions Flow
The **Sessions flow** simplifies integration — the server creates one session and the SDK manages the entire payment lifecycle:

1. **Server** creates a session via `@adyen/api-library`'s `PaymentsApi.sessions()`
2. **SDK** receives `sessionId` + `sessionData` and renders payment methods
3. **SDK** handles payment submission, 3DS challenges, and redirects internally
4. **Callbacks** (`onPaymentCompleted`, `onPaymentFailed`) fire on the client with the final result

### Redirect Payments
For redirect-based methods (iDEAL, Alipay), after the shopper returns to `/result`, the Drop-in is remounted with the original session. It calls `handleAdditionalDetails()` directly — no server round-trip needed. The SDK finalizes the payment and triggers `onPaymentCompleted` or `onPaymentFailed`.

### Card Payment Results
Card payments (including 3DS) are handled entirely on the checkout page:
- **Authorised / Pending** — logged in the debug panel
- **Refused** — Drop-in displays an inline error via `component.setStatus('error')`

### Payment Methods Demonstrated
- **Cards** — with and without 3D Secure (3DS2 challenge)
- **iDEAL** — redirect-based, requires EUR + Netherlands
- **Alipay** — redirect-based, requires CNY + China

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/SighOfFrostmourne/adyen-dropin-demo.git
cd adyen-dropin-demo

# 2. Install dependencies (client bundles are built automatically via `prepare`)
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your Adyen test credentials

# 4. Start the server
npm start
# or for development (auto-restarts on server changes):
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **HTTPS note**: Browser autofill for payment forms requires HTTPS. Use [ngrok](https://ngrok.com) (`ngrok http 3000`) to get a temporary HTTPS URL for local testing.

## Project Structure

```
adyen-dropin-demo/
├── src/
│   ├── server.js              # Express server + Adyen API via @adyen/api-library
│   └── client/
│       ├── checkout.js        # Checkout page: session creation, Drop-in mount
│       └── result.js          # Result page: redirect result handling
├── public/
│   ├── checkout.js            # Bundled checkout script (esbuild output, gitignored)
│   ├── checkout.css           # Bundled Adyen SDK styles (gitignored)
│   ├── result.js              # Bundled result script (esbuild output, gitignored)
│   ├── result.css             # Bundled result styles (gitignored)
│   └── styles/
│       ├── base.css           # Shared CSS variables and reset
│       ├── checkout.css       # Checkout page styles + Drop-in overrides
│       └── result.css         # Result page styles
├── index.html                 # Checkout page
├── result.html                # Result page (redirect return + card results)
├── .env                       # Adyen credentials (gitignored)
├── .env.example               # Credential template
├── package.json
└── README.md
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run bundle` | Bundle client JS with esbuild (run after editing `src/client/`) |
| `npm run dev` | Bundle + start server with `--watch` for auto-restart |
| `npm start` | Bundle + start server (production) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Serves checkout page |
| `GET` | `/result` | Serves result page |
| `POST` | `/api/sessions` | Creates Adyen payment session via `@adyen/api-library` |
| `GET` | `/api/client-config` | Returns `clientKey` + `environment` |

## Testing Card Numbers

| Card | Number | Behavior |
|------|--------|----------|
| Visa (no 3DS) | `4111 1111 1111 1111` | Direct authorisation |
| Visa (3DS2) | `4212 3456 7891 0006` | Triggers 3DS2 challenge |
| Mastercard | `5555 3412 4444 1115` | Direct authorisation |
| Refused | `4000 0000 0000 0002` | Payment refused |

- **Expiry**: any future date (e.g. `03/30`)
- **CVC**: `737` 

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
| `ADYEN_CLIENT_KEY` | Client-side key for SDK (starts with `test_`) |
| `ADYEN_ENV` | `test` or `live` |
| `PORT` | Server port (default: `3000`) |
