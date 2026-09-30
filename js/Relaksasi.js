/**
 * Relaksasi.js — Katalog Panduan Pose Relaksasi & Pemutar Video Modal/Overlay
 *
 * Mengelola katalog pose relaksasi dari data/step-yoga.json, filter tingkat kesulitan,
 * serta pemutar video VLC-style interaktif dalam bentuk modal/overlay.
 */

const TINGKAT_CONFIG = {
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

const LOCAL_VIDEO_MAP = {
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

let rawRelaksasiSteps = [];
let currentFilter = 'all';
let currentStep = null;
let videoKeydownHandler = null;

/**
 * Memformat durasi waktu dari detik menjadi format standar menit:detik (MM:SS).
 * Contoh: 75 detik diubah menjadi "01:15" agar mudah dibaca pengguna pada indikator waktu.
 * 
 * @param {number} seconds - Jumlah durasi dalam detik
 * @returns {string} String waktu dengan format dua digit "MM:SS"
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Mengubah judul pose yoga menjadi teks slug URL yang bersih, aman, dan mudah dibaca (SEO-friendly).
 * Contoh: "Easy Pose Breathing (Sukhasana)" -> "easy-pose-breathing-sukhasana"
 * 
 * @param {Object} step - Objek data langkah/pose yoga
 * @returns {string} String slug ramah URL
 */
function getPoseSlug(step) {
  if (!step || !step.judul) return '';
  return step.judul
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Mencari data pose yoga tertentu dari koleksi rawRelaksasiSteps berdasarkan parameter pencarian.
 * Parameter dapat berupa ID angka (misal: "1") maupun slug teks judul (misal: "cat-cow").
 * 
 * @param {string|number} param - ID atau teks slug pose
 * @returns {Object|null} Objek data pose jika ditemukan, atau null jika tidak ada
 */
function findStepByParam(param) {
  if (!param || !rawRelaksasiSteps.length) return null;
  const decoded = decodeURIComponent(param).trim().toLowerCase();

  // 1. Coba pencarian berbasis ID angka terlebih dahulu
  const numId = parseInt(decoded.replace(/[^0-9]/g, ''), 10);
  if (!isNaN(numId)) {
    const foundById = rawRelaksasiSteps.find(s => s.id === numId);
    if (foundById) return foundById;
  }

  // 2. Jika bukan angka, lakukan pencarian fleksibel berbasis kemiripan slug teks
  const foundBySlug = rawRelaksasiSteps.find(s => {
    const slug = getPoseSlug(s);
    return slug === decoded || slug.includes(decoded) || decoded.includes(slug);
  });

  return foundBySlug || null;
}

/**
 * Membaca URL browser saat ini untuk mendeteksi apakah pengguna membuka link langsung (deep-link)
 * ke pose tertentu, baik melalui format hash (#pose=... atau #id=...) maupun query string (?id=...).
 * 
 * @returns {Object|null} Data pose yang diminta jika ditemukan di URL, atau null
 */
function getPoseFromURL() {
  const hash = window.location.hash.substring(1);
  if (hash) {
    if (hash.startsWith('pose=')) {
      return findStepByParam(hash.replace('pose=', ''));
    }
    if (hash.startsWith('id=')) {
      return findStepByParam(hash.replace('id=', ''));
    }
    return findStepByParam(hash);
  }

  const searchParams = new URLSearchParams(window.location.search);
  const searchId = searchParams.get('id');
  if (searchId) {
    return findStepByParam(searchId);
  }

  return null;
}

/**
 * Menghentikan pemutaran video aktif, mengembalikan durasi ke posisi awal (0),
 * serta mencabut listener keyboard global agar tidak membebani memori browser.
 */
function stopCurrentVideo() {
  const video = document.getElementById('detail-video');
  if (video) {
    try {
      video.pause();
      video.currentTime = 0;
    } catch (e) {
      console.warn('Peringatan penghentian video:', e);
    }
  }
  if (videoKeydownHandler) {
    document.removeEventListener('keydown', videoKeydownHandler);
    videoKeydownHandler = null;
  }
}

/**
 * Membuka jendela modal/overlay detail gerakan pose yoga secara mulus (smooth overlay):
 * 1. Menjeda pemutaran video sebelumnya jika ada yang sedang berjalan.
 * 2. Memperbarui riwayat URL browser (#pose=slug) tanpa memuat ulang (reload) halaman.
 * 3. Menyesuaikan judul tab browser agar mencantumkan nama gerakan yoga yang sedang dipelajari.
 * 4. Mengunci scroll halaman utama di latar belakang agar pengguna fokus pada panduan.
 * 
 * @param {Object|number} stepOrId - Objek pose yoga atau nomor ID pose
 * @param {boolean} [updateHistory=true] - Menentukan apakah URL browser perlu diupdate
 */
function openPoseOverlay(stepOrId, updateHistory = true) {
  let step = typeof stepOrId === 'object' ? stepOrId : rawRelaksasiSteps.find(s => s.id === parseInt(stepOrId, 10));
  if (!step) return;

  const overlay = document.getElementById('pose-modal-overlay');
  if (!overlay) return;

  stopCurrentVideo();

  currentStep = step;
  const slug = getPoseSlug(step);
  const targetHash = `#pose=${slug}`;

  if (updateHistory) {
    const cleanUrl = window.location.pathname + targetHash;
    if (window.location.hash !== targetHash) {
      history.pushState({ poseId: step.id }, '', cleanUrl);
    }
  }

  renderDetailPage(step);
  document.title = `${step.judul} — Teduh Relaksasi`;

  overlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    overlay.classList.add('opacity-100');
  });

  document.body.style.overflow = 'hidden';
  overlay.scrollTop = 0;
}

/**
 * Menutup jendela modal detail gerakan pose yoga:
 * 1. Menghentikan pemutaran video secara otomatis.
 * 2. Memicu animasi transisi fade-out lembut (300ms) sebelum menyembunyikan modal.
 * 3. Mengembalikan kemampuan scroll pada halaman utama (overflow auto).
 * 4. Mengembalikan judul tab browser ke 'Teduh — Relaksasi' dan membersihkan hash di URL.
 * 
 * @param {boolean} [updateHistory=true] - Menentukan apakah riwayat URL browser perlu direset
 */
function closePoseOverlay(updateHistory = true) {
  const overlay = document.getElementById('pose-modal-overlay');
  stopCurrentVideo();

  if (overlay) {
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 300);
  }

  document.body.style.overflow = '';
  document.title = 'Teduh — Relaksasi';

  if (updateHistory && (window.location.hash || window.location.search)) {
    history.pushState(null, '', window.location.pathname);
  }
}

