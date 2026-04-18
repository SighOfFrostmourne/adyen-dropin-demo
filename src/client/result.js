import { AdyenCheckout } from '@adyen/adyen-web/auto';
import '@adyen/adyen-web/styles/adyen.css';

/**
 * Result Page Logic
 *
 * After a redirect-based payment (e.g. Alipay), the shopper is
 * redirected back here with `sessionId` and `redirectResult` in
 * the URL query parameters.
 *
 * We re-initialize AdyenCheckout with the same session so the SDK
 * can finalize the payment and give us the result.
 */

const params = new URLSearchParams(window.location.search);
const sessionId = params.get('sessionId');
const redirectResult = params.get('redirectResult');

const icons = {
  Authorised: '✅',
  Refused:    '❌',
  Cancelled:  '🚫',
  Pending:    '⏳',
  Received:   '📩',
  Error:      '⚠️',
};

function showResult(resultCode, details) {
  document.getElementById('result-icon').textContent = icons[resultCode] || icons.Error;

  document.getElementById('result-title').textContent =
    resultCode === 'Authorised' ? 'Payment Successful'  :
    resultCode === 'Refused'    ? 'Payment Refused'     :
    resultCode === 'Cancelled'  ? 'Payment Cancelled'   :
    `Payment ${resultCode || 'Unknown'}`;

  document.getElementById('result-title').className = `result-title status-${
    resultCode === 'Authorised' ? 'authorised' :
    resultCode === 'Refused'    ? 'refused'    : 'pending'
  }`;

  document.getElementById('result-code').textContent = resultCode || 'UNKNOWN';
  document.getElementById('result-details').textContent = JSON.stringify(details, null, 2);
}

async function handleRedirectResult() {
  if (!sessionId) {
    showResult('Error', { message: 'No sessionId in URL' });
    return;
  }

  try {
    const configRes = await fetch('/api/client-config');
    const { clientKey, environment } = await configRes.json();

    const checkout = await AdyenCheckout({
      environment,
      clientKey,
      analytics: { enabled: false },
      session: { id: sessionId },

      onPaymentCompleted: (result) => {
        console.log('onPaymentCompleted:', result);
        showResult(result.resultCode, result);
      },

      onPaymentFailed: (result) => {
        console.log('onPaymentFailed:', result);
        showResult(result.resultCode || 'Refused', result);
      },

      onError: (error) => {
        console.error('onError:', error);
        showResult('Error', { name: error.name, message: error.message });
      },
    });

    if (redirectResult) {
      checkout.submitDetails({ details: { redirectResult } });
    }
  } catch (err) {
    console.error('Redirect handling failed:', err);
    showResult('Error', { message: err.message });
  }
}

handleRedirectResult();
