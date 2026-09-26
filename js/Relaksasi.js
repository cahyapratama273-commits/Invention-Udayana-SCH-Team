/**
 * Relaksasi.js — Listing Page Handler for Alur Relaksasi Tubuh & Pikiran (relaksasi.html)
 *
 * ARCHITECTURAL NOTE (Video Navigation Decision):
 * Current site has <= 7 distinct top-level pages (index.html, beranda.html, blog.html,
 * konsultasi.html, relaksasi.html, riak.html, relaksasi-detail.html).
 * Per project specification, full-page navigation to relaksasi-detail.html is maintained.
 * If the site expands beyond 7 top-level pages in the future, convert this to an in-page modal/overlay video player.
 */

const TINGKAT_COLOR_MAP = {
  pemula: {
    bg: 'bg-[#2DD4A8]/10',
    text: 'text-[#2DD4A8]',
    border: 'border-[#2DD4A8]/30',
    label: 'Pemula'
  },
  menengah: {
    bg: 'bg-[#FB923C]/10',
    text: 'text-[#FB923C]',
    border: 'border-[#FB923C]/30',
    label: 'Menengah'
  },
  lanjutan: {
    bg: 'bg-[#F472B6]/10',
    text: 'text-[#F472B6]',
    border: 'border-[#F472B6]/30',
    label: 'Lanjutan'
  }
};

const VIDEO_MAP = {
  1: '/assets/VideoYoga/Pernapasan-Perut-(Diaphragmatic-Breathing).mp4',
  2: '/assets/VideoYoga/Cat-Cow-(Pose-Kucing-Sapi).mp4',
  3: null,
  4: '/assets/VideoYoga/Seated-Forward-Fold-(Paschimottanasana).mp4',
  5: '/assets/VideoYoga/Legs-Up-The-Wall-(Viparita-Karani).mp4',
  6: '/assets/VideoYoga/Corpse-Pose-(Savasana).mp4',
  7: '/assets/VideoYoga/Standing-Forward-Bend-(Uttanasana).mp4',
  8: '/assets/VideoYoga/Easy-Pose-Breathing-(Sukhasana).mp4',
  9: '/assets/VideoYoga/Cobr-Pose-(Bhujangasana).mp4',
  10: '/assets/VideoYoga/Butterfly-Pose-(Baddha-Konasana).mp4',
  11: '/assets/VideoYoga/Mountain-Pose-(Tadasana).mp4',
  12: null
};

