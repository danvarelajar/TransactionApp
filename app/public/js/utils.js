// Simple utility script for SRI testing
// Edit this file to test Subresource Integrity (SRI) validation

(function() {
  console.log('[utils.js] Loaded successfully');
  
  // Simple function that can be called from the page
  window.paymentUtils = {
    version: '1.0.0',
    initialized: true,
    
    log: function(message) {
      console.log('[paymentUtils]', message);
    },
    
    getVersion: function() {
      return this.version;
    }
  };
  
  // Log initialization
  window.paymentUtils.log('Payment utilities initialized');
})();