/**
 * Merender seluruh komponen antarmuka halaman detail pose ke dalam modal `#relaksasi-detail-container`:
 * 1. Menampilkan player kustom (jika video tersedia) atau kartu placeholder elegan "Segera Hadir".
 * 2. Menyajikan informasi manfaat fisiologis & tips pelaksanaan pose yang aman.
 * 3. Menghadirkan navigasi langkah sebelumnya (Previous) dan langkah berikutnya (Next).
 * 4. Merender galeri rekomendasi gerakan relaksasi lainnya di bagian bawah.
 * 
 * @param {Object} step - Objek data gerakan pose yoga aktif
 */
function renderDetailPage(step) {
  const container = document.getElementById('relaksasi-detail-container');
  if (!container) return;

  const bcPose = document.getElementById('breadcrumb-current-pose');
  if (bcPose && (step.judul || step.nama)) {
    bcPose.textContent = step.judul || step.nama;
  }

  const tingkatKey = (step.tingkat || 'pemula').toLowerCase();
  const tingkatStyle = TINGKAT_CONFIG[tingkatKey] || TINGKAT_CONFIG.pemula;

  const currentIndex = rawRelaksasiSteps.findIndex(s => s.id === step.id);
  const prevStep = currentIndex > 0 ? rawRelaksasiSteps[currentIndex - 1] : null;
  const nextStep = currentIndex < rawRelaksasiSteps.length - 1 ? rawRelaksasiSteps[currentIndex + 1] : null;

  const otherSteps = rawRelaksasiSteps.filter(s => s.id !== step.id);

  const playerHTML = `
    <!-- 1. FULL CUSTOM VIDEO PLAYER -->
    <div id="detail-player-wrapper" class="video-player-container relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl mb-8">
      <video id="detail-video" src="${encodeURI(step.video_url)}" playsinline preload="metadata" class="w-full h-full object-cover"></video>

      <!-- VLC Gestures HUD Elements -->
      <div id="vlc-brightness-hud" class="vlc-indicator-hud left-4 sm:left-6">
        <img src="/assets/SVGForVideo/sun.svg" alt="Brightness" class="w-4 h-4" />
        <div class="vlc-indicator-track">
          <div id="vlc-brightness-bar" class="vlc-indicator-fill" style="height: 50%;"></div>
        </div>
        <span id="vlc-brightness-text" class="vlc-indicator-text">100%</span>
      </div>

      <div id="vlc-volume-hud" class="vlc-indicator-hud right-4 sm:right-6">
        <img id="vlc-volume-icon" src="/assets/SVGForVideo/volume-on.svg" alt="Volume" class="w-4 h-4" />
        <div class="vlc-indicator-track">
          <div id="vlc-volume-bar" class="vlc-indicator-fill" style="height: 100%;"></div>
        </div>
        <span id="vlc-volume-text" class="vlc-indicator-text">100%</span>
      </div>

      <div id="vlc-seek-badge" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none opacity-0 scale-95 transition-all duration-200 text-[#2DD4A8] font-black text-4xl sm:text-5xl tracking-widest select-none flex items-center justify-center" style="text-shadow: 0 2px 12px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9);">
        <span id="vlc-seek-badge-text"></span>
      </div>

      <!-- Player Controls Overlay -->
      <div id="detail-player-overlay" class="player-controls-overlay">
        
        <!-- Top Bar: Title & Desktop Sliders -->
        <div class="flex items-center justify-between gap-3 z-30">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs sm:text-sm font-bold text-white drop-shadow truncate max-w-[200px] sm:max-w-[360px]">
              ${step.judul}
            </span>
          </div>

          <div class="hidden sm:flex items-center gap-3 shrink-0 relative">
            <div class="relative flex flex-col items-center">
              <button id="btn-brightness" class="player-btn" title="Kecerahan">
                <img src="/assets/SVGForVideo/sun.svg" alt="Brightness" class="w-5 h-5" onerror="this.onerror=null; this.src='/assets/SVGForVideoPlayer/brightnessFull.png';" />
              </button>
              
              <div id="panel-brightness" class="vertical-slider-panel hidden-panel" style="top: 48px;">
                <img src="/assets/SVGForVideo/sun.svg" alt="Sun Max" class="w-3.5 h-3.5 opacity-90" />
                <div class="v-slider-wrapper">
                  <input type="range" id="slider-brightness" class="v-slider" min="30" max="180" value="100" />
                </div>
                <img src="/assets/SVGForVideo/sun.svg" alt="Sun Min" class="w-2.5 h-2.5 opacity-40" />
              </div>
            </div>

            <div class="relative flex flex-col items-center">
              <button id="btn-volume" class="player-btn" title="Volume">
                <img id="img-volume" src="/assets/SVGForVideo/volume-on.svg" alt="Volume" class="w-5 h-5" onerror="this.onerror=null; this.src='/assets/SVGForVideoPlayer/volume_Max.png';" />
              </button>
              
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

        <!-- Center Controls: Rewind 5s & Forward 5s -->
        <div class="flex items-center justify-between w-full px-5 sm:px-14 my-auto z-20 pointer-events-none">
          <button id="btn-rewind" class="player-center-btn pointer-events-auto" title="Mundur 5 detik">
            <img src="/assets/SVGForVideo/rewind-5s.svg" alt="Rewind 5s" class="w-6 h-6" />
          </button>

          <button id="btn-forward" class="player-center-btn pointer-events-auto" title="Maju 5 detik">
            <img src="/assets/SVGForVideo/forward-5s.svg" alt="Forward 5s" class="w-6 h-6" />
          </button>
        </div>

        <!-- Bottom Controls: Seekbar & Actions -->
        <div class="flex flex-col gap-2.5 z-30">
          <div class="flex items-center gap-2.5 text-xs text-white font-mono">
            <span id="time-current" class="w-10 text-right">00:00</span>
            <input type="range" id="seekbar" class="player-seekbar flex-grow" min="0" max="100" value="0" step="0.1" />
            <span id="time-total" class="w-10">00:00</span>
          </div>

          <div class="relative flex items-center justify-center min-h-[44px]">
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
  `;

  const contentHTML = `
    <!-- 2. POSE DETAILS CARD -->
    <div class="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/20 shadow-xl mb-16">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-white/10">
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight" style="font-family:'Plus Jakarta Sans', sans-serif;">
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
          ${!step.video_tersedia ? `
            <span class="px-3.5 py-1.5 rounded-full font-semibold bg-[#FB923C]/10 text-[#FB923C] border border-[#FB923C]/30">
              Coming Soon
            </span>
          ` : ''}
        </div>
      </div>

      <p class="text-sm sm:text-base text-[#8A93A8] leading-relaxed mb-6">
        ${step.deskripsi || ''}
      </p>

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
        <span class="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-[#2DD4A8] mb-2 block">EKSPLORASI POSE</span>
        <h2 class="text-2xl sm:text-3xl font-bold text-white mb-2" style="font-family:'Plus Jakarta Sans', sans-serif;">
          Gerakan Relaksasi Lainnya
        </h2>
        <p class="text-xs sm:text-sm leading-relaxed text-[#8A93A8]">
          Lanjutkan sesi relaksasimu dengan pose-pose pemulihan tubuh lainnya di bawah ini.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${otherSteps.map(renderOtherPoseCard).join('')}
      </div>
    </div>
  `;

  const comingSoonPlayerHTML = `
    <!-- COMING SOON VIDEO PLACEHOLDER -->
    <div id="detail-player-wrapper" class="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/60 backdrop-blur-md shadow-2xl mb-8 flex flex-col items-center justify-center p-6 text-center">
      <div class="w-16 h-16 rounded-full bg-[#2DD4A8]/10 border border-[#2DD4A8]/30 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-[#2DD4A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <span class="px-3.5 py-1 rounded-full text-xs font-semibold bg-[#FB923C]/20 text-[#FB923C] border border-[#FB923C]/40 mb-3 uppercase tracking-wider">
        Video Segera Hadir
      </span>
      <h3 class="text-xl font-bold text-white mb-2" style="font-family:'Plus Jakarta Sans', sans-serif;">${step.judul}</h3>
      <p class="text-xs sm:text-sm text-[#8A93A8] max-w-md">
        Panduan video untuk gerakan ini sedang disiapkan. Kamu tetap dapat mempraktikkan pose ini dengan membaca langkah dan manfaat di bawah.
      </p>
    </div>
  `;

  container.innerHTML = (step.video_tersedia ? playerHTML : comingSoonPlayerHTML) + contentHTML;

  if (step.video_tersedia) {
    initVideoPlayerControls(step, prevStep, nextStep);
  }
}

