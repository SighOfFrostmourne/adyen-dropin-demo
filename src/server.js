/**
 * Adyen Drop-in Integration - Backend Server
 * 
 * Architecture:
 *   Browser (Drop-in SDK) <---> This Server <---> Adyen API
 *
 * Flow:
 *   1. Client loads checkout page
 *   2. Client calls POST /api/sessions to create a payment session
 *   3. Server calls Adyen /sessions endpoint, returns session data
 *   4. Drop-in SDK uses sessionId + sessionData to render payment form
 *   5. SDK handles payment internally (including 3DS, redirects)
 *   6. On completion, client redirects to /result with sessionId
 *   7. Server can verify payment status via webhook (not implemented in demo)
 */
require("dotenv").config();
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

// ─── Configuration ───────────────────────────────────────────────────
const {
  ADYEN_API_KEY,
  ADYEN_MERCHANT_ACCOUNT,
  ADYEN_CLIENT_KEY,
  ADYEN_ENV = "test",
  PORT = 3000,
} = process.env;

const CHECKOUT_API_VERSION = "v71";
const BASE_URL =
  ADYEN_ENV === "live"
    ? "https://checkout-live.adyen.com"
    : "https://checkout-test.adyen.com";

// ─── Helper: call Adyen API ──────────────────────────────────────────
async function adyenRequest(endpoint, body) {
  const url = `${BASE_URL}/${CHECKOUT_API_VERSION}/${endpoint}`;
  console.log(`\n→ POST ${url}`);
  console.log("  Request:", JSON.stringify(body, null, 2));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": ADYEN_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const err = new Error(`Adyen API returned non-JSON response (${res.status}): ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  console.log(`  Response (${res.status}):`, JSON.stringify(data, null, 2));

  if (!res.ok) {
    const err = new Error(data.message || "Adyen API error");
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

// ─── POST /api/sessions ──────────────────────────────────────────────
// Creates a payment session on Adyen. The Drop-in SDK will use the
// returned sessionId and sessionData to render the checkout UI and
// handle the full payment lifecycle (including 3DS and redirects).
app.post("/api/sessions", async (req, res) => {
  try {
    const orderRef = uuidv4();
    const { amount, countryCode, shopperLocale, shopperEmail, shopperReference } = req.body;

    const sessionRequest = {
      merchantAccount: ADYEN_MERCHANT_ACCOUNT,
      amount: amount || { currency: "CNY", value: 10000 }, // ¥100.00
      reference: orderRef,
      returnUrl: `${req.protocol}://${req.get("host")}/result?sessionId={sessionId}&redirectResult={redirectResult}`,
      countryCode: countryCode || "CN",
      shopperLocale: shopperLocale || "zh_CN",
      shopperEmail: shopperEmail || "test@example.com",
      shopperReference: shopperReference || `shopper-${Date.now()}`,
      channel: "Web",
      // Allow specific payment methods relevant to the demo
      // Cards (with/without 3DS) + Alipay (redirect-based)
    };

    const session = await adyenRequest("sessions", sessionRequest);

    res.json({
      sessionId: session.id,
      sessionData: session.sessionData,
      clientKey: ADYEN_CLIENT_KEY,
      environment: ADYEN_ENV,
    });
  } catch (err) {
    console.error("Session creation failed:", err);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.details,
    });
  }
});

// ─── GET /api/sessions/:id (optional status check) ──────────────────
// In production, payment results should be verified via webhooks.
// This endpoint is for demo/debugging purposes only.
app.get("/api/sessions/:id", async (req, res) => {
  try {
    // Sessions flow doesn't have a direct "get session" endpoint.
    // Payment result is handled by the SDK's onPaymentCompleted callback.
    // In production, you'd rely on webhooks for authoritative results.
    res.json({
      message:
        "In production, use webhooks (AUTHORISATION, REFUND, etc.) to track payment status. The SDK's onPaymentCompleted provides the client-side result.",
      sessionId: req.params.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /result ─────────────────────────────────────────────────────
app.get("/result", (req, res) => {
  res.sendFile(path.join(__dirname, '../result.html'));
});

// ─── GET /client-config ──────────────────────────────────────────────
// Expose non-secret client configuration
app.get("/api/client-config", (req, res) => {
  res.json({
    clientKey: ADYEN_CLIENT_KEY,
    environment: ADYEN_ENV,
  });
});

// ─── Start ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║   Adyen Drop-in Demo Server                         ║
║   http://localhost:${PORT}                              ║
║                                                      ║
║   Environment: ${ADYEN_ENV.padEnd(37)}║
║   Merchant:    ${ADYEN_MERCHANT_ACCOUNT.padEnd(37)}║
╚══════════════════════════════════════════════════════╝
  `);
});
