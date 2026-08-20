/**
 * main.js (Blog) — Entry point halaman Blog
 *
 * Menggunakan fetch() karena jQuery CDN dimuat setelah </main>,
 * sedangkan script ini dieksekusi di dalam <main>.
 */
(async function initBlog() {
  // 1. Muat komponen Navigasi
  if (typeof loadNavigasi === "function") {
    await loadNavigasi();
  }

  // 2. Fetch dan Render semua artikel
  var gridEl = document.getElementById("blog-artikel-grid");
  if (!gridEl) return;

  try {
    var res = await fetch("./data/artikel.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    var semuaArtikel = await res.json();

    if (typeof renderArtikelCard === "function") {
      gridEl.innerHTML = semuaArtikel.map(renderArtikelCard).join("");
    } else {
      console.error("Fungsi renderArtikelCard tidak ditemukan.");
    }
  } catch (err) {
    console.error("Error merender blog:", err);
    gridEl.innerHTML = '<p style="color:#8A93A8;" class="text-sm col-span-full text-center">Belum bisa memuat artikel. Coba refresh halaman ya.</p>';
  }
})();