/**
 * Merender kartu preview untuk pose relaksasi lainnya yang ditampilkan di bagian bawah modal:
 * - Jika video tersedia, kartu dapat diklik untuk langsung beralih ke pose tersebut.
 * - Jika video belum tersedia, kartu diberi label "Segera Hadir" dengan efek visual redup yang informatif.
 * 
 * @param {Object} other - Objek data pose relaksasi lain
 * @returns {string} String HTML kartu pose
 */
function renderOtherPoseCard(other) {
  const tingkatKey = (other.tingkat || 'pemula').toLowerCase();
  const tingkatStyle = TINGKAT_CONFIG[tingkatKey] || TINGKAT_CONFIG.pemula;
  const slug = getPoseSlug(other);
  let otherVideoSrc = other.video_url || LOCAL_VIDEO_MAP[other.id];
  if (otherVideoSrc && !otherVideoSrc.startsWith('/') && !otherVideoSrc.startsWith('http')) {
    otherVideoSrc = '/' + otherVideoSrc;
  }
  const videoTersedia = typeof other.video_tersedia === 'boolean' ? other.video_tersedia : Boolean(otherVideoSrc);
  let thumbnailSrc = other.video_thumbnail || '/assets/Images/video-thumbnails/easy-pose.webp';
  if (thumbnailSrc && !thumbnailSrc.startsWith('/') && !thumbnailSrc.startsWith('http')) {
    thumbnailSrc = '/' + thumbnailSrc;
  }

  if (videoTersedia) {
    return `
      <a href="#pose=${slug}" onclick="openPoseOverlay(${other.id}); return false;" class="group bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:border-[#2DD4A8] transition-all duration-300 shadow-xl flex flex-col justify-between h-full gap-4 cursor-pointer text-left block" aria-label="Buka panduan ${other.judul}">
        <div class="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-md">
          <img src="${thumbnailSrc}" alt="${other.judul}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onerror="this.onerror=null; this.src='/assets/Images/video-thumbnails/easy-pose.webp';" />
          <div class="absolute inset-0 flex items-center justify-center bg-black/35 group-hover:bg-black/15 transition-all duration-300">
            <div class="w-12 h-12 rounded-full bg-[#0D1220]/75 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] group-hover:scale-110 group-hover:border-[#2DD4A8] group-hover:shadow-[0_0_25px_rgba(45,212,168,0.5)] transition-all duration-300">
              <img src="/assets/SVGForVideo/play.svg" alt="Play" class="w-6 h-6 translate-x-0.5" />
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <h3 class="text-base sm:text-lg font-bold text-white leading-snug group-hover:text-[#2DD4A8] transition-colors" style="font-family:'Plus Jakarta Sans', sans-serif;">
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
        <p class="text-xs text-[#8A93A8] leading-relaxed line-clamp-2">
          ${other.deskripsi || ''}
        </p>
        <div class="pt-2 border-t border-white/10 flex items-center justify-between text-xs mt-auto">
          <span class="text-[#2DD4A8] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Buka Panduan Gerakan &rarr;
          </span>
        </div>
      </a>
    `;
  } else {
    return `
      <div class="group bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-xl flex flex-col justify-between h-full gap-4 opacity-80 cursor-default select-none" aria-label="${other.judul} (Segera Hadir)">
        <div class="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-md">
          <img src="${thumbnailSrc}" alt="${other.judul}" class="w-full h-full object-cover opacity-60" loading="lazy" onerror="this.onerror=null; this.src='/assets/Images/video-thumbnails/easy-pose.webp';" />
          <div class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <span class="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#FB923C]/20 text-[#FB923C] border border-[#FB923C]/40 backdrop-blur-md shadow-lg uppercase tracking-wider">
              Segera Hadir
            </span>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <h3 class="text-base sm:text-lg font-bold text-white leading-snug" style="font-family:'Plus Jakarta Sans', sans-serif;">
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
            <span class="px-2.5 py-1 rounded-full font-semibold bg-[#FB923C]/10 text-[#FB923C] border border-[#FB923C]/30">
              Segera Hadir
            </span>
          </div>
        </div>
        <p class="text-xs text-[#8A93A8] leading-relaxed line-clamp-2">
          ${other.deskripsi || ''}
        </p>
        <div class="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-[#8A93A8] mt-auto">
          <span>Video gerakan sedang disiapkan</span>
        </div>
      </div>
    `;
  }
}

