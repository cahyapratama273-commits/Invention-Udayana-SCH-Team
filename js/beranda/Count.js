/**
 * Count.js — Animasi Penghitung Angka Statistik di Halaman Beranda
 * 
 * Script ini menggerakkan angka statistik (seperti jumlah pengguna, jam relaksasi, dll)
 * dari 0 hingga ke angka target saat elemen tersebut pertama kali terlihat di layar pengguna.
 * 
 * Menggunakan IntersectionObserver & requestAnimationFrame murni (Vanilla JS) yang sangat hemat CPU & baterai.
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
      const target = parseFloat(el.getAttribute('data-target')) || 0;
      const suffix = el.getAttribute('data-suffix') || '';
      const divide = parseFloat(el.getAttribute('data-divide')) || 1;
      const duration = 1500; // Durasi animasi 1.5 detik
      let startTime = null;

      function step(currentTime) {
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
          // Pastikan nilai akhir tepat sesuai target
          let finalValue;
          if (divide > 1) {
            finalValue = (target / divide).toFixed(1).replace('.', ',');
          } else {
            finalValue = target;
          }
          el.textContent = finalValue + suffix;
        }
      }

      window.requestAnimationFrame(step);
    }

    // Gunakan IntersectionObserver modern untuk memantau visibilitas tanpa layout thrashing
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Jalankan animasi untuk semua counter
          counters.forEach((counterEl) => animateCounter(counterEl));
          // Hentikan pemantauan karena animasi hanya berjalan 1 kali
          obs.disconnect();
        }
      });
    }, {
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1
    });

    // Amati elemen counter pertama
    if (counters[0]) {
      observer.observe(counters[0]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCounter);
  } else {
    initCounter();
  }
})();