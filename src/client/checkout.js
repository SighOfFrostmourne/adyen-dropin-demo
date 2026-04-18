import { AdyenCheckout, Dropin } from '@adyen/adyen-web/auto';
import '@adyen/adyen-web/styles/adyen.css';

// ═════════════════════════════════════════════════════════════════════
//  Logging helper — displays requests/responses/events in the UI
// ═════════════════════════════════════════════════════════════════════
const logEl = document.getElementById('log-entries');

function log(type, message, data) {
  const li = document.createElement('li');
  li.className = `log-entry log-entry--${type}`;
  const time = new Date().toLocaleTimeString();
  let text = `[${time}] ${message}`;
  if (data) text += '\n' + JSON.stringify(data, null, 2);
  li.textContent = text;
  logEl.prepend(li);
  console.log(`[${type}]`, message, data || '');
}

// ═════════════════════════════════════════════════════════════════════
//  1. Create a payment session via our backend
// ═════════════════════════════════════════════════════════════════════
async function createSession() {
  const requestBody = {
    amount: { currency: 'USD', value: 7100 }, // $71.00 in minor units
    countryCode: 'US',
    shopperLocale: 'en_US',
  };

  log('req', 'POST /api/sessions', requestBody);

  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const data = await res.json();

  if (!res.ok) {
    log('err', `Session creation failed (${res.status})`, data);
    throw new Error(data.error || 'Failed to create session');
  }

  log('res', 'Session created', {
    sessionId: data.sessionId,
    environment: data.environment,
  });

  return data;
}

// ═════════════════════════════════════════════════════════════════════
//  2. Mount the Adyen Drop-in using Sessions flow
// ═════════════════════════════════════════════════════════════════════
async function initCheckout() {
  const container = document.getElementById('dropin-container');

  try {
    const { sessionId, sessionData, clientKey, environment } = await createSession();

    log('event', 'Initializing AdyenCheckout SDK…');

    const checkout = await AdyenCheckout({
      environment,
      clientKey,
      analytics: { enabled: true },
      session: {
        id: sessionId,
        sessionData,
      },

      onPaymentCompleted: (result) => {
        log('event', 'onPaymentCompleted', result);
        handlePaymentResult(result);
      },

      onPaymentFailed: (result) => {
        log('err', 'onPaymentFailed', result);
        handlePaymentResult(result);
      },

      onError: (error) => {
        log('err', 'onError', { name: error.name, message: error.message });
        container.innerHTML = `
          <div class="error-box">
            ⚠ Payment error: ${error.message}
            <code>${JSON.stringify(error, null, 2)}</code>
          </div>`;
      },

      beforeSubmit: (data, component, actions) => {
        log('event', 'beforeSubmit — payment data', {
          paymentMethod: data.paymentMethod?.type,
        });
        actions.resolve(data);
      },
    });

    new Dropin(checkout).mount(container);
    log('event', 'Drop-in mounted successfully');
  } catch (err) {
    console.error('Init failed:', err);
    container.innerHTML = `
      <div class="error-box">
        ⚠ Failed to initialize: ${err.message}
        <code>${err.stack}</code>
      </div>`;
  }
}

// ═════════════════════════════════════════════════════════════════════
//  3. Handle payment result
// ═════════════════════════════════════════════════════════════════════
function handlePaymentResult(result) {
  const resultCode = result.resultCode;
  log('event', `Payment result: ${resultCode}`, result);

  if (resultCode === 'Authorised') {
    log('event', '✅ Payment authorised!');
  } else if (resultCode === 'Refused') {
    log('err', '❌ Payment refused.');
  } else if (resultCode === 'Pending' || resultCode === 'Received') {
    log('event', '⏳ Payment pending / received.');
  }
}

// ═════════════════════════════════════════════════════════════════════
//  Boot
// ═════════════════════════════════════════════════════════════════════
initCheckout();