/**
 * Menginisialisasi seluruh sistem kendali interaktif pemutar video kustom (VLC-style Interactive Player):
 * 1. Play / Pause dengan tombol atau klik langsung pada layar video.
 * 2. Seekbar dengan gradasi dinamis teal sesuai progres waktu berjalan.
 * 3. Tombol lewati maju 5 detik & mundur 5 detik lengkap dengan badge animasi tengah layar.
 * 4. Pintasan keyboard aksesibel (Spasi untuk pause, Panah Kiri/Kanan untuk seek 5 detik, Escape untuk keluar).
 * 5. Slider vertikal untuk pengaturan Kecerahan (Brightness) dan Volume suara.
 * 6. Gestur sentuh ponsel gaya VLC (usap sisi kiri layar untuk kecerahan, usap sisi kanan untuk volume).
 * 7. Mode layar penuh (Fullscreen) responsif yang mempertahankan rasio 16:9 di perangkat mobile.
 * 
 * @param {Object} step - Objek pose aktif
 * @param {Object|null} prevStep - Objek pose sebelumnya (jika ada)
 * @param {Object|null} nextStep - Objek pose selanjutnya (jika ada)
 */
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
    wrapper.classList.remove('hide-cursor');
    resetAutoHide();
  }

  function resetAutoHide() {
    clearTimeout(autoHideTimer);
    if (!video.paused) {
      autoHideTimer = setTimeout(() => {
        const isBrightnessPanelOpen = panelBrightness && !panelBrightness.classList.contains('hidden-panel');
        const isVolumePanelOpen = panelVolume && !panelVolume.classList.contains('hidden-panel');
        if (!isBrightnessPanelOpen && !isVolumePanelOpen && !video.paused) {
          overlay.classList.add('control-hidden');
          wrapper.classList.add('hide-cursor');
        }
      }, 5000);
    }
  }

  wrapper.addEventListener('mousemove', showControls);
  wrapper.addEventListener('mouseenter', showControls);
  wrapper.addEventListener('mouseleave', () => {
    const isBrightnessPanelOpen = panelBrightness && !panelBrightness.classList.contains('hidden-panel');
    const isVolumePanelOpen = panelVolume && !panelVolume.classList.contains('hidden-panel');
    if (!video.paused && !isBrightnessPanelOpen && !isVolumePanelOpen) {
      overlay.classList.add('control-hidden');
      wrapper.classList.add('hide-cursor');
    }
  });

  function togglePlayPause() {
    if (video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Playback error:', err);
        });
      }
    } else {
      video.pause();
    }
  }

  video.addEventListener('error', () => {
    console.warn('Video failed to load:', video.currentSrc, video.error);
  });

  video.addEventListener('play', () => {
    imgBottomPlay.src = '/assets/SVGForVideo/pause.svg';
    showControls();
  });

  video.addEventListener('pause', () => {
    imgBottomPlay.src = '/assets/SVGForVideo/play.svg';
    overlay.classList.remove('control-hidden');
    wrapper.classList.remove('hide-cursor');
    clearTimeout(autoHideTimer);
  });

  video.addEventListener('ended', () => {
    imgBottomPlay.src = '/assets/SVGForVideo/play.svg';
    overlay.classList.remove('control-hidden');
    wrapper.classList.remove('hide-cursor');
    clearTimeout(autoHideTimer);
  });

  btnBottomPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause();
    showControls();
  });

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

  seekbar.addEventListener('input', () => {
    video.currentTime = seekbar.value;
    const percent = (seekbar.value / seekbar.max) * 100 || 0;
    seekbar.style.background = `linear-gradient(to right, #2DD4A8 ${percent}%, rgba(255,255,255,0.2) ${percent}%)`;
    showControls();
  });
  seekbar.addEventListener('change', () => {
    showControls();
  });

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

  btnRewind.addEventListener('click', (e) => {
    e.stopPropagation();
    video.currentTime = Math.max(0, video.currentTime - 5);
    showSeekBadge('-5');
    showControls();
  });

  btnForward.addEventListener('click', (e) => {
    e.stopPropagation();
    video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
    showSeekBadge('+5');
    showControls();
  });

  function handleVideoKeydown(e) {
    if (!video) return;

    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag === 'input' && document.activeElement.type === 'text') return;
    if (activeTag === 'textarea') return;

    if (e.key === 'Escape') {
      e.preventDefault();
      if (isFullscreenActive()) {
        toggleFullscreen();
      } else {
        closePoseOverlay();
      }
      return;
    }

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
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      if (document.activeElement && (document.activeElement.tagName === 'BUTTON' || document.activeElement.tagName === 'INPUT')) {
        return;
      }
      e.preventDefault();
      togglePlayPause();
      showControls();
    }
  }

  videoKeydownHandler = handleVideoKeydown;
  document.addEventListener('keydown', videoKeydownHandler);

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

  if (btnPrev && prevStep) {
    btnPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      openPoseOverlay(prevStep.id);
    });
  }

  if (btnNext && nextStep) {
    btnNext.addEventListener('click', (e) => {
      e.stopPropagation();
      openPoseOverlay(nextStep.id);
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

  // VLC Mobile Touch Gestures
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

  overlay.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.vertical-slider-panel')) {
      return;
    }
    togglePlayPause();
    showControls();
  });

  video.addEventListener('click', () => {
    togglePlayPause();
    showControls();
  });
}

