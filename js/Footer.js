/**
 * Footer.js — Komponen Pemuat Footer (Footer Loader)
 * 
 * Script ini berfungsi mengambil (fetch) file HTML Footer (`component/Footer.html`)
 * dan memasukkannya ke dalam elemen HTML yang memiliki `id="footer"`.
 * 
 * Ditulis menggunakan Vanilla JS Fetch modern tanpa dependensi library eksternal (zero-dependency).
 */
(function () {
  'use strict';
  
  // Cache in-memory agar jika dipanggil berulang tidak melakukan request jaringan ganda
  let cachedFooterHtml = null;

  async function loadFooter() {
    const footerEl = document.getElementById('footer');
    if (!footerEl) return;

    try {
      if (!cachedFooterHtml) {
        const res = await fetch('/component/Footer.html');
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        cachedFooterHtml = await res.text();
      }
      footerEl.innerHTML = cachedFooterHtml;
    } catch (err) {
      console.warn('Gagal memuat footer:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFooter);
  } else {
    loadFooter();
  }
})();