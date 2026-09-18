/**
    Komponen Kartu Artikel (Reusable)
 */
function renderArtikelCard(artikel) {
  return `
    <a href="/blog/?id=${artikel.id}" class="group flex flex-col sm:flex-row rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.1)] hover:border-[#2DD4A8] backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-2xl" style="background:rgba(21,27,46,0.6); text-decoration:none;">
      <div class="w-full sm:w-56 md:w-64 shrink-0 overflow-hidden aspect-[16/9] sm:aspect-auto" style="background:rgba(26,33,56,0.5);">
        <img src="${artikel.gambar}" alt="${artikel.judul}" loading="lazy" 
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
             onerror="this.onerror=null; this.src='/assets/Images/placeholder.svg';" />
      </div>
      <div class="p-5 flex flex-col gap-2 flex-1 justify-center">
        <span class="text-[11px] font-bold uppercase tracking-widest" style="color:#2DD4A8;">${artikel.kategori}</span>
        <h3 class="font-semibold text-lg leading-snug" style="color:#F5F5F5; font-family:'Playfair Display',serif;">${artikel.judul}</h3>
        <p class="text-sm line-clamp-2" style="color:#8A93A8;">${artikel.ringkasan}</p>
        <span class="text-xs mt-1" style="color:#5A6478;">${artikel.waktu_baca}</span>
      </div>
    </a>
  `;
}
// Ekspor ke global window
window.renderArtikelCard = renderArtikelCard;