/**
 * Merender satu kartu pose relaksasi pada grid katalog utama halaman Relaksasi:
 * - Menampilkan thumbnail video dengan ikon play interaktif (jika video tersedia).
 * - Menampilkan badge tingkat kesulitan (Pemula, Menengah, Lanjutan) dengan warna khas.
 * - Menyajikan ringkasan manfaat dan tips gerakan secara ringkas.
 * - Mengarahkan klik untuk membuka modal panduan gerakan secara instan tanpa reload halaman.
 * 
 * @param {Object} step - Objek data pose relaksasi
 * @returns {string} String template HTML kartu pose
 */
function renderRelaksasiCard(step) {
  const tingkatKey = (step.tingkat || 'pemula').toLowerCase();
  const styleTingkat = TINGKAT_CONFIG[tingkatKey] || TINGKAT_CONFIG.pemula;
  const slug = getPoseSlug(step);

  let videoSrc = step.video_url || LOCAL_VIDEO_MAP[step.id] || null;
  if (videoSrc && !videoSrc.startsWith('/') && !videoSrc.startsWith('http')) {
    videoSrc = '/' + videoSrc;
  }
  const isVideoAvailable = typeof step.video_tersedia === 'boolean' ? step.video_tersedia : Boolean(videoSrc);

  let thumbSrc = step.video_thumbnail || '/assets/Images/video-thumbnails/easy-pose.webp';
  if (thumbSrc && !thumbSrc.startsWith('/') && !thumbSrc.startsWith('http')) {
    thumbSrc = '/' + thumbSrc;
  }

  const thumbnailHtml = `
    <div class="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-md shrink-0">
      <img src="${thumbSrc}"
           alt="${step.judul}"
           class="w-full h-full object-cover transition-transform duration-500 ${isVideoAvailable ? 'group-hover:scale-105' : 'opacity-60'}"
           loading="lazy"
           onerror="this.onerror=null; this.src='/assets/Images/video-thumbnails/easy-pose.webp';" />
      ${isVideoAvailable ? `
        <div class="absolute inset-0 flex items-center justify-center bg-black/35 group-hover:bg-black/15 transition-all duration-300">
          <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#0D1220]/75 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] group-hover:scale-110 group-hover:border-[#2DD4A8] group-hover:shadow-[0_0_25px_rgba(45,212,168,0.5)] transition-all duration-300">
            <img src="/assets/SVGForVideo/play.svg" alt="Putar Video" class="w-6 h-6 sm:w-7 sm:h-7 translate-x-0.5" />
          </div>
        </div>
      ` : `
        <div class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
          <span class="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#FB923C]/20 text-[#FB923C] border border-[#FB923C]/40 backdrop-blur-md shadow-lg uppercase tracking-wider">
            Segera Hadir
          </span>
        </div>
      `}
    </div>
  `;

  const headerHtml = `
    <div class="flex flex-col gap-2">
      <h3 class="text-lg sm:text-xl font-bold text-white leading-snug ${isVideoAvailable ? 'group-hover:text-[#2DD4A8]' : ''} transition-colors" style="font-family:'Plus Jakarta Sans', sans-serif;">
        ${step.judul}
      </h3>

      <div class="flex items-center gap-2 flex-wrap text-xs">
        ${step.durasi ? `
          <span class="px-3 py-1 rounded-full font-semibold bg-[#FB923C]/10 text-[#FB923C] border border-[#FB923C]/30">
            ${step.durasi}
          </span>
        ` : ''}
        <span class="px-3 py-1 rounded-full font-semibold ${styleTingkat.bg} ${styleTingkat.text} border ${styleTingkat.border}">
          ${step.tingkat ? step.tingkat.charAt(0).toUpperCase() + step.tingkat.slice(1) : styleTingkat.label}
        </span>
        ${!isVideoAvailable ? `
          <span class="px-3 py-1 rounded-full font-semibold bg-[#FB923C]/10 text-[#FB923C] border border-[#FB923C]/30">
            Segera Hadir
          </span>
        ` : ''}
      </div>
    </div>
  `;

  const descHtml = `
    <p class="text-xs sm:text-sm text-[#8A93A8] leading-relaxed line-clamp-2">
      ${step.deskripsi || ''}
    </p>
  `;

  const chipsHtml = `
    <div class="flex flex-col gap-2 text-xs text-[#D1D5DB] mt-auto">
      ${step.manfaat ? `
        <div class="p-2.5 sm:p-3 rounded-xl border border-white/5 bg-[#0D1220]/60 flex items-start gap-2.5">
          <span class="leading-normal"><strong class="text-white font-semibold">Manfaat:</strong> ${step.manfaat}</span>
        </div>
      ` : ''}
      ${step.tips ? `
        <div class="p-2.5 sm:p-3 rounded-xl border border-white/5 bg-[#0D1220]/60 flex items-start gap-2.5">
          <span class="leading-normal"><strong class="text-white font-semibold">Tip:</strong> ${step.tips}</span>
        </div>
      ` : ''}
    </div>
  `;

  if (isVideoAvailable) {
    return `
      <a href="#pose=${slug}"
         onclick="openPoseOverlay(${step.id}); return false;"
         id="card-relaksasi-${step.id}"
         class="group bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/20 hover:border-[#2DD4A8] transition-all duration-300 shadow-xl flex flex-col justify-between h-full gap-4 cursor-pointer text-left block"
         aria-label="Buka panduan ${step.judul}">
        ${thumbnailHtml}
        ${headerHtml}
        ${descHtml}
        ${chipsHtml}
        <div class="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <span class="text-[#2DD4A8] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Buka Panduan Gerakan &rarr;
          </span>
        </div>
      </a>
    `;
  } else {
    return `
      <div id="card-relaksasi-${step.id}"
           class="group bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/20 shadow-xl flex flex-col justify-between h-full gap-4 opacity-80 cursor-default select-none"
           aria-label="${step.judul} (Segera Hadir)">
        ${thumbnailHtml}
        ${headerHtml}
        ${descHtml}
        ${chipsHtml}
        <div class="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#8A93A8]">
          <span>Video gerakan sedang disiapkan</span>
        </div>
      </div>
    `;
  }
}

