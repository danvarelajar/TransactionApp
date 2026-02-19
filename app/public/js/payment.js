// Payment form handling - consolidated validation and submission logic
(function() {
  'use strict';
  
  // Shared validation functions (used by both submit and real-time validation)
  var Validation = {
    validateExpiry: function(expiry) {
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
    },
    
    validateCardName: function(name) {
      if (!name || name.trim().length < 3) return false;
      var trimmed = name.trim();
      var words = trimmed.split(/\s+/);
      if (words.length < 2) return false;
      var hasNumbers = /\d/.test(trimmed);
      if (hasNumbers) return false;
      return true;
    },
    
    validateCardNumber: function(cardNumber) {
      if (!cardNumber) return false;
      var cleaned = cardNumber.replace(/\s/g, '');
      if (cleaned.length < 13 || cleaned.length > 19) return false;
      if (!/^\d+$/.test(cleaned)) return false;
      return true;
    },
    
    validateCVV: function(cvv) {
      if (!cvv) return false;
      if (cvv.length < 3 || cvv.length > 4) return false;
      if (!/^\d+$/.test(cvv)) return false;
      return true;
    }
  };
  
  // Modal handling
  function closeModal() {
    var modal = document.getElementById('success-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }
  
  // Close modal on background click
  window.addEventListener('click', function(event) {
    var modal = document.getElementById('success-modal');
    if (event.target === modal) {
      closeModal();
    }
  });
  
  // Close modal button handler (no inline onclick)
  function initModalButton() {
    var modalBtn = document.getElementById('modal-ok-btn');
    if (modalBtn) {
      modalBtn.addEventListener('click', closeModal);
    }
  }
  
  // Expose closeModal globally (for compatibility)
  window.closeModal = closeModal;
  
  // Form submission handler
  function initFormSubmission() {
    var form = document.getElementById('payment-form');
    var submitBtn = document.getElementById('submit-btn');
    var message = document.getElementById('message');
    
    if (!form || !submitBtn || !message) return;
    
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      var cardNumber = document.getElementById('cardNumber').value;
      var expiry = document.getElementById('expiry').value;
      var cvv = document.getElementById('cvv').value;
      var cardName = document.getElementById('cardName').value;
      
      var errors = [];
      var cardNumberEl = document.getElementById('cardNumber');
      var expiryEl = document.getElementById('expiry');
      var cvvEl = document.getElementById('cvv');
      var cardNameEl = document.getElementById('cardName');
      
      // Validate all fields
      if (!Validation.validateCardNumber(cardNumber)) {
        errors.push('Card number must be 13-19 digits');
        if (cardNumberEl) cardNumberEl.style.borderColor = '#f5576c';
      } else {
        if (cardNumberEl) cardNumberEl.style.borderColor = '#e0e0e0';
      }
      
      if (!Validation.validateExpiry(expiry)) {
        errors.push('Expiry date must be in MM/YY format and not expired');
        if (expiryEl) expiryEl.style.borderColor = '#f5576c';
      } else {
        if (expiryEl) expiryEl.style.borderColor = '#e0e0e0';
      }
      
      if (!Validation.validateCVV(cvv)) {
        errors.push('CVV must be 3-4 digits');
        if (cvvEl) cvvEl.style.borderColor = '#f5576c';
      } else {
        if (cvvEl) cvvEl.style.borderColor = '#e0e0e0';
      }
      
      if (!Validation.validateCardName(cardName)) {
        errors.push('Name on card must contain at least first and last name (no numbers)');
        if (cardNameEl) cardNameEl.style.borderColor = '#f5576c';
      } else {
        if (cardNameEl) cardNameEl.style.borderColor = '#e0e0e0';
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
      
      // Submit form via fetch
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
  
  // Real-time validation handlers
  function initRealTimeValidation() {
    var cardNumber = document.getElementById('cardNumber');
    var expiry = document.getElementById('expiry');
    var cvv = document.getElementById('cvv');
    var cardName = document.getElementById('cardName');
    
    if (cardNumber) {
      cardNumber.addEventListener('input', function() {
        // Real-time validation
        if (this.value.length > 0) {
          if (Validation.validateCardNumber(this.value)) {
            this.style.borderColor = '#28a745';
          } else {
            this.style.borderColor = '#f5576c';
          }
        } else {
          this.style.borderColor = '#e0e0e0';
        }
      });
      
      cardNumber.addEventListener('blur', function() {
        if (this.value.length > 0 && !Validation.validateCardNumber(this.value)) {
          this.style.borderColor = '#f5576c';
        }
      });
    }
    
    if (expiry) {
      expiry.addEventListener('input', function() {
        // Real-time validation
        if (this.value.length === 5) {
          if (Validation.validateExpiry(this.value)) {
            this.style.borderColor = '#28a745';
          } else {
            this.style.borderColor = '#f5576c';
          }
        } else if (this.value.length > 0) {
          this.style.borderColor = '#e0e0e0';
        } else {
          this.style.borderColor = '#e0e0e0';
        }
      });
      
      expiry.addEventListener('blur', function() {
        if (this.value.length > 0 && !Validation.validateExpiry(this.value)) {
          this.style.borderColor = '#f5576c';
        }
      });
    }
    
    if (cvv) {
      cvv.addEventListener('input', function() {
        // Real-time validation
        if (this.value.length > 0) {
          if (Validation.validateCVV(this.value)) {
            this.style.borderColor = '#28a745';
          } else {
            this.style.borderColor = '#f5576c';
          }
        } else {
          this.style.borderColor = '#e0e0e0';
        }
      });
      
      cvv.addEventListener('blur', function() {
        if (this.value.length > 0 && !Validation.validateCVV(this.value)) {
          this.style.borderColor = '#f5576c';
        }
      });
    }
    
    if (cardName) {
      cardName.addEventListener('input', function() {
        // Real-time validation
        if (this.value.length > 0) {
          if (Validation.validateCardName(this.value)) {
            this.style.borderColor = '#28a745';
          } else {
            this.style.borderColor = '#f5576c';
          }
        } else {
          this.style.borderColor = '#e0e0e0';
        }
      });
      
      cardName.addEventListener('blur', function() {
        if (this.value.length > 0 && !Validation.validateCardName(this.value)) {
          this.style.borderColor = '#f5576c';
        }
      });
    }
  }
  
  // Initialize when DOM is ready
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        initFormSubmission();
        initRealTimeValidation();
        initModalButton();
      });
    } else {
      initFormSubmission();
      initRealTimeValidation();
      initModalButton();
    }
  }
  
  init();
})();
