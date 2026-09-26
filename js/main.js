/**
 * BerTeduh — Animate On Scroll (AOS) & Interaction Engine
 * Lightweight, hardware-accelerated scroll animations combined with Tailwind CSS.
 */
(function () {
  'use strict';

  function initAOS() {
    // Enable CSS animation rules safely only after JS initializes
    document.documentElement.classList.add('aos-ready');

    const selector = '[data-aos], .fade-left, .fade-right, .fade-up, .fade-down, .fade-in, .fade-out, .fade-out-up, .fade-out-down, .fade-out-left, .fade-out-right, .aos-init';
    const elements = Array.from(document.querySelectorAll(selector)).filter((el) => el.id !== 'sapaan-wrapper');
    if (!elements.length) return;

    // Helper: Mark element as settled after entrance finishes so hover lift is instant and lag-free
    const markSettled = (el) => {
      if (el.classList.contains('aos-animate')) {
        el.classList.add('aos-settled');
        el.style.setProperty('transition-delay', '0s', 'important');
      }
    };

    // Helper: Attach zero-delay mouse events so hovering is responsive at millisecond 0
    const attachHoverOptimizations = (el) => {
      el.addEventListener('mouseenter', () => {
        el.style.setProperty('transition-delay', '0s', 'important');
      }, { passive: true });

      el.addEventListener('mouseleave', () => {
        if (el.classList.contains('aos-settled')) {
          el.style.setProperty('transition-delay', '0s', 'important');
        }
      }, { passive: true });
    };

    elements.forEach((el) => {
      attachHoverOptimizations(el);

      // Apply custom inline duration if provided
      const duration = el.getAttribute('data-aos-duration');
      if (duration) {
        el.style.transitionDuration = `${duration}ms`;
      }
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        const isExplicitlyOnce = el.getAttribute('data-aos-once') === 'true';

        if (entry.isIntersecting) {
          // Temporarily un-settle so entrance transition runs
          el.classList.remove('aos-settled');
          el.style.setProperty('transition-delay', '0s', 'important');

          el.classList.add('aos-animate');

          // Backward-compatibility for legacy Tailwind fade-left utility classes
          if (el.classList.contains('fade-left')) {
            el.classList.remove('opacity-0', '-translate-x-10');
            el.classList.add('opacity-100', 'translate-x-0');
          }

          const durationMs = parseInt(el.getAttribute('data-aos-duration') || '850', 10);

          // Once entrance completes, mark settled so card lifts instantly without delay
          const timer = setTimeout(() => {
            markSettled(el);
          }, durationMs + 40);

          // Listen for transitionend as well for fastest possible settlement
          const onTransitionEnd = (e) => {
            if (e.target === el && (e.propertyName === 'transform' || e.propertyName === 'opacity')) {
              el.removeEventListener('transitionend', onTransitionEnd);
              clearTimeout(timer);
              markSettled(el);
            }
          };
          el.addEventListener('transitionend', onTransitionEnd, { once: true });

          if (isExplicitlyOnce) {
            observer.unobserve(el);
          }
        } else {
          // Element has been passed or scrolled out of view -> smooth exit animation
          if (!isExplicitlyOnce) {
            el.classList.remove('aos-animate', 'aos-settled');
            el.style.setProperty('transition-delay', '0s', 'important');
          }
        }
      });
    }, {
      root: null,
      rootMargin: '20px 0px 20px 0px',
      threshold: 0.05
    });

    // Immediate check for elements already in viewport on load
    const vh = window.innerHeight || document.documentElement.clientHeight;
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        el.style.setProperty('transition-delay', '0s', 'important');
        el.classList.add('aos-animate');
        if (el.classList.contains('fade-left')) {
          el.classList.remove('opacity-0', '-translate-x-10');
          el.classList.add('opacity-100', 'translate-x-0');
        }
        const durationMs = parseInt(el.getAttribute('data-aos-duration') || '850', 10);
        setTimeout(() => markSettled(el), durationMs + 40);
      }
      observer.observe(el);
    });

    // Expose refresh helper for dynamically loaded items
    window.AOS = {
      refresh: function () {
        const newElements = Array.from(document.querySelectorAll(selector)).filter((el) => el.id !== 'sapaan-wrapper');
        const currentVh = window.innerHeight || document.documentElement.clientHeight;
        newElements.forEach((el) => {
          attachHoverOptimizations(el);
          if (!el.classList.contains('aos-animate')) {
            el.style.setProperty('transition-delay', '0s', 'important');
            const duration = el.getAttribute('data-aos-duration');
            if (duration) el.style.transitionDuration = `${duration}ms`;
            const rect = el.getBoundingClientRect();
            if (rect.top < currentVh && rect.bottom > 0) {
              el.classList.add('aos-animate');
              if (el.classList.contains('fade-left')) {
                el.classList.remove('opacity-0', '-translate-x-10');
                el.classList.add('opacity-100', 'translate-x-0');
              }
              const durationMs = parseInt(duration || '850', 10);
              setTimeout(() => markSettled(el), durationMs + 40);
            }
            observer.observe(el);
          }
        });
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAOS);
  } else {
    initAOS();
  }
})();