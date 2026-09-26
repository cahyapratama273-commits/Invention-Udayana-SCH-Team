/**
 * ArtikelCard.js — Komponen Pembangun Kartu Artikel (Reusable Article Card)
 * 
 * Fungsi ini digunakan di berbagai halaman (Beranda, Blog, Rekomendasi Untuk Kamu)
 * untuk mengubah objek data artikel menjadi struktur HTML kartu yang rapi dan konsisten.
 */

/**
 * Mengubah teks judul/kategori menjadi format slug URL (huruf kecil dan tanda strip).
 * Contoh: "Kesehatan Mental" -> "kesehatan-mental"
 * @param {string} text - Teks input
 * @returns {string} - Hasil teks berformat slug
 */
function createSlug(text) {
  return text ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
}

/**
 * Merender satu kartu artikel ke dalam string HTML
 * @param {Object} artikel - Objek data artikel dari JSON
 * @param {Object|boolean} options - Opsi render (contoh: { compact: true } untuk tampilan kartu mini)
 * @returns {string} - Template string HTML kartu artikel
 */
function renderArtikelCard(artikel, options = {}) {
  // Cek apakah mode kartu mini (compact) diaktifkan
  const isCompact = typeof options === 'boolean' ? options : !!(options && options.compact);
  const catSlug = createSlug(artikel.kategori);
  const titleSlug = createSlug(artikel.judul);
  // Bentuk URL detail artikel yang SEO-friendly dan bersih
  const artikelUrl = `/artikel/?id=${artikel.id}&kategori=${catSlug}&slug=${titleSlug}`;

  // Tampilan 1: Mode Compact (Digunakan di section "Untuk Kamu" & "Yoga Preview" pada grid 2x2)
  if (isCompact) {
    return `
    <a href="${artikelUrl}" class="group flex flex-col sm:flex-row rounded-2xl overflow-hidden bg-white/10 border border-white/20 hover:border-[#2DD4A8] backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-0.5" style="text-decoration:none;">
      <!-- Gambar Thumbnail Compact -->
      <div class="w-full sm:w-36 md:w-44 shrink-0 overflow-hidden aspect-[16/9] sm:aspect-auto bg-white/5">
        <img src="${artikel.gambar}" alt="${artikel.judul}" loading="lazy" 
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
             onerror="this.onerror=null; this.src='/assets/Images/placeholder.svg';" />
      </div>
      <!-- Teks Informasi Artikel -->
      <div class="p-4 sm:p-5 flex flex-col gap-1.5 flex-1 justify-center">
        <span class="text-[11px] sm:text-xs font-semibold uppercase tracking-widest" style="color:#2DD4A8;">${artikel.kategori}</span>
        <h3 class="font-bold text-base sm:text-lg leading-snug group-hover:text-[#2DD4A8] transition-colors line-clamp-2" style="color:#F5F5F5; font-family:'Playfair Display',serif;">${artikel.judul}</h3>
      </div>
    </a>
  `;
  }

  // Tampilan 2: Mode Standar (Digunakan di katalog utama Semua Artikel dan Beranda)
  return `
    <a href="${artikelUrl}" class="group flex flex-col sm:flex-row rounded-2xl overflow-hidden bg-white/10 border border-white/20 hover:border-[#2DD4A8] backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-0.5" style="text-decoration:none;">
      <!-- Gambar Thumbnail Standar -->
      <div class="w-full sm:w-56 md:w-64 shrink-0 overflow-hidden aspect-[16/9] sm:aspect-auto bg-white/5">
        <img src="${artikel.gambar}" alt="${artikel.judul}" loading="lazy" 
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
             onerror="this.onerror=null; this.src='/assets/Images/placeholder.svg';" />
      </div>
      <!-- Teks Informasi, Ringkasan, dan Estimasi Baca -->
      <div class="p-5 sm:p-6 flex flex-col gap-2 flex-1 justify-center">
        <span class="text-[11px] sm:text-xs font-semibold uppercase tracking-widest" style="color:#2DD4A8;">${artikel.kategori}</span>
        <h3 class="font-bold text-lg sm:text-xl leading-snug group-hover:text-[#2DD4A8] transition-colors" style="color:#F5F5F5; font-family:'Playfair Display',serif;">${artikel.judul}</h3>
        <p class="text-sm line-clamp-2 leading-relaxed" style="color:#8A93A8;">${artikel.ringkasan}</p>
        <span class="text-xs mt-1 font-medium" style="color:#5A6478;">⏱️ ${artikel.waktu_baca}</span>
      </div>
    </a>
  `;
}

// Daftarkan fungsi ke objek global window agar bisa dipanggil dari file script mana pun
window.renderArtikelCard = renderArtikelCard;
window.renderArtikelCardCompact = function (artikel) {
  return renderArtikelCard(artikel, { compact: true });
};
