require("dotenv").config();
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { Client, CheckoutAPI } = require("@adyen/api-library");

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

// ─── Adyen Client ─────────────────────────────────────────────────────
const client = new Client({
  apiKey: ADYEN_API_KEY,
  environment: ADYEN_ENV === "live" ? "LIVE" : "TEST",
});
const { PaymentsApi } = new CheckoutAPI(client);

// ─── POST /api/sessions ──────────────────────────────────────────────
app.post("/api/sessions", async (req, res) => {
  try {
    const { amount, countryCode, shopperLocale, shopperEmail, shopperReference } = req.body;

    const session = await PaymentsApi.sessions({
      merchantAccount: ADYEN_MERCHANT_ACCOUNT,
      amount: amount || { currency: "CNY", value: 10000 }, // ¥100.00
      reference: uuidv4(),
      returnUrl: `${req.protocol}://${req.get("host")}/result`,
      countryCode: countryCode || "CN",
      shopperLocale: shopperLocale || "zh_CN",
      shopperEmail: shopperEmail || "test@example.com",
      shopperReference: shopperReference || `shopper-${Date.now()}`,
      channel: "Web",
    });

    res.json({
      sessionId: session.id,
      sessionData: session.sessionData,
      clientKey: ADYEN_CLIENT_KEY,
      environment: ADYEN_ENV,
    });
  } catch (err) {
    console.error("Session creation failed:", err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// ─── GET /api/sessions/:id (demo only) ───────────────────────────────
app.get("/api/sessions/:id", (req, res) => {
  res.json({
    message: "In production, use webhooks (AUTHORISATION, REFUND, etc.) to track payment status.",
    sessionId: req.params.id,
  });
});

// ─── GET /result ─────────────────────────────────────────────────────
app.get("/result", (req, res) => {
  res.sendFile(path.join(__dirname, '../result.html'));
});

// ─── GET /api/client-config ──────────────────────────────────────────
app.get("/api/client-config", (req, res) => {
  res.json({
    clientKey: ADYEN_CLIENT_KEY,
    environment: ADYEN_ENV,
  });
});

// ─── Start ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment : ${ADYEN_ENV}`);
  console.log(`Merchant    : ${ADYEN_MERCHANT_ACCOUNT || '(not set)'}`);
});
