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

    // Reset dan aktifkan menu yang cocok
    document.querySelectorAll("[data-nav]").forEach((el) => {
      if (el.getAttribute("data-nav") === current) {
        el.style.color = "#2DD4A8";
        el.style.fontWeight = "600";
        el.style.background = "rgba(45,212,168,0.12)";
        el.style.borderRadius = "9999px";
      } else {
        el.style.color = "#8A93A8";
        el.style.fontWeight = "400";
        el.style.background = "";
        el.style.borderRadius = "";
      }
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

    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const initPromise = isLocal ? loadScript('/env.js') : Promise.resolve();

    initPromise.then(() => {
      return loadScript('/js/chat-service.js');
    }).then(() => {
      loadScript('/js/chat-overlay.js');
    });
  }

  // Muat Chat Overlay setelah halaman idle / load selesai
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      window.addEventListener('load', () => {
        requestIdleCallback(() => ensureChatOverlay(), { timeout: 3000 });
      });
    } else {
      window.addEventListener('load', () => {
        setTimeout(ensureChatOverlay, 1500);
      });
    }
  }
})();