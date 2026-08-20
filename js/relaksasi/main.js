/**
 * main.js — Entry point khusus halaman ini
 * 
 * Script ini berjalan ketika struktur HTML selesai dimuat.
 * Fungsi utamanya adalah memanggil loadNavigasi() dari NavRender.js
 * untuk merender menu Navbar secara dinamis.
 */
document.addEventListener("DOMContentLoaded", async () => {
  await loadNavigasi();
});
