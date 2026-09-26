/**
 * Relaksasi.js — Alur Relaksasi Tubuh & Pikiran + In-Page Video Modal Player
 * 
 * Menggabungkan daftar alur pose yoga dan custom video player VLC-style ke dalam
 * satu halaman terpadu (relaksasi.html) menggunakan modal overlay interaktif.
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

let allRelaksasiSteps = [];
let activeModalStep = null;
let currentVideoKeydownHandler = null;

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Render HTML untuk sebuah kartu pose relaksasi di halaman daftar
function renderRelaksasiCard(step) {
  const tingkatKey = (step.tingkat || 'pemula').toLowerCase();
  const tingkatStyle = TINGKAT_COLOR_MAP[tingkatKey] || TINGKAT_COLOR_MAP.pemula;
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
    <article id="card-relaksasi-${step.id}"
             data-id="${step.id}"
             tabindex="0"
             role="button"
             aria-label="Buka video panduan ${step.judul}"
             class="relaksasi-card group bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/20 hover:border-[#2DD4A8] transition-all duration-300 shadow-xl flex flex-col gap-4 block cursor-pointer"
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

      <!-- Card Title -->
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

      <!-- Deskripsi (2 baris) -->
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

      <!-- Action hint button -->
      <div class="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
        <span class="text-[#2DD4A8] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          Buka Video &amp; Panduan &rarr;
        </span>
      </div>

    </article>
  `;
}

// Inisialisasi daftar pose
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

    // Normalisasi video url dan ketersediaan
    allRelaksasiSteps = steps.map(s => {
      let vUrl = s.video_url || VIDEO_MAP[s.id] || null;
      if (vUrl && !vUrl.startsWith('/') && !vUrl.startsWith('http')) {
        vUrl = '/' + vUrl;
      }
      const vTersedia = typeof s.video_tersedia === 'boolean' ? s.video_tersedia : Boolean(vUrl);
      return {
        ...s,
        video_url: vTersedia ? vUrl : null,
        video_tersedia: vTersedia
      };
    });

    // Sort by urutan
    allRelaksasiSteps.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

    // Render kartu
    container.innerHTML = allRelaksasiSteps.map(renderRelaksasiCard).join('');

    // Event listener kartu
    container.querySelectorAll('.relaksasi-card').forEach(card => {
      const handleOpen = () => {
        const id = parseInt(card.getAttribute('data-id'), 10);
        const step = allRelaksasiSteps.find(s => s.id === id);
        if (step) {
          openRelaksasiModal(step);
        }
      };
      card.addEventListener('click', handleOpen);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      });
    });

    initModalEvents();

    // Cek query params (?id=1) atau hash (#pose-1)
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    if (idParam) {
      const targetStep = allRelaksasiSteps.find(s => String(s.id) === String(idParam));
      if (targetStep) {
        setTimeout(() => openRelaksasiModal(targetStep), 200);
      }
    } else if (window.location.hash.startsWith('#pose-')) {
      const hashId = window.location.hash.replace('#pose-', '');
      const targetStep = allRelaksasiSteps.find(s => String(s.id) === hashId);
      if (targetStep) {
        setTimeout(() => openRelaksasiModal(targetStep), 200);
      }
    }

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

// Inisialisasi event modal overlay
function initModalEvents() {
  const modal = document.getElementById('relaksasi-modal');
  const closeBtn = document.getElementById('relaksasi-modal-close-btn');
  const modalCard = document.getElementById('relaksasi-modal-card');

  if (!modal) return;

  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeRelaksasiModal());
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeRelaksasiModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
      if (!isFs) {
        closeRelaksasiModal();
      }
    }
  });
}

// Tutup modal dan hentikan pemutaran video
function closeRelaksasiModal() {
  const modal = document.getElementById('relaksasi-modal');
  const slot = document.getElementById('relaksasi-modal-slot');
  if (!modal) return;

  const video = modal.querySelector('video');
  if (video) {
    video.pause();
    video.currentTime = 0;
  }

  if (currentVideoKeydownHandler) {
    document.removeEventListener('keydown', currentVideoKeydownHandler);
    currentVideoKeydownHandler = null;
  }

  modal.classList.add('hidden');
  document.body.style.overflow = '';
  activeModalStep = null;
}

// Buka modal video dan render player VLC-style
function openRelaksasiModal(step) {
  const modal = document.getElementById('relaksasi-modal');
  const slot = document.getElementById('relaksasi-modal-slot');
  if (!modal || !slot) return;

  // Pause previous video if exists
  const prevVideo = modal.querySelector('video');
  if (prevVideo) {
    prevVideo.pause();
    prevVideo.currentTime = 0;
  }

  if (currentVideoKeydownHandler) {
    document.removeEventListener('keydown', currentVideoKeydownHandler);
    currentVideoKeydownHandler = null;
  }

  activeModalStep = step;

  const tingkatKey = (step.tingkat || 'pemula').toLowerCase();
  const tingkatStyle = TINGKAT_COLOR_MAP[tingkatKey] || TINGKAT_COLOR_MAP.pemula;

  const currentIndex = allRelaksasiSteps.findIndex(s => s.id === step.id);
  const prevStep = currentIndex > 0 ? allRelaksasiSteps[currentIndex - 1] : null;
  const nextStep = currentIndex < allRelaksasiSteps.length - 1 ? allRelaksasiSteps[currentIndex + 1] : null;

  const playerHTML = `
    <!-- 1. FULL CUSTOM VIDEO PLAYER -->
    <div id="detail-player-wrapper" class="video-player-container relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl mb-6 sm:mb-8">
      <video id="detail-video" src="${encodeURI(step.video_url || '')}" playsinline preload="metadata" class="w-full h-full object-cover"></video>

      <!-- VLC Gestures HUD Elements -->
      <!-- Left HUD: Brightness -->
      <div id="vlc-brightness-hud" class="vlc-indicator-hud left-4 sm:left-6">
        <img src="/assets/SVGForVideo/sun.svg" alt="Brightness" class="w-4 h-4" />
        <div class="vlc-indicator-track">
          <div id="vlc-brightness-bar" class="vlc-indicator-fill" style="height: 50%;"></div>
        </div>
        <span id="vlc-brightness-text" class="vlc-indicator-text">100%</span>
      </div>

      <!-- Right HUD: Volume -->
      <div id="vlc-volume-hud" class="vlc-indicator-hud right-4 sm:right-6">
        <img id="vlc-volume-icon" src="/assets/SVGForVideo/volume-on.svg" alt="Volume" class="w-4 h-4" />
        <div class="vlc-indicator-track">
          <div id="vlc-volume-bar" class="vlc-indicator-fill" style="height: 100%;"></div>
        </div>
        <span id="vlc-volume-text" class="vlc-indicator-text">100%</span>
      </div>

      <!-- Minimal Floating Quick Seek Badge -->
      <div id="vlc-seek-badge" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none opacity-0 scale-95 transition-all duration-200 text-[#2DD4A8] font-black text-4xl sm:text-5xl tracking-widest select-none flex items-center justify-center" style="text-shadow: 0 2px 12px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9);">
        <span id="vlc-seek-badge-text"></span>
      </div>

      <!-- Player Controls Overlay -->
      <div id="detail-player-overlay" class="player-controls-overlay">
        
        <!-- Top Bar: Title & Desktop Sliders -->
        <div class="flex items-center justify-between gap-3 z-30">
          <div class="flex items-center gap-2 min-w-0 pr-8">
            <span class="text-xs sm:text-sm font-bold text-white drop-shadow truncate max-w-[200px] sm:max-w-[360px]">
              ${step.judul}
            </span>
          </div>

          <!-- Desktop Brightness & Volume Controls -->
          <div class="hidden sm:flex items-center gap-3 shrink-0 relative">
            
            <!-- Brightness Column -->
            <div class="relative flex flex-col items-center">
              <button id="btn-brightness" type="button" class="player-btn" title="Kecerahan" aria-label="Pengaturan Kecerahan">
                <img src="/assets/SVGForVideo/sun.svg" alt="Brightness" class="w-5 h-5" onerror="this.onerror=null; this.src='/assets/SVGForVideoPlayer/brightnessFull.png';" />
              </button>
              
              <div id="panel-brightness" class="vertical-slider-panel hidden-panel" style="top: 48px;">
                <img src="/assets/SVGForVideo/sun.svg" alt="Sun Max" class="w-3.5 h-3.5 opacity-90" />
                <div class="v-slider-wrapper">
                  <input type="range" id="slider-brightness" class="v-slider" min="30" max="180" value="100" aria-label="Slider Kecerahan" />
                </div>
                <img src="/assets/SVGForVideo/sun.svg" alt="Sun Min" class="w-2.5 h-2.5 opacity-40" />
              </div>
            </div>

            <!-- Volume Column -->
            <div class="relative flex flex-col items-center">
              <button id="btn-volume" type="button" class="player-btn" title="Volume" aria-label="Pengaturan Volume">
                <img id="img-volume" src="/assets/SVGForVideo/volume-on.svg" alt="Volume" class="w-5 h-5" onerror="this.onerror=null; this.src='/assets/SVGForVideoPlayer/volume_Max.png';" />
              </button>
              
              <div id="panel-volume" class="vertical-slider-panel hidden-panel" style="top: 48px;">
                <img src="/assets/SVGForVideo/volume-on.svg" alt="Vol Max" class="w-3.5 h-3.5 opacity-90" />
                <div class="v-slider-wrapper">
                  <input type="range" id="slider-volume" class="v-slider" min="0" max="1" step="0.01" value="1" aria-label="Slider Volume" />
                </div>
                <img src="/assets/SVGForVideo/volume-off.svg" alt="Vol Off" class="w-3 h-3 opacity-40" />
              </div>
            </div>

          </div>
        </div>

        <!-- Center Controls: Rewind 5s & Forward 5s -->
        <div class="flex items-center justify-between w-full px-5 sm:px-14 my-auto z-20 pointer-events-none">
          <button id="btn-rewind" type="button" class="player-center-btn pointer-events-auto" title="Mundur 5 detik" aria-label="Mundur 5 detik">
            <img src="/assets/SVGForVideo/rewind-5s.svg" alt="Rewind 5s" class="w-6 h-6" />
          </button>

          <button id="btn-forward" type="button" class="player-center-btn pointer-events-auto" title="Maju 5 detik" aria-label="Maju 5 detik">
            <img src="/assets/SVGForVideo/forward-5s.svg" alt="Forward 5s" class="w-6 h-6" />
          </button>
        </div>

        <!-- Bottom Controls: Seekbar & Actions Row -->
        <div class="flex flex-col gap-2.5 z-30">
          
          <!-- Seekbar Row -->
          <div class="flex items-center gap-2.5 text-xs text-white font-mono">
            <span id="time-current" class="w-10 text-right">00:00</span>
            <input type="range" id="seekbar" class="player-seekbar flex-grow" min="0" max="100" value="0" step="0.1" aria-label="Timeline Video" />
            <span id="time-total" class="w-10">00:00</span>
          </div>

          <!-- Bottom Action Row: Centered Nav + Right Fullscreen -->
          <div class="relative flex items-center justify-center min-h-[44px]">
            <!-- Centered Prev | Play/Pause | Next -->
            <div class="flex items-center justify-center gap-4">
              <button id="btn-prev" type="button" class="player-btn ${!prevStep ? 'disabled' : ''}" title="Gerakan Sebelumnya" aria-label="Gerakan Sebelumnya" ${!prevStep ? 'disabled' : ''}>
                <img src="/assets/SVGForVideo/skip-previous.svg" alt="Previous" class="w-5 h-5" onerror="this.onerror=null; this.src='/assets/SVGForVideoPlayer/Skip-Previous.png';" />
              </button>

              <button id="btn-bottom-play" type="button" class="player-btn" title="Putar / Jeda" aria-label="Putar atau Jeda Video">
                <img id="img-bottom-play" src="/assets/SVGForVideo/play.svg" alt="Play" class="w-5 h-5 translate-x-0.5" />
              </button>

              <button id="btn-next" type="button" class="player-btn ${!nextStep ? 'disabled' : ''}" title="Gerakan Selanjutnya" aria-label="Gerakan Selanjutnya" ${!nextStep ? 'disabled' : ''}>
                <img src="/assets/SVGForVideo/skip-next.svg" alt="Next" class="w-5 h-5" onerror="this.onerror=null; this.src='/assets/SVGForVideoPlayer/Skip-Next.png';" />
              </button>
            </div>

            <!-- Fullscreen Button -->
            <div class="absolute right-0 bottom-0">
              <button id="btn-fullscreen" type="button" class="player-btn" title="Layar Penuh" aria-label="Layar Penuh">
                <img id="img-fullscreen" src="/assets/SVGForVideo/fullscreen.svg" alt="Fullscreen" class="w-5 h-5" onerror="this.style.display='none'; const fb = document.getElementById('svg-fs-fallback'); if(fb) fb.classList.remove('hidden');" />
                <svg id="svg-fs-fallback" class="w-5 h-5 hidden" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  `;

  const comingSoonPlayerHTML = `
    <!-- COMING SOON VIDEO PLACEHOLDER -->
    <div id="detail-player-wrapper" class="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/60 backdrop-blur-md shadow-2xl mb-6 sm:mb-8 flex flex-col items-center justify-center p-6 text-center">
      <div class="w-16 h-16 rounded-full bg-[#2DD4A8]/10 border border-[#2DD4A8]/30 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-[#2DD4A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <span class="px-3.5 py-1 rounded-full text-xs font-semibold bg-[#FB923C]/20 text-[#FB923C] border border-[#FB923C]/40 mb-3 uppercase tracking-wider">
        Video Segera Hadir
      </span>
      <h3 class="text-xl font-bold text-white mb-2" style="font-family:'Playfair Display',serif;">${step.judul}</h3>
      <p class="text-xs sm:text-sm text-[#8A93A8] max-w-md">
        Panduan video untuk gerakan ini sedang disiapkan. Kamu tetap dapat mempraktikkan pose ini dengan membaca panduan dan tips di bawah.
      </p>
    </div>
  `;

  const contentHTML = `
    <!-- POSE DETAILS CARD -->
    <div class="bg-white/5 backdrop-blur-md rounded-2xl p-5 sm:p-7 border border-white/10 shadow-xl">
      
      <!-- Title & Tags Row -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-white/10">
        <h3 class="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight" style="font-family:'Playfair Display',serif;">
          ${step.judul}
        </h3>

        <div class="flex items-center gap-2 shrink-0 text-xs">
          ${step.durasi ? `
            <span class="px-3 py-1 rounded-full font-semibold bg-[#FB923C]/10 text-[#FB923C] border border-[#FB923C]/30">
              ${step.durasi}
            </span>
          ` : ''}
          <span class="px-3 py-1 rounded-full font-semibold ${tingkatStyle.bg} ${tingkatStyle.text} border ${tingkatStyle.border}">
            ${step.tingkat ? step.tingkat.charAt(0).toUpperCase() + step.tingkat.slice(1) : tingkatStyle.label}
          </span>
          ${!step.video_tersedia ? `
            <span class="px-3 py-1 rounded-full font-semibold bg-[#FB923C]/10 text-[#FB923C] border border-[#FB923C]/30">
              Coming Soon
            </span>
          ` : ''}
        </div>
      </div>

      <!-- Description -->
      <p class="text-xs sm:text-sm text-[#8A93A8] leading-relaxed mb-6">
        ${step.deskripsi || ''}
      </p>

      <!-- Manfaat & Tip Chips -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-[#D1D5DB]">
        ${step.manfaat ? `
          <div class="p-3 sm:p-4 rounded-xl border border-white/5 bg-[#0D1220]/60 flex items-start gap-3">
            <div>
              <strong class="text-white block mb-0.5">Manfaat:</strong>
              <span class="leading-relaxed text-[#8A93A8]">${step.manfaat}</span>
            </div>
          </div>
        ` : ''}

        ${step.tips ? `
          <div class="p-3 sm:p-4 rounded-xl border border-white/5 bg-[#0D1220]/60 flex items-start gap-3">
            <div>
              <strong class="text-white block mb-0.5">Tip:</strong>
              <span class="leading-relaxed text-[#8A93A8]">${step.tips}</span>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Quick Step Navigation Row -->
      <div class="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
        ${prevStep ? `
          <button id="modal-nav-prev-btn" type="button" class="inline-flex items-center gap-2 text-xs font-semibold text-[#8A93A8] hover:text-[#2DD4A8] transition-colors cursor-pointer">
            &larr; ${prevStep.judul}
          </button>
        ` : `<div></div>`}

        ${nextStep ? `
          <button id="modal-nav-next-btn" type="button" class="inline-flex items-center gap-2 text-xs font-semibold text-[#2DD4A8] hover:text-[#25b892] transition-colors cursor-pointer ml-auto">
            ${nextStep.judul} &rarr;
          </button>
        ` : `<div></div>`}
      </div>

    </div>
  `;

  slot.innerHTML = (step.video_tersedia ? playerHTML : comingSoonPlayerHTML) + contentHTML;

  // Pasang navigasi antar langkah di dalam modal
  const modalPrevBtn = document.getElementById('modal-nav-prev-btn');
  const modalNextBtn = document.getElementById('modal-nav-next-btn');
  if (modalPrevBtn && prevStep) {
    modalPrevBtn.addEventListener('click', () => openRelaksasiModal(prevStep));
  }
  if (modalNextBtn && nextStep) {
    modalNextBtn.addEventListener('click', () => openRelaksasiModal(nextStep));
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  if (step.video_tersedia) {
    initVideoPlayerControls(step, prevStep, nextStep);
  }
}

// Kontrol pemutar video VLC kustom
function initVideoPlayerControls(step, prevStep, nextStep) {
  const wrapper = document.getElementById('detail-player-wrapper');
  const video = document.getElementById('detail-video');
  const overlay = document.getElementById('detail-player-overlay');

  const btnBrightness = document.getElementById('btn-brightness');
  const btnVolume = document.getElementById('btn-volume');
  const panelBrightness = document.getElementById('panel-brightness');
  const panelVolume = document.getElementById('panel-volume');
  const sliderBrightness = document.getElementById('slider-brightness');
  const sliderVolume = document.getElementById('slider-volume');
  const imgVolume = document.getElementById('img-volume');

  const btnRewind = document.getElementById('btn-rewind');
  const btnForward = document.getElementById('btn-forward');
  const btnBottomPlay = document.getElementById('btn-bottom-play');
  const imgBottomPlay = document.getElementById('img-bottom-play');

  const seekbar = document.getElementById('seekbar');
  const timeCurrent = document.getElementById('time-current');
  const timeTotal = document.getElementById('time-total');

  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const imgFullscreen = document.getElementById('img-fullscreen');
  const svgFsFallback = document.getElementById('svg-fs-fallback');

  const vlcBrightnessHud = document.getElementById('vlc-brightness-hud');
  const vlcBrightnessBar = document.getElementById('vlc-brightness-bar');
  const vlcBrightnessText = document.getElementById('vlc-brightness-text');

  const vlcVolumeHud = document.getElementById('vlc-volume-hud');
  const vlcVolumeBar = document.getElementById('vlc-volume-bar');
  const vlcVolumeText = document.getElementById('vlc-volume-text');
  const vlcVolumeIcon = document.getElementById('vlc-volume-icon');

  const vlcSeekBadge = document.getElementById('vlc-seek-badge');
  const vlcSeekBadgeText = document.getElementById('vlc-seek-badge-text');

  if (!video || !wrapper) return;

  let currentBrightness = 100;
  let autoHideTimer = null;

  function showControls() {
    if (overlay) overlay.classList.remove('control-hidden');
    resetAutoHide();
  }

  function resetAutoHide() {
    clearTimeout(autoHideTimer);
    if (!video.paused && overlay) {
      autoHideTimer = setTimeout(() => {
        const isBrightnessPanelOpen = panelBrightness && !panelBrightness.classList.contains('hidden-panel');
        const isVolumePanelOpen = panelVolume && !panelVolume.classList.contains('hidden-panel');
        if (!isBrightnessPanelOpen && !isVolumePanelOpen) {
          overlay.classList.add('control-hidden');
        }
      }, 3000);
    }
  }

  wrapper.addEventListener('mousemove', showControls);
  wrapper.addEventListener('mouseleave', () => {
    const isBrightnessPanelOpen = panelBrightness && !panelBrightness.classList.contains('hidden-panel');
    const isVolumePanelOpen = panelVolume && !panelVolume.classList.contains('hidden-panel');
    if (!video.paused && !isBrightnessPanelOpen && !isVolumePanelOpen && overlay) {
      overlay.classList.add('control-hidden');
    }
  });

  function togglePlayPause() {
    if (video.paused) {
      const p = video.play();
      if (p !== undefined) {
        p.catch(err => console.warn('Playback error:', err));
      }
    } else {
      video.pause();
    }
  }

  video.addEventListener('play', () => {
    if (imgBottomPlay) imgBottomPlay.src = '/assets/SVGForVideo/pause.svg';
    resetAutoHide();
  });

  video.addEventListener('pause', () => {
    if (imgBottomPlay) imgBottomPlay.src = '/assets/SVGForVideo/play.svg';
    if (overlay) overlay.classList.remove('control-hidden');
    clearTimeout(autoHideTimer);
  });

  if (btnBottomPlay) {
    btnBottomPlay.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlayPause();
    });
  }

  video.addEventListener('loadedmetadata', () => {
    if (seekbar) seekbar.max = video.duration || 100;
    if (timeTotal) timeTotal.textContent = formatTime(video.duration);
  });

  video.addEventListener('timeupdate', () => {
    if (!isNaN(video.duration) && seekbar) {
      seekbar.max = video.duration;
      seekbar.value = video.currentTime;
      if (timeCurrent) timeCurrent.textContent = formatTime(video.currentTime);
      if (timeTotal) timeTotal.textContent = formatTime(video.duration);

      const percent = (video.currentTime / video.duration) * 100 || 0;
      seekbar.style.background = `linear-gradient(to right, #2DD4A8 ${percent}%, rgba(255,255,255,0.2) ${percent}%)`;
    }
  });

  if (seekbar) {
    seekbar.addEventListener('input', () => {
      video.currentTime = seekbar.value;
      const percent = (seekbar.value / seekbar.max) * 100 || 0;
      seekbar.style.background = `linear-gradient(to right, #2DD4A8 ${percent}%, rgba(255,255,255,0.2) ${percent}%)`;
    });
  }

  let seekBadgeTimer = null;
  function showSeekBadge(text) {
    if (!vlcSeekBadge || !vlcSeekBadgeText) return;
    if (seekBadgeTimer) clearTimeout(seekBadgeTimer);
    vlcSeekBadgeText.textContent = text;
    vlcSeekBadge.classList.remove('opacity-0', 'scale-95');
    vlcSeekBadge.classList.add('opacity-100', 'scale-100');
    seekBadgeTimer = setTimeout(() => {
      vlcSeekBadge.classList.remove('opacity-100', 'scale-100');
      vlcSeekBadge.classList.add('opacity-0', 'scale-95');
    }, 650);
  }

  if (btnRewind) {
    btnRewind.addEventListener('click', (e) => {
      e.stopPropagation();
      video.currentTime = Math.max(0, video.currentTime - 5);
      showSeekBadge('-5');
      showControls();
    });
  }

  if (btnForward) {
    btnForward.addEventListener('click', (e) => {
      e.stopPropagation();
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
      showSeekBadge('+5');
      showControls();
    });
  }

  currentVideoKeydownHandler = function (e) {
    const modal = document.getElementById('relaksasi-modal');
    if (!modal || modal.classList.contains('hidden') || !video) return;

    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag === 'input' && document.activeElement.type === 'text') return;
    if (activeTag === 'textarea') return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
      showSeekBadge('+5');
      showControls();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 5);
      showSeekBadge('-5');
      showControls();
    } else if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      togglePlayPause();
    }
  };

  document.addEventListener('keydown', currentVideoKeydownHandler);

  function applyBrightness(val) {
    currentBrightness = Math.round(Math.min(180, Math.max(30, val)));
    video.style.filter = `brightness(${currentBrightness}%)`;

    if (sliderBrightness) {
      sliderBrightness.value = currentBrightness;
      const percent = ((currentBrightness - 30) / 150) * 100;
      sliderBrightness.style.background = `linear-gradient(to right, #2DD4A8 ${percent}%, rgba(255,255,255,0.25) ${percent}%)`;
    }

    if (vlcBrightnessBar && vlcBrightnessText) {
      const fillPercent = ((currentBrightness - 30) / 150) * 100;
      vlcBrightnessBar.style.height = `${fillPercent}%`;
      vlcBrightnessText.textContent = `${currentBrightness}%`;
    }
  }

  function applyVolume(val) {
    const v = Math.min(1, Math.max(0, val));
    video.volume = v;
    video.muted = (v === 0);

    if (sliderVolume) {
      sliderVolume.value = v;
      const percent = v * 100;
      sliderVolume.style.background = `linear-gradient(to right, #2DD4A8 ${percent}%, rgba(255,255,255,0.25) ${percent}%)`;
    }

    const isMuted = (v === 0);
    const iconSrc = isMuted ? '/assets/SVGForVideo/volume-off.svg' : '/assets/SVGForVideo/volume-on.svg';
    if (imgVolume) imgVolume.src = iconSrc;
    if (vlcVolumeIcon) vlcVolumeIcon.src = iconSrc;

    if (vlcVolumeBar && vlcVolumeText) {
      const fillPercent = Math.round(v * 100);
      vlcVolumeBar.style.height = `${fillPercent}%`;
      vlcVolumeText.textContent = `${fillPercent}%`;
    }
  }

  if (btnBrightness && panelBrightness) {
    btnBrightness.addEventListener('click', (e) => {
      e.stopPropagation();
      if (panelVolume) {
        panelVolume.classList.add('hidden-panel');
        btnVolume.classList.remove('active');
      }
      panelBrightness.classList.toggle('hidden-panel');
      btnBrightness.classList.toggle('active');
      showControls();
    });
  }

  if (sliderBrightness) {
    sliderBrightness.addEventListener('input', (e) => {
      e.stopPropagation();
      applyBrightness(sliderBrightness.value);
      showControls();
    });
  }

  if (btnVolume && panelVolume) {
    btnVolume.addEventListener('click', (e) => {
      e.stopPropagation();
      if (panelBrightness) {
        panelBrightness.classList.add('hidden-panel');
        btnBrightness.classList.remove('active');
      }
      panelVolume.classList.toggle('hidden-panel');
      btnVolume.classList.toggle('active');
      showControls();
    });
  }

  if (sliderVolume) {
    sliderVolume.addEventListener('input', (e) => {
      e.stopPropagation();
      applyVolume(parseFloat(sliderVolume.value));
      showControls();
    });
  }

  // Prev / Next button in player
  if (btnPrev && prevStep) {
    btnPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      openRelaksasiModal(prevStep);
    });
  }

  if (btnNext && nextStep) {
    btnNext.addEventListener('click', (e) => {
      e.stopPropagation();
      openRelaksasiModal(nextStep);
    });
  }

  function isFullscreenActive() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  }

  function toggleFullscreen() {
    if (!isFullscreenActive()) {
      if (wrapper.requestFullscreen) {
        wrapper.requestFullscreen();
      } else if (wrapper.webkitRequestFullscreen) {
        wrapper.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  function handleFullscreenChange() {
    const isFs = isFullscreenActive();
    if (isFs) {
      if (imgFullscreen) {
        imgFullscreen.src = '/assets/SVGForVideo/fullscreen-exit.svg';
        imgFullscreen.alt = 'Exit Fullscreen';
      }
      if (btnFullscreen) btnFullscreen.title = 'Keluar Layar Penuh';
    } else {
      if (imgFullscreen) {
        imgFullscreen.src = '/assets/SVGForVideo/fullscreen.svg';
        imgFullscreen.alt = 'Fullscreen';
      }
      if (btnFullscreen) btnFullscreen.title = 'Layar Penuh';
    }
  }

  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
      showControls();
    });
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

  // Touch Gestures for Mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartVal = 0;
  let touchSide = null;
  let isDragging = false;
  let hudHideTimer = null;
  let lastTapTime = 0;
  let lastTapSide = null;

  wrapper.addEventListener('touchstart', (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = wrapper.getBoundingClientRect();
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      isDragging = false;

      const relX = touchStartX - rect.left;
      touchSide = relX < (rect.width / 2) ? 'brightness' : 'volume';

      if (touchSide === 'brightness') {
        touchStartVal = currentBrightness;
      } else {
        touchStartVal = video.volume;
      }
    }
  }, { passive: true });

  wrapper.addEventListener('touchmove', (e) => {
    if (!touchSide || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const deltaY = touchStartY - touch.clientY;
    const deltaX = Math.abs(touch.clientX - touchStartX);

    if (Math.abs(deltaY) > 6 && Math.abs(deltaY) > deltaX) {
      isDragging = true;
      clearTimeout(hudHideTimer);

      const rect = wrapper.getBoundingClientRect();
      const factor = deltaY / (rect.height * 0.65);

      if (touchSide === 'brightness') {
        const targetVal = touchStartVal + factor * 100;
        applyBrightness(targetVal);
        if (vlcBrightnessHud) vlcBrightnessHud.classList.add('vlc-show');
        if (vlcVolumeHud) vlcVolumeHud.classList.remove('vlc-show');
      } else {
        const targetVal = touchStartVal + factor;
        applyVolume(targetVal);
        if (vlcVolumeHud) vlcVolumeHud.classList.add('vlc-show');
        if (vlcBrightnessHud) vlcBrightnessHud.classList.remove('vlc-show');
      }
    }
  }, { passive: true });

  wrapper.addEventListener('touchend', (e) => {
    if (isDragging) {
      hudHideTimer = setTimeout(() => {
        if (vlcBrightnessHud) vlcBrightnessHud.classList.remove('vlc-show');
        if (vlcVolumeHud) vlcVolumeHud.classList.remove('vlc-show');
      }, 700);
      isDragging = false;
      touchSide = null;
      return;
    }

    if (!e.target.closest('button') && !e.target.closest('input')) {
      const now = Date.now();
      const rect = wrapper.getBoundingClientRect();
      const clickX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : touchStartX;
      const side = (clickX - rect.left) < (rect.width / 2) ? 'left' : 'right';

      if (now - lastTapTime < 280 && lastTapSide === side) {
        if (side === 'left') {
          video.currentTime = Math.max(0, video.currentTime - 5);
          showSeekBadge('-5');
        } else {
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
          showSeekBadge('+5');
        }
        lastTapTime = 0;
      } else {
        lastTapTime = now;
        lastTapSide = side;
        setTimeout(() => {
          if (lastTapTime === now && overlay) {
            if (overlay.classList.contains('control-hidden')) {
              showControls();
            } else {
              overlay.classList.add('control-hidden');
            }
          }
        }, 290);
      }
    }
    touchSide = null;
  });

  video.addEventListener('click', () => {
    togglePlayPause();
  });
}

document.addEventListener('DOMContentLoaded', initRelaksasiSteps);
