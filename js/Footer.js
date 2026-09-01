/**
 * Footer.js — Komponen Pemuat Footer (Footer Loader)
 * 
 * Script ini berfungsi mengambil (fetch) file HTML Footer (`component/Footer.html`)
 * dan memasukkannya ke dalam elemen HTML yang memiliki `id="footer"`.
 * 
 * Menggunakan jQuery `.load()` untuk mempersingkat proses AJAX.
 */
$(document).ready(function () {
    // Cari div dengan id="footer", lalu suntikkan konten dari file komponen
    $('#footer').load('/component/Footer.html');
});