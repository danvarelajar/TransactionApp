// Input formatting functions (separate from validation)
(function() {
  'use strict';
  
  function initFormatters() {
    var cardNumber = document.getElementById('cardNumber');
    var expiry = document.getElementById('expiry');
    
    // Card number formatting (adds spaces every 4 digits)
    // Note: This runs BEFORE validation, so formatting happens first
    if (cardNumber) {
      cardNumber.addEventListener('input', function(e) {
        // Only format, don't validate here (validation is in payment.js)
        var v = this.value.replace(/\s+/g, '').replace(/(\d{4})/g, '$1 ').trim();
        this.value = v.substring(0, 19);
      });
    }
    
    // Expiry date formatting (adds / after MM)
    // Note: This runs BEFORE validation, so formatting happens first
    if (expiry) {
      expiry.addEventListener('input', function(e) {
        // Only format, don't validate here (validation is in payment.js)
        var v = this.value.replace(/\D/g, '');
        if (v.length >= 2) {
          v = v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        this.value = v.substring(0, 5);
      });
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFormatters);
  } else {
    initFormatters();
  }
})();
