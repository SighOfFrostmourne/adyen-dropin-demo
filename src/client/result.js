import { AdyenCheckout, Dropin } from '@adyen/adyen-web/auto';
import '@adyen/adyen-web/styles/adyen.css';

const params         = new URLSearchParams(window.location.search);
const redirectResult = params.get('redirectResult');
const sessionId      = params.get('sessionId') || sessionStorage.getItem('adyen_sessionId');
const sessionData    = sessionStorage.getItem('adyen_sessionData');
const clientKey      = sessionStorage.getItem('adyen_clientKey');
const environment    = sessionStorage.getItem('adyen_environment');

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
    resultCode === 'Refused'    ? 'refused'    :
    resultCode === 'Error'      ? 'error'      : 'pending'
  }`;

  document.getElementById('result-code').textContent    = resultCode || 'UNKNOWN';
  document.getElementById('result-details').textContent = JSON.stringify(details, null, 2);
}

async function showRedirectResult() {
  if (!sessionId || !sessionData || !clientKey) {
    showResult('Error', { message: 'Missing session info' });
    return;
  }

  if (!redirectResult) {
    showResult('Error', { message: 'No redirectResult in URL' });
    return;
  }

  try {
    const checkout = await AdyenCheckout({
      environment,
      clientKey,
      session: { id: sessionId, sessionData },
      onPaymentCompleted: (result) => { if (result.resultCode) showResult(result.resultCode, result); },
      onPaymentFailed:    (result) => { showResult(result.resultCode || 'Error', result); },
      onError:            (error)  => showResult('Error', { message: error.message }),
    });

    const dropin = new Dropin(checkout).mount(document.getElementById('dropin-container'));
    dropin.handleAdditionalDetails({ data: { details: { redirectResult } } });
  } catch (err) {
    console.error('Redirect handling failed:', err);
    showResult('Error', { message: err.message });
  }
}

showRedirectResult();