/**
 * Menyaring koleksi pose yoga berdasarkan kategori filter aktif (currentFilter: 'all', 'pemula', 'menengah', 'lanjutan')
 * dan merender ulang kartu-kartu ke kontainer grid `#relaksasi-grid-container`.
 * Memanggil penyegaran AOS (Animate on Scroll) jika pustaka animasi tersedia.
 */
function renderCardsByFilter() {
  const container = document.getElementById('relaksasi-grid-container');
  if (!container) return;

  const filteredSteps = currentFilter === 'all'
    ? rawRelaksasiSteps
    : rawRelaksasiSteps.filter(s => (s.tingkat || '').toLowerCase() === currentFilter);

  if (filteredSteps.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-[#8A93A8]">
        <p class="text-sm">Tidak ada pose untuk kategori ini.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredSteps.map(renderRelaksasiCard).join('');

  if (window.AOS && typeof window.AOS.refresh === 'function') {
    window.AOS.refresh();
  }
}

/**
 * Memasang event listener klik pada tombol filter kategori tingkat kesulitan di `#relaksasi-filter-container`.
 * Memperbarui visual active button (latar teal dan teks gelap untuk tombol terpilih) serta memicu render ulang grid.
 */
function initFilterControls() {
  const filterContainer = document.getElementById('relaksasi-filter-container');
  if (!filterContainer) return;

  const buttons = filterContainer.querySelectorAll('.relaksasi-filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter') || 'all';
      currentFilter = filter;

      buttons.forEach(b => {
        if (b === btn) {
          b.className = 'relaksasi-filter-btn px-4 py-1.5 rounded-full text-xs font-semibold bg-[#2DD4A8] text-[#0D1220] transition-all cursor-pointer';
        } else {
          b.className = 'relaksasi-filter-btn px-4 py-1.5 rounded-full text-xs font-semibold text-[#8A93A8] hover:text-white transition-all cursor-pointer';
        }
      });

      renderCardsByFilter();
    });
  });
}

