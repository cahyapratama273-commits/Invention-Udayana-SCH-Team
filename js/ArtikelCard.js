/**
    Komponen Kartu Artikel (Reusable)
 */
function createSlug(text) {
  return text ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
}

function renderArtikelCard(artikel, options = {}) {
  const isCompact = typeof options === 'boolean' ? options : !!(options && options.compact);
  const catSlug = createSlug(artikel.kategori);
  const titleSlug = createSlug(artikel.judul);
  const artikelUrl = `/artikel/?id=${artikel.id}&kategori=${catSlug}&slug=${titleSlug}`;

  if (isCompact) {
    return `
    <a href="${artikelUrl}" class="group flex flex-col sm:flex-row rounded-2xl overflow-hidden border border-white/10 hover:border-[#2DD4A8] backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-0.5" style="background:rgba(21,27,46,0.6); text-decoration:none;">
      <div class="w-full sm:w-36 md:w-44 shrink-0 overflow-hidden aspect-[16/9] sm:aspect-auto" style="background:rgba(26,33,56,0.5);">
        <img src="${artikel.gambar}" alt="${artikel.judul}" loading="lazy" 
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
             onerror="this.onerror=null; this.src='/assets/Images/placeholder.svg';" />
      </div>
      <div class="p-4 sm:p-5 flex flex-col gap-1.5 flex-1 justify-center">
        <span class="text-[11px] sm:text-xs font-semibold uppercase tracking-widest" style="color:#2DD4A8;">${artikel.kategori}</span>
        <h3 class="font-bold text-base sm:text-lg leading-snug group-hover:text-[#2DD4A8] transition-colors line-clamp-2" style="color:#F5F5F5; font-family:'Playfair Display',serif;">${artikel.judul}</h3>
      </div>
    </a>
  `;
  }

  return `
    <a href="${artikelUrl}" class="group flex flex-col sm:flex-row rounded-2xl overflow-hidden border border-white/10 hover:border-[#2DD4A8] backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-0.5" style="background:rgba(21,27,46,0.6); text-decoration:none;">
      <div class="w-full sm:w-56 md:w-64 shrink-0 overflow-hidden aspect-[16/9] sm:aspect-auto" style="background:rgba(26,33,56,0.5);">
        <img src="${artikel.gambar}" alt="${artikel.judul}" loading="lazy" 
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
             onerror="this.onerror=null; this.src='/assets/Images/placeholder.svg';" />
      </div>
      <div class="p-5 sm:p-6 flex flex-col gap-2 flex-1 justify-center">
        <span class="text-[11px] sm:text-xs font-semibold uppercase tracking-widest" style="color:#2DD4A8;">${artikel.kategori}</span>
        <h3 class="font-bold text-lg sm:text-xl leading-snug group-hover:text-[#2DD4A8] transition-colors" style="color:#F5F5F5; font-family:'Playfair Display',serif;">${artikel.judul}</h3>
        <p class="text-sm line-clamp-2 leading-relaxed" style="color:#8A93A8;">${artikel.ringkasan}</p>
        <span class="text-xs mt-1 font-medium" style="color:#5A6478;">⏱️ ${artikel.waktu_baca}</span>
      </div>
    </a>
  `;
}
// Ekspor ke global window
window.renderArtikelCard = renderArtikelCard;
window.renderArtikelCardCompact = function (artikel) {
  return renderArtikelCard(artikel, { compact: true });
};