// Function to render HTML for a static pose card on the listing page
function renderRelaksasiCard(step) {
  const tingkatKey = (step.tingkat || 'pemula').toLowerCase();
  const tingkatStyle = TINGKAT_COLOR_MAP[tingkatKey] || TINGKAT_COLOR_MAP.pemula;
  const detailUrl = `/relaksasi-detail.html?id=${step.id}`;
  const videoSrc = (step.video_url !== undefined && step.video_url !== null) ? step.video_url : VIDEO_MAP[step.id];
  let normalizedVideoSrc = videoSrc;
  if (normalizedVideoSrc && !normalizedVideoSrc.startsWith('/') && !normalizedVideoSrc.startsWith('http')) {
    normalizedVideoSrc = '/' + normalizedVideoSrc;
  }
  const videoTersedia = typeof step.video_tersedia === 'boolean' ? step.video_tersedia : Boolean(normalizedVideoSrc);
  let thumbnailSrc = step.video_thumbnail || '/assets/Images/artikel/hutan1.webp';
  if (thumbnailSrc && !thumbnailSrc.startsWith('/') && !thumbnailSrc.startsWith('http')) {
    thumbnailSrc = '/' + thumbnailSrc;
  }

  return `
    <a href="${detailUrl}" id="card-relaksasi-${step.id}" class="group bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/20 hover:border-[#2DD4A8] transition-all duration-300 shadow-xl flex flex-col gap-4 block cursor-pointer"
       onmouseenter="const v=this.querySelector('video'); if(v) v.play().catch(()=>{})"
       onmouseleave="const v=this.querySelector('video'); if(v){ v.pause(); v.currentTime=1; }">
      
      <!-- Video Thumbnail Container (Direct Video Frame) -->
      <div class="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-md">
        ${(videoTersedia && normalizedVideoSrc) ? `
          <video src="${normalizedVideoSrc}#t=1" preload="metadata" muted playsinline class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none" onloadedmetadata="this.currentTime=1"></video>
          <div class="absolute inset-0 flex items-center justify-center bg-black/35 group-hover:bg-black/15 transition-all duration-300 pointer-events-none">
            <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#0D1220]/75 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] group-hover:scale-110 group-hover:border-[#2DD4A8] group-hover:shadow-[0_0_25px_rgba(45,212,168,0.5)] transition-all duration-300">
              <img src="/assets/SVGForVideo/play.svg" alt="Play" class="w-7 h-7 sm:w-8 sm:h-8 translate-x-0.5" />
            </div>
          </div>
        ` : `
          <img src="${thumbnailSrc}" alt="${step.judul}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.onerror=null; this.src='/assets/Images/placeholder.svg';" />
          <div class="absolute inset-0 flex items-center justify-center bg-black/60 transition-all duration-300 pointer-events-none">
            <span class="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#FB923C]/20 text-[#FB923C] border border-[#FB923C]/40 backdrop-blur-md shadow-lg uppercase tracking-wider">
              Segera Hadir
            </span>
          </div>
        `}
      </div>

      <!-- Card Title (Emoji Removed) -->
      <div class="flex flex-col gap-2">
        <h3 class="text-lg sm:text-xl font-bold text-white leading-snug group-hover:text-[#2DD4A8] transition-colors" style="font-family:'Playfair Display',serif;">
          ${step.judul}
        </h3>

        <!-- Tags Row: Durasi & Tingkat -->
        <div class="flex items-center gap-2 flex-wrap text-xs">
          ${step.durasi ? `
            <span class="px-3 py-1 rounded-full font-semibold bg-[#FB923C]/10 text-[#FB923C] border border-[#FB923C]/30">
              ${step.durasi}
            </span>
          ` : ''}
          <span class="px-3 py-1 rounded-full font-semibold ${tingkatStyle.bg} ${tingkatStyle.text} border ${tingkatStyle.border}">
            ${step.tingkat ? step.tingkat.charAt(0).toUpperCase() + step.tingkat.slice(1) : tingkatStyle.label}
          </span>
          ${!videoTersedia ? `
            <span class="px-3 py-1 rounded-full font-semibold bg-[#FB923C]/10 text-[#FB923C] border border-[#FB923C]/30">
              Coming Soon
            </span>
          ` : ''}
        </div>
      </div>

      <!-- Deskripsi (2 lines max) -->
      <p class="text-xs sm:text-sm text-[#8A93A8] leading-relaxed line-clamp-2 flex-grow">
        ${step.deskripsi || ''}
      </p>

      <!-- Stacked Tag Lines: Manfaat & Tips -->
      <div class="flex flex-col gap-2 text-xs text-[#D1D5DB]">
        ${step.manfaat ? `
          <div class="p-2.5 sm:p-3 rounded-xl border border-white/5 bg-[#0D1220]/60 flex items-start sm:items-center gap-2.5">
            <span class="leading-normal"><strong>Manfaat:</strong> ${step.manfaat}</span>
          </div>
        ` : ''}

        ${step.tips ? `
          <div class="p-2.5 sm:p-3 rounded-xl border border-white/5 bg-[#0D1220]/60 flex items-start sm:items-center gap-2.5">
            <span class="leading-normal"><strong>Tip:</strong> ${step.tips}</span>
          </div>
        ` : ''}
      </div>

    </a>
  `;
}

async function initRelaksasiSteps() {
  const container = document.getElementById('relaksasi-grid-container');
  
  if (!container) return;

  try {
    let response;
    try {
      response = await fetch('/data/step-yoga.json');
      if (!response.ok) throw new Error('Root fetch failed');
    } catch (err) {
      response = await fetch('./data/step-yoga.json');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const steps = await response.json();

    if (!Array.isArray(steps) || steps.length === 0) {
      container.innerHTML = `<p class="text-center text-[#8A93A8] col-span-full py-8">Tidak ada alur relaksasi yang tersedia.</p>`;
      return;
    }

    // Sort by urutan sequence for consistent list ordering
    steps.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
    allRelaksasiSteps = steps;

    // Render cards into CSS grid container
    container.innerHTML = steps.map(renderRelaksasiCard).join('');
    if (window.AOS) window.AOS.refresh();

  } catch (error) {
    console.error('Gagal memuat alur relaksasi:', error);
    container.innerHTML = `
      <div class="col-span-full p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center text-red-300 text-sm">
        Gagal memuat langkah relaksasi. Silakan muat ulang halaman.
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', initRelaksasiSteps);
