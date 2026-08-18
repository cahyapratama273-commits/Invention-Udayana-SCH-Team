/**
 * session-gate.js — Middleware sisi klien (Client-side Middleware)
 * 
 * File ini HARUS dimuat di <head> pada baris pertama sebelum script atau styling 
 * lain dirender. Fungsinya untuk mengecek apakah user sudah memiliki akses 
 * (sudah mengisi kuesioner awal). 
 * 
 * Jika belum, script ini akan memblokir rendering halaman dan segera mengalihkan 
 * user ke halaman utama (root /) untuk mengisi kuis terlebih dahulu.
 */
(function () {
  const path = window.location.pathname;

  // 1. Tentukan apakah halaman saat ini adalah halaman kuesioner (root)
  // Kita harus mengecualikan halaman kuesioner dari pengecekan agar 
  // tidak terjadi infinite redirect loop.
  const isQuizPage =
    path === "/" ||
    path === "/index.html" ||
    /^\/index\.html(\?.*)?$/.test(path);

  // Jika di halaman kuesioner, biarkan lewat
  if (isQuizPage) return;

  // 2. Cek keberadaan token otentikasi di localStorage
  // 'userMentalCheckedAt' adalah token yang di-set oleh question.js 
  // ketika user selesai mengisi kuis.
  const token = localStorage.getItem("userMentalCheckedAt");

  // Jika tidak ada token (belum isi kuis), alihkan paksa ke halaman root
  if (!token) {
    // window.location.replace digunakan alih-alih href agar history tidak menyimpan halaman ini
    window.location.replace("/");
  }
})();
