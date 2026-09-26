/**
 * faq.js — Logika Interaksi Akordion FAQ (Tanya Jawab)
 * 
 * Script ini mengatur perilaku buka-tutup kartu pertanyaan FAQ.
 * Menggunakan pola "Single-Open" di mana jika satu pertanyaan dibuka,
 * pertanyaan lain yang sedang terbuka otomatis tertutup agar tampilan tetap rapi.
 * 
 * Ditulis dalam Vanilla JS modern berkecepatan tinggi tanpa dependensi eksternal.
 */
(function () {
  'use strict';

  function initFaq() {
    const faqRows = Array.from(document.querySelectorAll('.faq-row'));
    if (!faqRows.length) return;

    faqRows.forEach((row) => {
      const btn = row.querySelector('.faq-card');
      const drawer = row.querySelector('.faq-drawer');
      if (!btn) return;

      function closeFaq(targetRow) {
        targetRow.classList.remove('is-open');
        const targetBtn = targetRow.querySelector('.faq-card');
        const targetDrawer = targetRow.querySelector('.faq-drawer');
        if (targetBtn) targetBtn.setAttribute('aria-expanded', 'false');
        if (targetDrawer) targetDrawer.removeAttribute('title');
      }

      function openFaq(targetRow) {
        // Tutup semua FAQ lain yang sedang terbuka
        faqRows.forEach((otherRow) => {
          if (otherRow !== targetRow && otherRow.classList.contains('is-open')) {
            closeFaq(otherRow);
          }
        });

        targetRow.classList.add('is-open');
        const targetBtn = targetRow.querySelector('.faq-card');
        const targetDrawer = targetRow.querySelector('.faq-drawer');
        if (targetBtn) targetBtn.setAttribute('aria-expanded', 'true');
        if (targetDrawer) targetDrawer.setAttribute('title', 'Klik untuk menutup jawaban');
      }

      // Event saat tombol kartu pertanyaan diklik
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = row.classList.contains('is-open');
        if (isOpen) {
          closeFaq(row);
        } else {
          openFaq(row);
        }
      });

      // Event saat kartu drawer jawaban diklik
      if (drawer) {
        drawer.addEventListener('click', (e) => {
          // Jika yang diklik adalah link <a> di dalam jawaban, biarkan navigasi berjalan
          if (e.target.closest('a')) {
            return;
          }
          if (row.classList.contains('is-open')) {
            closeFaq(row);
          }
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFaq);
  } else {
    initFaq();
  }
})();