/**
 * faq.js — Logika Interaksi Akordion FAQ (Tanya Jawab)
 * 
 * Script ini mengatur perilaku buka-tutup kartu pertanyaan FAQ.
 * Menggunakan pola "Single-Open" di mana jika satu pertanyaan dibuka,
 * pertanyaan lain yang sedang terbuka otomatis tertutup agar tampilan tetap rapi.
 * 
 * Aksesibilitas:
 * - Menggunakan elemen <button> untuk trigger dengan atribut aria-expanded dan aria-controls.
 * - Dukungan penuh navigasi keyboard (Enter dan Spasi untuk toggle, Escape untuk menutup).
 * - Transisi tenang (calm) 500-700ms.
 * 
 * Zero-dependency Vanilla JS modern.
 */
(function () {
  'use strict';

  function initFaq() {
    const faqRows = Array.from(document.querySelectorAll('.faq-row'));
    if (!faqRows.length) return;

    function closeFaq(targetRow) {
      if (!targetRow) return;
      targetRow.classList.remove('is-open');
      if (window.innerWidth < 768) {
        targetRow.style.minHeight = '';
      }
      const targetBtn = targetRow.querySelector('.faq-card');
      const targetDrawer = targetRow.querySelector('.faq-drawer');
      if (targetBtn) targetBtn.setAttribute('aria-expanded', 'false');
      if (targetDrawer) targetDrawer.removeAttribute('title');
    }

    function openFaq(targetRow) {
      if (!targetRow) return;
      // Tutup semua FAQ lain yang sedang terbuka (hanya satu yang boleh terbuka pada satu waktu)
      faqRows.forEach((otherRow) => {
        if (otherRow !== targetRow && otherRow.classList.contains('is-open')) {
          closeFaq(otherRow);
        }
      });

      const targetBtn = targetRow.querySelector('.faq-card');
      const targetDrawer = targetRow.querySelector('.faq-drawer');
      const inner = targetRow.querySelector('.faq-drawer-inner');

      // Pada tampilan mobile, sesuaikan tinggi wadah secara presisi agar transisi slide horizontal mulus tanpa patahan
      if (window.innerWidth < 768 && targetBtn && inner) {
        const cardH = targetBtn.offsetHeight || 80;
        const drawerH = inner.scrollHeight;
        targetRow.style.minHeight = Math.max(drawerH + 24, cardH) + 'px';
      }

      targetRow.classList.add('is-open');
      if (targetBtn) targetBtn.setAttribute('aria-expanded', 'true');
      if (targetDrawer) targetDrawer.setAttribute('title', 'Klik untuk menutup jawaban');
    }

    function toggleFaq(targetRow) {
      if (!targetRow) return;
      if (targetRow.classList.contains('is-open')) {
        closeFaq(targetRow);
      } else {
        openFaq(targetRow);
      }
    }

    // Reset inline min-height saat beralih antara desktop dan mobile
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) {
        faqRows.forEach((r) => { r.style.minHeight = ''; });
      } else {
        const activeRow = faqRows.find((r) => r.classList.contains('is-open'));
        if (activeRow) {
          const inner = activeRow.querySelector('.faq-drawer-inner');
          const btn = activeRow.querySelector('.faq-card');
          if (inner && btn) {
            activeRow.style.minHeight = Math.max(inner.scrollHeight + 24, btn.offsetHeight || 80) + 'px';
          }
        }
      }
    });

    faqRows.forEach((row) => {
      const btn = row.querySelector('.faq-card');
      const drawer = row.querySelector('.faq-drawer');
      if (!btn) return;

      // Event saat tombol kartu pertanyaan diklik
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleFaq(row);
      });

      // Keyboard support: Tombol Enter dan Space
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFaq(row);
        }
      });

      // Keyboard support: Tombol Escape untuk menutup laci yang sedang terbuka
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && row.classList.contains('is-open')) {
          closeFaq(row);
          btn.focus();
        }
      });

      // Event saat kartu drawer jawaban diklik untuk menutupnya
      if (drawer) {
        drawer.addEventListener('click', (e) => {
          // Jika yang diklik adalah link <a> di dalam jawaban, biarkan navigasi berjalan
          if (e.target.closest('a')) {
            return;
          }
          if (row.classList.contains('is-open')) {
            closeFaq(row);
            btn.focus();
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