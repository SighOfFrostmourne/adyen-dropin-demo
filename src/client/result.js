import '@adyen/adyen-web/styles/adyen.css';

const params         = new URLSearchParams(window.location.search);
const redirectResult = params.get('redirectResult');
const sessionId      = params.get('sessionId') || sessionStorage.getItem('adyen_sessionId');

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

  document.getElementById('result-code').textContent    = resultCode || 'UNKNOWN';
  document.getElementById('result-details').textContent = JSON.stringify(details, null, 2);
}

async function handleRedirectResult() {
  if (!sessionId) {
    showResult('Error', { message: 'No sessionId in URL' });
    return;
  }

  if (!redirectResult) {
    showResult('Error', { message: 'No redirectResult in URL' });
    return;
  }

  try {
    const res = await fetch('/api/payments/details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirectResult }),
    });

    const data = await res.json();

    if (!res.ok) {
      showResult('Error', data);
      return;
    }

    showResult(data.resultCode, data.details);
  } catch (err) {
    console.error('Redirect handling failed:', err);
    showResult('Error', { message: err.message });
  }
}

handleRedirectResult();
