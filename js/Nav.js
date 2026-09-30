/**
 * Nav.js — Logika Navigasi dan Highlight UI
 * 
 * File ini menangani visual state dari menu navigasi (Navbar).
 * Ketika pengguna berada di halaman tertentu (Beranda, Blog, dsb), script ini akan
 * memberikan efek highlight (warna aktif) pada menu yang sesuai di Navbar.
 */
(function () {
  'use strict';

  /**
   * Menyorot (highlight) menu navigasi yang sedang aktif.
   * Fungsi ini membaca atribut `data-page` yang diletakkan pada tag <body> HTML.
   */
  function highlightActiveNav() {
    const current = document.body ? document.body.dataset.page : null;
    if (!current) return;

    // Reset dan aktifkan menu yang cocok tanpa inline style yang memblokir hover
    document.querySelectorAll("[data-nav]").forEach((el) => {
      if (el.getAttribute("data-nav") === current) {
        el.classList.add("nav-active");
        el.setAttribute("aria-current", "page");
      } else {
        el.classList.remove("nav-active");
        el.removeAttribute("aria-current");
      }
      // Bersihkan inline style agar CSS hover & active states berjalan optimal
      el.style.color = "";
      el.style.fontWeight = "";
      el.style.background = "";
      el.style.borderRadius = "";
    });
  }

  window.__highlightActiveNav = highlightActiveNav;

  if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", highlightActiveNav);
  } else {
    highlightActiveNav();
  }

  /**
   * Pemuat Otomatis Chat Overlay AI (Site-wide)
   * Dimuat secara non-blocking saat browser idle agar tidak membebani First Contentful Paint / LCP.
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
        s.async = true;
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      });
    }

    loadScript('/js/chat-service.js').then(() => {
      loadScript('/js/chat-overlay.js');
    });
  }

  // Muat Chat Overlay segera saat DOM siap agar floating bubble selalu muncul di setiap halaman
  if (typeof window !== 'undefined') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      ensureChatOverlay();
    } else {
      window.addEventListener('DOMContentLoaded', ensureChatOverlay);
      window.addEventListener('load', ensureChatOverlay);
    }
  }
})();