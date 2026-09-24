(function () {
  'use strict';

  function initBottomSheet() {
    var overlay = document.getElementById('pactSheetOverlay');
    var sheet = document.getElementById('pactBottomSheet');
    var openBtn = document.getElementById('open-pact-sheet-btn');
    var closeBtn = document.getElementById('pactSheetCloseBtn');

    if (!overlay || !sheet) {
      return;
    }

    var isStandalone = sheet.getAttribute('data-standalone') === 'true';
    var closeUrl = sheet.getAttribute('data-close-url') || '/';

    function openSheet() {
      overlay.classList.add('active');
      sheet.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
      sheet.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      var firstInput = sheet.querySelector('input:not([type="hidden"]), select, textarea');
      if (firstInput) {
        setTimeout(function () {
          firstInput.focus();
        }, 200);
      }
    }

    function closeSheet() {
      sheet.classList.remove('active');
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      sheet.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      if (isStandalone) {
        setTimeout(function () {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.href = closeUrl;
          }
        }, 300);
      } else if (openBtn) {
        openBtn.focus();
      }
    }

    if (openBtn) {
      openBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openSheet();
      });
    }

    var otherTriggers = document.querySelectorAll('[data-open-pact-sheet]');
    otherTriggers.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openSheet();
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        closeSheet();
      });
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        e.preventDefault();
        closeSheet();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (sheet.classList.contains('active')) {
          e.preventDefault();
          closeSheet();
        }
      }
    });

    // If standalone page, trigger opening animation on load
    if (isStandalone) {
      requestAnimationFrame(function () {
        setTimeout(function () {
          openSheet();
        }, 50);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBottomSheet);
  } else {
    initBottomSheet();
  }
})();
