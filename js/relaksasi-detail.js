/**
 * relaksasi-detail.js — Detail Page & Custom VLC-Style Video Player for Relaksasi
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

let allSteps = [];
let currentStep = null;

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function loadRelaksasiDetail() {
  const container = document.getElementById('relaksasi-detail-container');
  if (!container) return;

  try {
    let response;
    try {
      response = await fetch('/data/relaksasi-steps.json');
      if (!response.ok) throw new Error('Root fetch failed');
    } catch (e) {
      response = await fetch('./data/relaksasi-steps.json');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    allSteps = await response.json();
    if (!Array.isArray(allSteps) || allSteps.length === 0) {
      throw new Error('Data alur relaksasi kosong');
    }

    // Sort by urutan for internal sequence & navigation logic
    allSteps.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

    // Get id from URL query parameter
    const params = new URLSearchParams(window.location.search);
    const stepIdParam = params.get('id');
    const stepId = parseInt(stepIdParam, 10);

    // Find matching pose, or fallback to first pose
    currentStep = allSteps.find(s => s.id === stepId) || allSteps[0];

    // Update dynamic background image if available
    const bgImg = document.getElementById('detail-bg-img');
    if (bgImg && currentStep.video_thumbnail) {
      bgImg.src = currentStep.video_thumbnail;
    }

    // Update page title
    document.title = `${currentStep.judul} — Teduh Relaksasi`;

    // Render page content
    renderDetailPage(currentStep);

  } catch (err) {
    console.error('Gagal memuat detail relaksasi:', err);
    container.innerHTML = `
      <div class="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center text-red-300">
        <p class="font-bold text-lg mb-2">Gagal Memuat Detail Relaksasi</p>
        <p class="text-sm mb-4 text-[#8A93A8]">Pose yang kamu cari tidak ditemukan atau terjadi kesalahan koneksi.</p>
        <a href="/relaksasi.html" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-[#2DD4A8] text-[#0D1220] hover:bg-[#25b892] transition-colors">
          &larr; Kembali ke Panduan Relaksasi
        </a>
      </div>
    `;
  }
}

function renderDetailPage(step) {
  const container = document.getElementById('relaksasi-detail-container');
  if (!container) return;

  const tingkatKey = (step.tingkat || 'pemula').toLowerCase();
  const tingkatStyle = TINGKAT_COLOR_MAP[tingkatKey] || TINGKAT_COLOR_MAP.pemula;

  // Determine prev and next steps based on sorted urutan
  const currentIndex = allSteps.findIndex(s => s.id === step.id);
  const prevStep = currentIndex > 0 ? allSteps[currentIndex - 1] : null;
  const nextStep = currentIndex < allSteps.length - 1 ? allSteps[currentIndex + 1] : null;

  // Filter other steps for "Video Lainnya"
  const otherSteps = allSteps.filter(s => s.id !== step.id);

  container.innerHTML = `
    <!-- 1. FULL CUSTOM VIDEO PLAYER -->
    <div id="detail-player-wrapper" class="video-player-container relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl mb-8">
      <video id="detail-video" src="${step.video_url}" playsinline preload="metadata" class="w-full h-full object-cover"></video>

      <!-- VLC Gestures HUD Elements (Mobile Left: Brightness, Right: Volume — Slim Vertical Pills) -->
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

      <!-- VLC Double Tap Quick Seek Badge -->
      <div id="vlc-seek-badge" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none opacity-0 scale-75 transition-all duration-200 bg-[#0D1220]/85 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 text-white font-semibold text-xs flex items-center gap-2 shadow-2xl">
        <span id="vlc-seek-badge-text">--</span>
      </div>

      <!-- Player Controls Overlay -->
      <div id="detail-player-overlay" class="player-controls-overlay">
        
        <!-- Top Bar: Title & Desktop Sliders (Hidden on mobile where users swipe VLC-style) -->
        <div class="flex items-center justify-between gap-3 z-30">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs sm:text-sm font-bold text-white drop-shadow truncate max-w-[200px] sm:max-w-[360px]">
              ${step.judul}
            </span>
          </div>

          <!-- Desktop Brightness & Volume Controls (Clean Floating Bars, NO Background) -->
          <div class="hidden sm:flex items-center gap-3 shrink-0 relative">
            
            <!-- Brightness Column -->
            <div class="relative flex flex-col items-center">
              <button id="btn-brightness" class="player-btn" title="Kecerahan">
                <img src="/assets/SVGForVideo/sun.svg" alt="Brightness" class="w-5 h-5" onerror="this.onerror=null; this.src='/assets/SVGForVideoPlayer/brightnessFull.png';" />
              </button>
              
              <!-- Floating Vertical Slider Bar (NO background box, just clean bar) -->
              <div id="panel-brightness" class="vertical-slider-panel hidden-panel" style="top: 48px;">
                <img src="/assets/SVGForVideo/sun.svg" alt="Sun Max" class="w-3.5 h-3.5 opacity-90" />
                <div class="v-slider-wrapper">
                  <input type="range" id="slider-brightness" class="v-slider" min="30" max="180" value="100" />
                </div>
                <img src="/assets/SVGForVideo/sun.svg" alt="Sun Min" class="w-2.5 h-2.5 opacity-40" />
              </div>
            </div>

            <!-- Volume Column -->
            <div class="relative flex flex-col items-center">
              <button id="btn-volume" class="player-btn" title="Volume">
                <img id="img-volume" src="/assets/SVGForVideo/volume-on.svg" alt="Volume" class="w-5 h-5" onerror="this.onerror=null; this.src='/assets/SVGForVideoPlayer/volume_Max.png';" />
              </button>
              
              <!-- Floating Vertical Slider Bar (NO background box, just clean bar) -->
              <div id="panel-volume" class="vertical-slider-panel hidden-panel" style="top: 48px;">
                <img src="/assets/SVGForVideo/volume-on.svg" alt="Vol Max" class="w-3.5 h-3.5 opacity-90" />
                <div class="v-slider-wrapper">
                  <input type="range" id="slider-volume" class="v-slider" min="0" max="1" step="0.01" value="1" />
                </div>
                <img src="/assets/SVGForVideo/volume-off.svg" alt="Vol Off" class="w-3 h-3 opacity-40" />
              </div>
            </div>

          </div>
        </div>

        <!-- Center Controls: Rewind 5s (left) & Forward 5s (right) -->
        <div class="flex items-center justify-between w-full px-5 sm:px-14 my-auto z-20 pointer-events-none">
          <button id="btn-rewind" class="player-center-btn pointer-events-auto" title="Mundur 5 detik">
            <img src="/assets/SVGForVideo/rewind-5s.svg" alt="Rewind 5s" class="w-6 h-6" />
          </button>

          <button id="btn-forward" class="player-center-btn pointer-events-auto" title="Maju 5 detik">
            <img src="/assets/SVGForVideo/forward-5s.svg" alt="Forward 5s" class="w-6 h-6" />
          </button>
        </div>

        <!-- Bottom Controls: Seekbar & Actions Row -->
        <div class="flex flex-col gap-2.5 z-30">
          
          <!-- Seekbar Row -->
          <div class="flex items-center gap-2.5 text-xs text-white font-mono">
            <span id="time-current" class="w-10 text-right">00:00</span>
            <input type="range" id="seekbar" class="player-seekbar flex-grow" min="0" max="100" value="0" step="0.1" />
            <span id="time-total" class="w-10">00:00</span>
          </div>

          <!-- Bottom Action Row: Centered Nav + Right-aligned Fullscreen -->
          <div class="relative flex items-center justify-center min-h-[44px]">
            <!-- Centered Prev | Play/Pause | Next -->
            <div class="flex items-center justify-center gap-4">
              <button id="btn-prev" class="player-btn ${!prevStep ? 'disabled' : ''}" title="Gerakan Sebelumnya" ${!prevStep ? 'disabled' : ''}>
                <img src="/assets/SVGForVideo/skip-previous.svg" alt="Previous" class="w-5 h-5" onerror="this.onerror=null; this.src='/assets/SVGForVideoPlayer/Skip-Previous.png';" />
              </button>

              <button id="btn-bottom-play" class="player-btn" title="Putar / Jeda">
                <img id="img-bottom-play" src="/assets/SVGForVideo/play.svg" alt="Play" class="w-5 h-5 translate-x-0.5" />
              </button>

              <button id="btn-next" class="player-btn ${!nextStep ? 'disabled' : ''}" title="Gerakan Selanjutnya" ${!nextStep ? 'disabled' : ''}>
                <img src="/assets/SVGForVideo/skip-next.svg" alt="Next" class="w-5 h-5" onerror="this.onerror=null; this.src='/assets/SVGForVideoPlayer/Skip-Next.png';" />
              </button>
            </div>

            <!-- Fullscreen Button (Bottom-Right corner, YouTube-style) -->
            <div class="absolute right-0 bottom-0">
              <button id="btn-fullscreen" class="player-btn" title="Layar Penuh">
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

    <!-- 2. POSE DETAILS CARD -->
    <div class="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/20 shadow-xl mb-16">
      
      <!-- Title & Tags Row -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-white/10">
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight" style="font-family:'Playfair Display',serif;">
          ${step.judul}
        </h1>

        <div class="flex items-center gap-2 shrink-0 text-xs">
          ${step.durasi ? `
            <span class="px-3.5 py-1.5 rounded-full font-semibold bg-[#FB923C]/10 text-[#FB923C] border border-[#FB923C]/30">
              ${step.durasi}
            </span>
          ` : ''}
          <span class="px-3.5 py-1.5 rounded-full font-semibold ${tingkatStyle.bg} ${tingkatStyle.text} border ${tingkatStyle.border}">
            ${step.tingkat ? step.tingkat.charAt(0).toUpperCase() + step.tingkat.slice(1) : tingkatStyle.label}
          </span>
        </div>
      </div>

      <!-- Description -->
      <p class="text-sm sm:text-base text-[#8A93A8] leading-relaxed mb-6">
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

    </div>

    <!-- 3. VIDEO LAINNYA SECTION -->
    <div class="pt-6 border-t border-white/10">
      <div class="mb-8">
        <span class="text-xs font-bold uppercase tracking-widest text-[#2DD4A8] mb-1 block">EKSPLORASI POSE</span>
        <h2 class="text-2xl sm:text-3xl font-bold text-white mb-2" style="font-family:'Playfair Display',serif;">
          Gerakan Relaksasi Lainnya
        </h2>
        <p class="text-xs sm:text-sm text-[#8A93A8]">
          Lanjutkan sesi relaksasimu dengan pose-pose pemulihan tubuh lainnya di bawah ini.
        </p>
      </div>

      <!-- Other Poses Grid (Static Cards without Numeric Badges) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        ${otherSteps.map(renderOtherPoseCard).join('')}
      </div>
    </div>
  `;

  // Attach full video player logic
  initVideoPlayerControls(step, prevStep, nextStep);
}

// Function to render static thumbnail cards for other poses (No numeric badges)
function renderOtherPoseCard(other) {
  const tingkatKey = (other.tingkat || 'pemula').toLowerCase();
  const tingkatStyle = TINGKAT_COLOR_MAP[tingkatKey] || TINGKAT_COLOR_MAP.pemula;
  const detailUrl = `/relaksasi-detail.html?id=${other.id}`;

  return `
    <a href="${detailUrl}" class="group bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:border-[#2DD4A8] transition-all duration-300 shadow-xl flex flex-col gap-4 block cursor-pointer">
      
      <!-- Thumbnail with Play Icon Overlay -->
      <div class="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/50 shadow-md">
        <img src="${other.video_thumbnail}" alt="${other.judul}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.onerror=null; this.src='/assets/Images/artikel/hutan1.webp';" />
        
        <div class="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/25 transition-all duration-300">
          <div class="w-12 h-12 rounded-full bg-[#0D1220]/75 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] group-hover:scale-110 group-hover:border-[#2DD4A8] group-hover:shadow-[0_0_25px_rgba(45,212,168,0.5)] transition-all duration-300">
            <img src="/assets/SVGForVideo/play.svg" alt="Play" class="w-6 h-6 translate-x-0.5" />
          </div>
        </div>
      </div>

      <!-- Title & Tags -->
      <div class="flex flex-col gap-2">
        <h3 class="text-base sm:text-lg font-bold text-white leading-snug group-hover:text-[#2DD4A8] transition-colors" style="font-family:'Playfair Display',serif;">
          ${other.judul}
        </h3>

        <div class="flex items-center gap-2 flex-wrap text-xs">
          ${other.durasi ? `
            <span class="px-2.5 py-1 rounded-full font-semibold bg-[#FB923C]/10 text-[#FB923C] border border-[#FB923C]/30">
              ${other.durasi}
            </span>
          ` : ''}
          <span class="px-2.5 py-1 rounded-full font-semibold ${tingkatStyle.bg} ${tingkatStyle.text} border ${tingkatStyle.border}">
            ${other.tingkat ? other.tingkat.charAt(0).toUpperCase() + other.tingkat.slice(1) : tingkatStyle.label}
          </span>
        </div>
      </div>

      <!-- Short Description -->
      <p class="text-xs text-[#8A93A8] leading-relaxed line-clamp-2 flex-grow">
        ${other.deskripsi || ''}
      </p>

      <!-- Chips -->
      <div class="flex flex-col gap-2 text-xs text-[#D1D5DB]">
        ${other.manfaat ? `
          <div class="p-2.5 rounded-xl border border-white/5 bg-[#0D1220]/60 flex items-start gap-2">
            <span class="leading-normal"><strong>Manfaat:</strong> ${other.manfaat}</span>
          </div>
        ` : ''}
        ${other.tips ? `
          <div class="p-2.5 rounded-xl border border-white/5 bg-[#0D1220]/60 flex items-start gap-2">
            <span class="leading-normal"><strong>Tip:</strong> ${other.tips}</span>
          </div>
        ` : ''}
      </div>

    </a>
  `;
}

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
    overlay.classList.remove('control-hidden');
    resetAutoHide();
  }

  function resetAutoHide() {
    clearTimeout(autoHideTimer);
    if (!video.paused) {
      autoHideTimer = setTimeout(() => {
        // Only hide if popup slider panels are closed
        const isBrightnessPanelOpen = panelBrightness && !panelBrightness.classList.contains('hidden-panel');
        const isVolumePanelOpen = panelVolume && !panelVolume.classList.contains('hidden-panel');
        if (!isBrightnessPanelOpen && !isVolumePanelOpen) {
          overlay.classList.add('control-hidden');
        }
      }, 3000);
    }
  }

  // Hover & desktop mouse move interactions
  wrapper.addEventListener('mousemove', showControls);
  wrapper.addEventListener('mouseleave', () => {
    const isBrightnessPanelOpen = panelBrightness && !panelBrightness.classList.contains('hidden-panel');
    const isVolumePanelOpen = panelVolume && !panelVolume.classList.contains('hidden-panel');
    if (!video.paused && !isBrightnessPanelOpen && !isVolumePanelOpen) {
      overlay.classList.add('control-hidden');
    }
  });

  // Play / Pause toggle
  function togglePlayPause() {
    if (video.paused) {
      video.play().catch(err => console.log('Playback error:', err));
    } else {
      video.pause();
    }
  }

  video.addEventListener('play', () => {
    imgBottomPlay.src = '/assets/SVGForVideo/pause.svg';
    resetAutoHide();
  });

  video.addEventListener('pause', () => {
    imgBottomPlay.src = '/assets/SVGForVideo/play.svg';
    overlay.classList.remove('control-hidden');
    clearTimeout(autoHideTimer);
  });

  btnBottomPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause();
  });

  // Time & Duration updates
  video.addEventListener('loadedmetadata', () => {
    seekbar.max = video.duration || 100;
    timeTotal.textContent = formatTime(video.duration);
  });

  video.addEventListener('timeupdate', () => {
    if (!isNaN(video.duration)) {
      seekbar.max = video.duration;
      seekbar.value = video.currentTime;
      timeCurrent.textContent = formatTime(video.currentTime);
      timeTotal.textContent = formatTime(video.duration);

      const percent = (video.currentTime / video.duration) * 100 || 0;
      seekbar.style.background = `linear-gradient(to right, #2DD4A8 ${percent}%, rgba(255,255,255,0.2) ${percent}%)`;
    }
  });

  // Seekbar dragging
  seekbar.addEventListener('input', () => {
    video.currentTime = seekbar.value;
    const percent = (seekbar.value / seekbar.max) * 100 || 0;
    seekbar.style.background = `linear-gradient(to right, #2DD4A8 ${percent}%, rgba(255,255,255,0.2) ${percent}%)`;
  });

  function showSeekBadge(text) {
    if (!vlcSeekBadge || !vlcSeekBadgeText) return;
    vlcSeekBadgeText.textContent = text;
    vlcSeekBadge.classList.remove('opacity-0', 'scale-75');
    vlcSeekBadge.classList.add('opacity-100', 'scale-100');
    setTimeout(() => {
      vlcSeekBadge.classList.remove('opacity-100', 'scale-100');
      vlcSeekBadge.classList.add('opacity-0', 'scale-75');
    }, 700);
  }

  // Rewind / Forward 5s buttons
  btnRewind.addEventListener('click', (e) => {
    e.stopPropagation();
    video.currentTime = Math.max(0, video.currentTime - 5);
    showSeekBadge('-5 Detik ⏪');
    showControls();
  });

  btnForward.addEventListener('click', (e) => {
    e.stopPropagation();
    video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
    showSeekBadge('+5 Detik ⏩');
    showControls();
  });

  // Value update helpers for Brightness & Volume (syncs both sliders & VLC HUDs)
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

  // Desktop Brightness Button & Slider
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

  // Desktop Volume Button & Slider
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

  // Navigation Prev / Next Pose based on urutan
  if (btnPrev && prevStep) {
    btnPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `/relaksasi-detail.html?id=${prevStep.id}`;
    });
  }

  if (btnNext && nextStep) {
    btnNext.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `/relaksasi-detail.html?id=${nextStep.id}`;
    });
  }

  // Fullscreen API implementation on player container wrapper
  function isFullscreenActive() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  }

  function toggleFullscreen() {
    if (!isFullscreenActive()) {
      if (wrapper.requestFullscreen) {
        wrapper.requestFullscreen();
      } else if (wrapper.webkitRequestFullscreen) {
        wrapper.webkitRequestFullscreen();
      } else if (wrapper.mozRequestFullScreen) {
        wrapper.mozRequestFullScreen();
      } else if (wrapper.msRequestFullscreen) {
        wrapper.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
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
      btnFullscreen.title = 'Keluar Layar Penuh';
      if (svgFsFallback) {
        svgFsFallback.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M9 4v5H4m11-5v5h5M4 15h5v5m11-5h-5v5" />';
      }
    } else {
      if (imgFullscreen) {
        imgFullscreen.src = '/assets/SVGForVideo/fullscreen.svg';
        imgFullscreen.alt = 'Fullscreen';
      }
      btnFullscreen.title = 'Layar Penuh';
      if (svgFsFallback) {
        svgFsFallback.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />';
      }
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
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);

  // --- VLC MOBILE TOUCH GESTURES (Left = Brightness, Right = Volume) ---
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartVal = 0;
  let touchSide = null; // 'brightness' | 'volume'
  let isDragging = false;
  let hudHideTimer = null;
  let lastTapTime = 0;
  let lastTapSide = null;

  wrapper.addEventListener('touchstart', (e) => {
    // Ignore touches on interactive controls
    if (e.target.closest('button') || e.target.closest('input')) {
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = wrapper.getBoundingClientRect();
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      isDragging = false;

      // Determine side: Left = Brightness, Right = Volume
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
    const deltaY = touchStartY - touch.clientY; // upward = positive
    const deltaX = Math.abs(touch.clientX - touchStartX);

    if (Math.abs(deltaY) > 6 && Math.abs(deltaY) > deltaX) {
      isDragging = true;
      clearTimeout(hudHideTimer);

      const rect = wrapper.getBoundingClientRect();
      const factor = deltaY / (rect.height * 0.65); // drag 65% of screen height = 100% change

      if (touchSide === 'brightness') {
        const targetVal = touchStartVal + factor * 100;
        applyBrightness(targetVal);
        vlcBrightnessHud.classList.add('vlc-show');
        vlcVolumeHud.classList.remove('vlc-show');
      } else {
        const targetVal = touchStartVal + factor;
        applyVolume(targetVal);
        vlcVolumeHud.classList.add('vlc-show');
        vlcBrightnessHud.classList.remove('vlc-show');
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

    // Tap or Double Tap on video area
    if (!e.target.closest('button') && !e.target.closest('input')) {
      const now = Date.now();
      const rect = wrapper.getBoundingClientRect();
      const clickX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : touchStartX;
      const side = (clickX - rect.left) < (rect.width / 2) ? 'left' : 'right';

      if (now - lastTapTime < 280 && lastTapSide === side) {
        // Double Tap: Left = Rewind 5s, Right = Forward 5s
        if (side === 'left') {
          video.currentTime = Math.max(0, video.currentTime - 5);
          showSeekBadge('-5 Detik ⏪');
        } else {
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
          showSeekBadge('+5 Detik ⏩');
        }
        lastTapTime = 0;
      } else {
        // Single Tap: Toggle overlay controls visibility
        lastTapTime = now;
        lastTapSide = side;
        setTimeout(() => {
          if (lastTapTime === now) {
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

  // Click on background video surface to toggle play/pause on desktop
  video.addEventListener('click', () => {
    togglePlayPause();
  });
}

document.addEventListener('DOMContentLoaded', loadRelaksasiDetail);
