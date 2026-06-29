// Input formatting - loaded on checkout but not initialized
(function() {
  'use strict';

  console.log('[formatters.js] Loaded successfully');

  function initFormatters() {
    var cardNumber = document.getElementById('cardNumber');
    var expiry = document.getElementById('expiry');

    if (cardNumber) {
      cardNumber.addEventListener('input', function() {
        var v = this.value.replace(/\s+/g, '').replace(/(\d{4})/g, '$1 ').trim();
        this.value = v.substring(0, 19);
      });
    }

    if (expiry) {
      expiry.addEventListener('input', function() {
        var v = this.value.replace(/\D/g, '');
        if (v.length >= 2) {
          v = v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        this.value = v.substring(0, 5);
      });
    }
  }

  window.paymentFormatters = {
    version: '1.0.0',
    enabled: false,
    init: initFormatters
  };
})();
