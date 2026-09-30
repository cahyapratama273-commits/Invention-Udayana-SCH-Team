/**
 * bg-randomizer.js — Pengatur Gambar Latar Belakang Alam Acak (Session Persistent)
 * 
 * Modul ini memilih satu gambar latar belakang pemandangan hutan/alam secara acak
 * untuk setiap sesi penjelajahan (menggunakan sessionStorage), lalu menerapkannya secara konsisten
 * ke seluruh halaman web yang menggunakan latar belakang hero.
 * 
 * Ditulis secara sangat ringan (zero-overhead) tanpa MutationObserver blocking untuk performa maksimal.
 */
(function () {
  'use strict';

  // Daftar koleksi 50 gambar latar belakang pemandangan hutan yang menenangkan
  const FOREST_BACKGROUNDS = [
    '/assets/Images/artikel/hutan1.webp',
    '/assets/Images/artikel/hutan2.webp',
    '/assets/Images/artikel/hutan3.webp',
    '/assets/Images/artikel/hutan5.webp',
    '/assets/Images/artikel/hutan6.webp',
    '/assets/Images/artikel/hutan7.webp',
    '/assets/Images/artikel/hutan8.webp',
    '/assets/Images/artikel/hutan9.webp',
    '/assets/Images/artikel/hutan10.webp',
    '/assets/Images/artikel/hutan11.webp',
    '/assets/Images/artikel/hutan12.webp',
    '/assets/Images/artikel/hutan13.webp',
    '/assets/Images/artikel/hutan14.webp',
    '/assets/Images/artikel/hutan15.webp',
    '/assets/Images/artikel/hutan16.webp',
    '/assets/Images/artikel/hutan17.webp',
    '/assets/Images/artikel/hutan18.webp',
    '/assets/Images/artikel/hutan19.webp',
    '/assets/Images/artikel/hutan20.webp',
    '/assets/Images/artikel/hutan21.webp',
    '/assets/Images/artikel/hutan22.webp',
    '/assets/Images/artikel/hutan23.webp',
    '/assets/Images/artikel/hutan24.webp',
    '/assets/Images/artikel/hutan25.webp',
    '/assets/Images/artikel/hutan26.webp',
    '/assets/Images/artikel/hutan27.webp',
    '/assets/Images/artikel/hutan28.webp',
    '/assets/Images/artikel/hutan29.webp',
    '/assets/Images/artikel/hutan30.webp',
    '/assets/Images/artikel/hutan31.webp',
    '/assets/Images/artikel/hutan32.webp',
    '/assets/Images/artikel/hutan33.webp',
    '/assets/Images/artikel/hutan34.webp',
    '/assets/Images/artikel/hutan35.webp',
    '/assets/Images/artikel/hutan36.webp',
    '/assets/Images/artikel/hutan37.webp',
    '/assets/Images/artikel/hutan38.webp',
    '/assets/Images/artikel/hutan39.webp',
    '/assets/Images/artikel/hutan40.webp',
    '/assets/Images/artikel/hutan41.webp',
    '/assets/Images/artikel/hutan42.webp',
    '/assets/Images/artikel/hutan43.webp',
    '/assets/Images/artikel/hutan44.webp',
    '/assets/Images/artikel/hutan45.webp',
    '/assets/Images/artikel/hutan46.webp',
    '/assets/Images/artikel/hutan47.webp',
    '/assets/Images/artikel/hutan48.webp',
    '/assets/Images/artikel/hutan49.webp',
    '/assets/Images/artikel/hutan50.webp'
  ];

  const STORAGE_KEY = 'teduh_session_bg';

  /**
   * Mengambil gambar background sesi yang sudah tersimpan, atau mengacak gambar baru jika belum ada
   */
  function getSessionBg() {
    try {
      let bg = sessionStorage.getItem(STORAGE_KEY);
      if (!bg || !FOREST_BACKGROUNDS.includes(bg)) {
        const randomIndex = Math.floor(Math.random() * FOREST_BACKGROUNDS.length);
        bg = FOREST_BACKGROUNDS[randomIndex];
        sessionStorage.setItem(STORAGE_KEY, bg);
      }
      return bg;
    } catch (e) {
      return FOREST_BACKGROUNDS[0];
    }
  }

  const sessionBg = getSessionBg();
  window.__teduhSessionBg = sessionBg;

  /**
   * Menerapkan path gambar ke elemen background
   */
  function applySessionBg() {
    const bgImgs = document.querySelectorAll('img[data-session-bg], img.session-bg');
    bgImgs.forEach((img) => {
      if (!img.src.endsWith(sessionBg)) {
        img.src = sessionBg;
      }
    });

    const bgContainers = document.querySelectorAll('[data-session-bg-style], #konsultasi-hero-bg');
    bgContainers.forEach((el) => {
      el.style.backgroundImage = `url('${sessionBg}')`;
    });
  }

  // Terapkan saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySessionBg);
  } else {
    applySessionBg();
  }
})();
