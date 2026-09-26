/**
 * session-gate.js — Middleware sisi klien (Client-side Middleware)
 * 
 * File ini HARUS dimuat di <head> pada baris pertama sebelum script atau styling 
 * lain dirender. Fungsinya untuk mengecek apakah user sudah memiliki akses 
 * (sudah mengisi kuesioner awal). 
 * 
 * Jika belum, script ini akan memblokir rendering halaman dan segera mengalihkan 
 * user ke file index untuk untuk mengisi kuis terlebih dahulu.
 */
(function () {
  const path = window.location.pathname;

  // 1. Tentukan apakah halaman saat ini adalah halaman kuesioner (root / index.html)
  const isQuizPage =
    path === "/" ||
    path === "/index.html" ||
    /^\/index\.html(\?.*)?$/.test(path);

  // Jika di halaman kuesioner, biarkan lewat
  if (isQuizPage) return;

  // 2. Cek keberadaan token otentikasi di localStorage
  // 'userMentalCheckedAt' adalah token yang di-set oleh question.js ketika user selesai/melewati kuis
  const token = localStorage.getItem("userMentalCheckedAt");

  // Jika tidak ada token (belum isi kuis), simpan target URL dan alihkan ke index.html
  if (!token) {
    const fullTarget = window.location.pathname + window.location.search + window.location.hash;
    try {
      if (fullTarget && fullTarget !== "/" && fullTarget !== "/index.html" && fullTarget !== "/beranda.html") {
        sessionStorage.setItem("intendedRedirectUrl", fullTarget);
      }
    } catch (e) {}

    // Arahkan ke index.html dengan menyertakan parameter redirect jika ada tujuan spesifik
    if (fullTarget && fullTarget !== "/" && fullTarget !== "/index.html" && fullTarget !== "/beranda.html") {
      window.location.replace("/index.html?redirect=" + encodeURIComponent(fullTarget));
    } else {
      window.location.replace("/index.html");
    }
  }
})();
