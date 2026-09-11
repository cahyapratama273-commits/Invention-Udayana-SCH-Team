/**
    Komponen Kartu Artikel (Reusable)
 */
function renderArtikelCard(artikel) {
  return `
    <a href="/blog/?id=${artikel.id}" class="tile rounded-2xl overflow-hidden flex flex-col group border border-[rgba(255,255,255,0.08)] hover:border-[#2DD4A8] transition-colors duration-300" style="text-decoration:none;">
      <div class="overflow-hidden" style="height:160px; background:#1A2138;">
        <img src="${artikel.gambar}" alt="${artikel.judul}" style="width:100%; height:100%; object-fit:cover;"
             onerror="this.onerror=null; this.src='/assets/Images/placeholder.svg';" />
      </div>
      <div class="p-5 flex flex-col gap-2 flex-1">
        <span class="text-[11px] font-bold uppercase tracking-widest" style="color:#2DD4A8;">${artikel.kategori}</span>
        <h3 class="font-semibold text-base leading-snug" style="color:#F5F5F5; font-family:'Playfair Display',serif;">${artikel.judul}</h3>
        <p class="text-sm flex-1" style="color:#8A93A8;">${artikel.ringkasan}</p>
        <span class="text-xs mt-2" style="color:#5A6478;">${artikel.waktu_baca}</span>
      </div>
    </a>
  `;
}

// Ekspor ke global window
window.renderArtikelCard = renderArtikelCard;
