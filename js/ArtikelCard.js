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

  // Tampilan 1: Mode Compact Vertikal (Digunakan di section "Untuk Kamu" & "Yoga Preview" pada grid 2x2)
  if (isCompact) {
    return `
    <a href="${artikelUrl}" class="group flex flex-col h-full rounded-2xl overflow-hidden bg-white/10 border border-white/20 hover:border-[#2DD4A8] backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-0.5" style="text-decoration:none;">
      <!-- Gambar Thumbnail Compact Vertikal -->
      <div class="w-full aspect-[16/9] shrink-0 overflow-hidden bg-white/5 relative">
        <img src="${artikel.gambar}" alt="${artikel.judul}" 
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
             onerror="this.onerror=null; this.src='/assets/Images/placeholder.svg';" />
      </div>
      <!-- Teks Informasi Artikel -->
      <div class="p-4 sm:p-5 flex flex-col gap-1.5 flex-1 justify-between">
        <div>
          <span class="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-[#2DD4A8]">${artikel.kategori}</span>
          <h3 class="font-bold text-base sm:text-lg leading-snug text-[#F5F5F5] group-hover:text-[#2DD4A8] transition-colors line-clamp-2 mt-1" style="font-family:'Plus Jakarta Sans', sans-serif;">${artikel.judul}</h3>
        </div>
        <span class="text-xs font-medium text-[#8A93A8] mt-2">⏱️ ${artikel.waktu_baca || '3 min'}</span>
      </div>
    </a>
  `;
  }

  // Tampilan 2: Mode Standar Vertikal (Digunakan di katalog utama Semua Artikel dan Beranda)
  // Spek: vertical cards (image on top, kategori, title clamped to 2 lines, summary clamped to 2-3 lines, reading time)
  // Equal heights: h-full flex flex-col justify-between
  return `
    <a href="${artikelUrl}" class="group flex flex-col h-full rounded-2xl overflow-hidden bg-white/10 border border-white/20 hover:border-[#2DD4A8] backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-0.5" style="text-decoration:none;">
      <!-- Gambar Thumbnail Standar Vertikal -->
      <div class="w-full aspect-[16/9] shrink-0 overflow-hidden bg-white/5 relative">
        <img src="${artikel.gambar}" alt="${artikel.judul}" 
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
             onerror="this.onerror=null; this.src='/assets/Images/placeholder.svg';" />
      </div>
      <!-- Teks Informasi, Ringkasan, dan Estimasi Baca -->
      <div class="p-5 sm:p-6 flex flex-col flex-1 justify-between gap-3">
        <div class="flex flex-col gap-2">
          <span class="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-[#2DD4A8]">${artikel.kategori}</span>
          <h3 class="font-bold text-lg sm:text-xl leading-snug text-[#F5F5F5] group-hover:text-[#2DD4A8] transition-colors line-clamp-2" style="font-family:'Plus Jakarta Sans', sans-serif;">${artikel.judul}</h3>
          <p class="text-sm line-clamp-3 leading-relaxed text-[#8A93A8]">${artikel.ringkasan}</p>
        </div>
        <span class="text-xs mt-auto pt-2 font-medium text-[#8A93A8]">⏱️ ${artikel.waktu_baca}</span>
      </div>
    </a>
  `;
}

// Daftarkan fungsi ke objek global window agar bisa dipanggil dari file script mana pun
window.renderArtikelCard = renderArtikelCard;
window.renderArtikelCardCompact = function (artikel) {
  return renderArtikelCard(artikel, { compact: true });
};
