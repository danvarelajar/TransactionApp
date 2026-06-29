// Payment form handling - submit and modal only (validation via HTML5 attributes)
(function() {
  'use strict';

  function closeModal() {
    var modal = document.getElementById('success-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  window.addEventListener('click', function(event) {
    var modal = document.getElementById('success-modal');
    if (event.target === modal) {
      closeModal();
    }
  });

  function init() {
    var form = document.getElementById('payment-form');
    var submitBtn = document.getElementById('submit-btn');
    var message = document.getElementById('message');
    var modalBtn = document.getElementById('modal-ok-btn');

    if (modalBtn) {
      modalBtn.addEventListener('click', closeModal);
    }

    if (!form || !submitBtn || !message) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';
      message.className = 'message-info';
      message.innerHTML = '<p>Processing your payment...</p>';

      fetch('/submit', {
        method: 'POST',
        body: new FormData(form)
      })
      .then(function(response) {
        if (response.ok) {
          var modal = document.getElementById('success-modal');
          if (modal) {
            modal.classList.add('show');
          }
          form.reset();
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Payment';
        } else {
          throw new Error('Submission failed');
        }
      })
      .catch(function() {
        message.className = 'message-error';
        message.innerHTML = '<p>Error processing payment. Please try again.</p>';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Payment';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
