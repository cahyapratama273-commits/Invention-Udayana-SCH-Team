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
})();