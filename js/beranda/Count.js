/**
 * Count.js — Animasi Penghitung Angka Statistik di Halaman Beranda
 * 
 * Script ini menggerakkan angka statistik (seperti jumlah artikel, persentase gratis)
 * dari 0 hingga ke angka target saat elemen tersebut pertama kali terlihat di layar pengguna.
 * 
 * Menggunakan IntersectionObserver & requestAnimationFrame murni (Vanilla JS) dengan
 * fallback pengecekan posisi viewport untuk keandalan maksimal di semua browser.
 */
(function () {
  'use strict';

  function initCounter() {
    const counters = document.querySelectorAll('.counter');
    if (!counters.length) return;

    /**
     * Menggerakkan angka dari 0 sampai angka target menggunakan requestAnimationFrame
     * @param {HTMLElement} el - Elemen HTML dengan kelas .counter
     */
    function animateCounter(el) {
      if (el.getAttribute('data-counted') === 'true' || el.getAttribute('data-counting') === 'true') return;
      el.setAttribute('data-counting', 'true');

      const target = parseFloat(el.getAttribute('data-target')) || 0;
      const suffix = el.getAttribute('data-suffix') || '';
      const divide = parseFloat(el.getAttribute('data-divide')) || 1;
      const duration = 1000; // Durasi animasi 1 detik agar gesit dan tidak macet
      let startTime = null;
      let isDone = false;

      function finish() {
        if (isDone) return;
        isDone = true;
        let finalValue;
        if (divide > 1) {
          finalValue = (target / divide).toFixed(1).replace('.', ',');
        } else {
          finalValue = target;
        }
        el.textContent = finalValue + suffix;
        el.setAttribute('data-counted', 'true');
        el.removeAttribute('data-counting');
      }

      function step(currentTime) {
        if (isDone) return;
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing fungsi easeOutCubic untuk efek melambat yang halus di akhir
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentVal = target * ease;

        let displayValue;
        if (divide > 1) {
          displayValue = (currentVal / divide).toFixed(1).replace('.', ',');
        } else {
          displayValue = Math.floor(currentVal);
        }
        el.textContent = displayValue + suffix;

        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          finish();
        }
      }

      window.requestAnimationFrame(step);
      // Timer pengaman: menjamin angka pasti sampai dan BERHENTI di nilai akhir target
      setTimeout(finish, duration + 100);
    }

    function triggerAll() {
      counters.forEach((c) => {
        if (c.getAttribute('data-counted') !== 'true') {
          animateCounter(c);
        }
      });
    }

    // Gunakan IntersectionObserver modern untuk memantau visibilitas
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            triggerAll();
            obs.disconnect();
          }
        });
      }, {
        rootMargin: '50px 0px 50px 0px',
        threshold: 0.01
      });

      counters.forEach((c) => observer.observe(c));
    }

    // Pengecekan posisi langsung saat inisialisasi atau scroll
    function checkInView() {
      for (let i = 0; i < counters.length; i++) {
        const rect = counters[i].getBoundingClientRect();
        if (rect.top < window.innerHeight + 100 && rect.bottom > -100) {
          triggerAll();
          window.removeEventListener('scroll', checkInView);
          break;
        }
      }
    }

    checkInView();
    window.addEventListener('scroll', checkInView, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCounter);
  } else {
    initCounter();
  }
})();