/**
 * Inisialisasi utama modul katalog Relaksasi:
 * 1. Mengambil data pose relaksasi dari file JSON (`data/step-yoga.json`).
 * 2. Memetakan URL video lokal dan thumbnail secara aman.
 * 3. Mengurutkan pose secara berurutan sesuai kurasi panduan.
 * 4. Merender katalog kartu dan menyiapkan tombol filter.
 * 5. Memeriksa apakah URL memuat parameter deep-link (#pose=...) untuk langsung membuka panduan video.
 */
async function initRelaksasiSteps() {
  const container = document.getElementById('relaksasi-grid-container');

  try {
    let res;
    try {
      res = await fetch('/data/step-yoga.json');
      if (!res.ok) throw new Error('Fetch root gagal');
    } catch (_) {
      res = await fetch('./data/step-yoga.json');
    }

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const steps = await res.json();
    if (!Array.isArray(steps) || steps.length === 0) {
      if (container) {
        container.innerHTML = `<p class="text-center text-[#8A93A8] col-span-full py-8">Tidak ada data pose relaksasi.</p>`;
      }
      return;
    }

    rawRelaksasiSteps = steps.map(s => {
      let vUrl = s.video_url || LOCAL_VIDEO_MAP[s.id] || null;
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

    rawRelaksasiSteps.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

    if (container) {
      renderCardsByFilter();
    }
    initFilterControls();

    const targetPose = getPoseFromURL();
    if (targetPose) {
      openPoseOverlay(targetPose, true);
    }

  } catch (err) {
    console.error('Gagal memuat alur relaksasi:', err);
    if (container) {
      container.innerHTML = `
        <div class="col-span-full p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center text-red-300 text-sm">
          Gagal memuat panduan gerakan relaksasi. Silakan muat ulang halaman.
        </div>
      `;
    }
  }
}

window.addEventListener('popstate', () => {
  const targetPose = getPoseFromURL();
  if (targetPose) {
    openPoseOverlay(targetPose, false);
  } else {
    closePoseOverlay(false);
  }
});

window.openPoseOverlay = openPoseOverlay;
window.closePoseOverlay = closePoseOverlay;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRelaksasiSteps);
} else {
  initRelaksasiSteps();
}
