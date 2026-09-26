/**
 * Nav.js — Logika Navigasi dan Highlight UI
 * 
 * File ini menangani visual state dari menu navigasi (Navbar).
 * Ketika pengguna berada di halaman tertentu (Beranda, Blog, dsb), script ini akan
 * memberikan efek highlight (warna aktif) pada menu yang sesuai di Navbar.
 */
(function () {
  /**
   * Menyorot (highlight) menu navigasi yang sedang aktif.
   * Fungsi ini membaca atribut `data-page` yang diletakkan pada tag <body> HTML.
   * Contoh: <body data-page="beranda">
   */
  function highlightActiveNav() {
    // 1. Ambil nilai halaman saat ini dari atribut <body> (misal: "beranda", "blog")
    const current = document.body.dataset.page;
    
    // 2. Reset semua elemen menu navbar (hapus warna highlight)
    // Semua elemen menu ditandai dengan atribut `data-nav`
    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.style.color = "#8A93A8";       // Warna abu-abu redup (muted)
      el.style.fontWeight = "400";      // Ketebalan font normal
      el.style.background = "";         // Hapus background
      el.style.borderRadius = "";       // Hapus border-radius
    });
    
    // Jika tidak ada data-page di body, abaikan (mungkin halaman error/lainnya)
    if (!current) return;
    
    // 3. Terapkan style highlight HANYA pada menu yang cocok dengan halaman saat ini
    document.querySelectorAll(`[data-nav="${current}"]`).forEach((el) => {
      el.style.color = "#2DD4A8";                  // Warna teks hijau emerald (aktif)
      el.style.fontWeight = "600";                 // Font tebal
      el.style.background = "rgba(45,212,168,0.12)"; // Background emerald transparan
      el.style.borderRadius = "9999px";            // Bentuk rounded penuh (pil)
    });
  }

  // 4. Jalankan fungsi highlight ketika DOM telah selesai dirender (HTML sudah di-load browser)
  document.addEventListener("DOMContentLoaded", highlightActiveNav);

  /**
   * 5. Pemuat Otomatis Chat Overlay AI (Site-wide)
   * Menyuntikkan js/chat-service.js dan js/chat-overlay.js di semua halaman secara terpusat.
   */
  function ensureChatOverlay() {
    if (window.__btChatOverlayBootstrapped) return;
    window.__btChatOverlayBootstrapped = true;

    function loadScript(src) {
      return new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      });
    }

    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const initPromise = isLocal ? loadScript('/env.js') : Promise.resolve();

    initPromise.then(() => {
      return loadScript('/js/chat-service.js');
    }).then(() => {
      loadScript('/js/chat-overlay.js');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", ensureChatOverlay);
  } else {
    ensureChatOverlay();
  }
})();