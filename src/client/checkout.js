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
//  Amount / Currency helpers
// ═════════════════════════════════════════════════════════════════════
const currencySymbols = { CNY: '¥', EUR: '€', USD: '$', GBP: '£', AUD: 'A$', SGD: 'S$', HKD: 'HK$' };

function getAmountConfig() {
  const currency   = document.getElementById('currency-select').value;
  const countryCode = document.getElementById('country-select').value;
  const majorUnits = parseFloat(document.getElementById('amount-input').value) || 0;
  return {
    currency,
    countryCode,
    value:   Math.round(majorUnits * 100),
    display: `${currencySymbols[currency] || currency}${majorUnits.toFixed(2)}`,
  };
}

function updatePriceDisplay() {
  const { display } = getAmountConfig();
  document.getElementById('item-price').textContent  = display;
  document.getElementById('total-price').textContent = display;
}

document.getElementById('currency-select').addEventListener('change', updatePriceDisplay);
document.getElementById('amount-input').addEventListener('input',  updatePriceDisplay);
document.getElementById('country-select').addEventListener('change', updatePriceDisplay);
updatePriceDisplay();

// ═════════════════════════════════════════════════════════════════════
//  1. Create a payment session via our backend
// ═════════════════════════════════════════════════════════════════════
async function createSession() {
  const { currency, value, countryCode } = getAmountConfig();
  const requestBody = {
    amount: { currency, value },
    countryCode,
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

  sessionStorage.setItem('adyen_sessionId',   data.sessionId);
  sessionStorage.setItem('adyen_sessionData', data.sessionData);
  sessionStorage.setItem('adyen_clientKey',   data.clientKey);
  sessionStorage.setItem('adyen_environment', data.environment);

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

      onPaymentCompleted: (result, component) => {
        log('event', 'onPaymentCompleted', result);
        handlePaymentResult(result, component);
      },

      onPaymentFailed: (result, component) => {
        log('err', 'onPaymentFailed', result);
        handlePaymentResult(result, component);
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

    new Dropin(checkout, {
      paymentMethodsConfiguration: {
        card: {
          styles: {
            base:        { color: '#ffffff', fontSize: '15px', caretColor: '#ffffff' },
            placeholder: { color: '#64748b' },
            error:       { color: '#ffffff' },
            validated:   { color: '#ffffff' },
          },
        },
        threeDS2: {
          styles: {
            base:  { color: '#ffffff', background: '#111827' },
            label: { color: '#ffffff' },
          },
        },
      },
    }).mount(container);
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
function handlePaymentResult(result, component) {
  const resultCode = result.resultCode;
  log('event', `Payment result: ${resultCode}`, result);

  if (resultCode === 'Authorised') {
    log('event', '✅ Payment authorised!');
  } else if (resultCode === 'Refused') {
    component.setStatus('error', { message: 'Payment refused. Please try a different payment method.' });
  } else if (resultCode === 'Pending' || resultCode === 'Received') {
    log('event', '⏳ Payment pending / received.');
  }
}

// ═════════════════════════════════════════════════════════════════════
//  Boot — wait for confirm button click
// ═════════════════════════════════════════════════════════════════════
document.getElementById('confirm-btn').addEventListener('click', () => {
  const container = document.getElementById('dropin-container');
  container.innerHTML = `
    <div class="loader">
      <div class="loader__spinner"></div>
      <div class="loader__text">Creating payment session…</div>
    </div>`;
  initCheckout();
});
