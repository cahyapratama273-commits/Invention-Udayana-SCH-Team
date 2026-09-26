/**
 * js/main.js — Mesin Animasi Scroll & Interaksi Halaman (AOS Engine) BerTeduh
 * 
 * Script ini mengendalikan efek animasi kemunculan elemen saat di-scroll (Intersection Observer):
 * 1. Mendeteksi elemen-elemen yang memiliki atribut `data-aos` atau kelas animasi (seperti .fade-left, .fade-up).
 * 2. Menerapkan animasi akselerasi perangkat keras (GPU hardware-accelerated) dengan transisi mulus.
 * 3. Menghilangkan delay hover (instant hover lift) setelah animasi selesai agar interaksi kartu tetap responsif tanpa lag.
 * 4. Menggunakan IntersectionObserver murni tanpa forced synchronous reflow (meningkatkan skor performa Lighthouse).
 * 5. Menyediakan metode global `window.AOS.refresh()` untuk memindai elemen dinamis yang baru dimuat.
 */
(function () {
  'use strict';

  function initAOS() {
    // Tambahkan kelas penanda bahwa JS AOS sudah aktif di tag <html>
    document.documentElement.classList.add('aos-ready');

    // Selector elemen yang mendukung animasi scroll
    const selector = '[data-aos], .fade-left, .fade-right, .fade-up, .fade-down, .fade-in, .fade-out, .fade-out-up, .fade-out-down, .fade-out-left, .fade-out-right, .aos-init';
    // Ambil seluruh elemen target (kecuali sapaan-wrapper yang memiliki animasi khusus tersendiri)
    const elements = Array.from(document.querySelectorAll(selector)).filter((el) => el.id !== 'sapaan-wrapper');
    if (!elements.length) return;

    /**
     * Menandai elemen telah selesai melakukan animasi masuk (settled)
     * sehingga saat kursor mouse menyentuh (hover), kartu terangkat seketika tanpa delay
     */
    const markSettled = (el) => {
      if (el.classList.contains('aos-animate')) {
        el.classList.add('aos-settled');
        el.style.setProperty('transition-delay', '0s', 'important');
      }
    };

    /**
     * Memasang event hover tanpa jeda (0ms delay) agar interaksi terasa sangat responsif
     */
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

    // Buat IntersectionObserver untuk memantau kapan elemen masuk ke layar viewport
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        const isExplicitlyOnce = el.getAttribute('data-aos-once') === 'true';

        if (entry.isIntersecting) {
          // Elemen terlihat di layar: jalankan animasi masuk
          el.classList.remove('aos-settled');
          el.style.setProperty('transition-delay', '0s', 'important');

          el.classList.add('aos-animate');

          // Dukungan mundur untuk kelas fade-left legacy
          if (el.classList.contains('fade-left')) {
            el.classList.remove('opacity-0', '-translate-x-10');
            el.classList.add('opacity-100', 'translate-x-0');
          }

          const durationMs = parseInt(el.getAttribute('data-aos-duration') || '850', 10);

          // Setelah animasi masuk selesai, beri tanda settled
          const timer = setTimeout(() => {
            markSettled(el);
          }, durationMs + 40);

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
          // Elemen keluar dari layar: reset animasi jika data-aos-once tidak bernilai true
          if (!isExplicitlyOnce) {
            el.classList.remove('aos-animate', 'aos-settled');
            el.style.setProperty('transition-delay', '0s', 'important');
          }
        }
      });
    }, {
      root: null,
      rootMargin: '40px 0px 40px 0px',
      threshold: 0.05
    });

    elements.forEach((el) => {
      attachHoverOptimizations(el);

      // Terapkan durasi transisi kustom jika ada di atribut data-aos-duration
      const duration = el.getAttribute('data-aos-duration');
      if (duration) {
        el.style.transitionDuration = `${duration}ms`;
      }

      // Mulai observasi secara asinkron (tidak memblokir layout engine browser)
      observer.observe(el);
    });

    // Ekspor helper pembaruan animasi AOS ke global window
    window.AOS = {
      refresh: function () {
        const newElements = Array.from(document.querySelectorAll(selector)).filter((el) => el.id !== 'sapaan-wrapper');
        newElements.forEach((el) => {
          attachHoverOptimizations(el);
          if (!el.classList.contains('aos-animate')) {
            el.style.setProperty('transition-delay', '0s', 'important');
            const duration = el.getAttribute('data-aos-duration');
            if (duration) el.style.transitionDuration = `${duration}ms`;
            observer.observe(el);
          }
        });
      }
    };
  }

  // Jalankan ketika struktur DOM sudah siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAOS);
  } else {
    initAOS();
  }
})();