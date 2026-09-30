/**
 * breathing.js — Mesin Panduan Latihan Pernapasan Ritmis Interaktif (Interactive Breathwork)
 * 
 * Modul ini mengendalikan siklus latihan pernapasan dengan kendali langsung pada lingkaran (circle trigger):
 * 1. Pilihan 4 teknik pernapasan (4-7-8, Box Breathing, 4-4-6, 5-2-5) dengan rasio & fokus edukasi.
 * 2. Baris tab tombol pada layar lebar dan dropdown seleksi responsif pada layar ponsel.
 * 3. Kendali 3-state pada lingkaran:
 *    - Idle: Ketuk lingkaran untuk mulai (label tengah "Mulai" polos berwarna teal tanpa background tombol).
 *    - Berjalan: Ketuk lingkaran untuk berhenti & reset; Tahan (>350ms) untuk jeda (pause).
 *    - Dijeda: Ketuk lingkaran untuk melanjutkan dari titik durasi terakhir; Tahan (>350ms) untuk berhenti.
 * 4. Kartu emoji fase pernapasan di bawah lingkaran yang dapat diklik untuk melompat langsung ke fase tujuan.
 * 5. Visual SVG circular track dan glowing dot presisi tinggi dengan animasi requestAnimationFrame.
 */

// ==========================================
// 1. KONFIGURASI IKON / EMOJI FASE PERNAPASAN
// ==========================================
// Format modular memudahkan penggantian ikon SVG atau Phosphor icon sesuai kebutuhan desain
const PHASE_ICONS = {
  inhale: { iconClass: 'ph ph-wind text-[#2DD4A8]' },
  hold:   { iconClass: 'ph ph-pause-circle text-[#38BDF8]' },
  exhale: { iconClass: 'ph ph-waves text-[#FB923C]' },
  hold2:  { iconClass: 'ph ph-pause-circle text-[#818CF8]' }
};

// ==========================================
// 2. DEFINISI 4 TEKNIK PERNAPASAN
// ==========================================
const TECHNIQUES = [
  {
    id: '4-7-8',
    name: '4-7-8',
    ratio: '4/7/8',
    focusText: 'Memperlambat detak jantung dan menenangkan sistem saraf. Cocok untuk meredakan insomnia.',
    phases: [
      { key: 'inhale', label: 'Tarik Napas', duration: 4, color: '#2DD4A8' },
      { key: 'hold', label: 'Tahan Napas', duration: 7, color: '#38BDF8' },
      { key: 'exhale', label: 'Buang Napas', duration: 8, color: '#FB923C' }
    ]
  },
  {
    id: 'box',
    name: 'Box Breathing',
    ratio: '4/4/4/4',
    focusText: 'Mengembalikan konsentrasi dan meredakan respons panik mendadak.',
    phases: [
      { key: 'inhale', label: 'Tarik Napas', duration: 4, color: '#2DD4A8' },
      { key: 'hold', label: 'Tahan Napas', duration: 4, color: '#38BDF8' },
      { key: 'exhale', label: 'Buang Napas', duration: 4, color: '#FB923C' },
      { key: 'hold2', label: 'Tahan Napas', duration: 4, color: '#818CF8' }
    ]
  },
  {
    id: '4-4-6',
    name: '4-4-6',
    ratio: '4/4/6',
    focusText: 'Alternatif lebih ringan dari 4-7-8, cocok jika menahan napas 7 detik terasa berat.',
    phases: [
      { key: 'inhale', label: 'Tarik Napas', duration: 4, color: '#2DD4A8' },
      { key: 'hold', label: 'Tahan Napas', duration: 4, color: '#38BDF8' },
      { key: 'exhale', label: 'Buang Napas', duration: 6, color: '#FB923C' }
    ]
  },
  {
    id: '5-2-5',
    name: '5-2-5',
    ratio: '5/2/5',
    focusText: 'Menyamakan durasi tarik dan buang napas untuk ritme yang stabil, baik untuk meditasi harian.',
    phases: [
      { key: 'inhale', label: 'Tarik Napas', duration: 5, color: '#2DD4A8' },
      { key: 'hold', label: 'Tahan Napas', duration: 2, color: '#38BDF8' },
      { key: 'exhale', label: 'Buang Napas', duration: 5, color: '#FB923C' }
    ]
  }
];

// Menghitung total durasi dalam detik dan milidetik per teknik
TECHNIQUES.forEach(tech => {
  tech.totalDurationSec = tech.phases.reduce((sum, p) => sum + p.duration, 0);
  tech.totalDurationMs = tech.totalDurationSec * 1000;
});

// ==========================================
// 3. ELEMEN UI & VARIABEL STATE
// ==========================================
const CIRCLE_CIRCUMFERENCE = 565.48;
const HOLD_THRESHOLD = 350; // Ambang batas milidetik untuk membedakan ketukan singkat (tap) dan tahanan (hold)

let currentTechIndex = 0;       // Indeks teknik aktif saat ini (default: 4-7-8)
let currentPhaseIndex = 0;      // Indeks fase aktif di dalam teknik saat ini
let isRunning = false;          // Penanda apakah latihan pernapasan sedang aktif
let isPaused = false;           // Penanda apakah latihan sedang dalam kondisi jeda
let phaseStartTime = 0;         // Timestamp mulai fase aktif (performance.now)
let pausedTimeLeft = 0;         // Sisa durasi milidetik saat dijeda
let animationFrameId = null;

// Variabel penahan gestur pointer
let holdTimer = null;
let isHoldGesture = false;
let hintTimeout = null;

const UI = {
  progress: document.getElementById('breathe-progress'),
  dot: document.getElementById('breathe-dot'),
  phaseText: document.getElementById('breathe-phase-text'),
  countdown: document.getElementById('breathe-countdown'),
  hint: document.getElementById('breathe-hint'),
  circleTrigger: document.getElementById('breathe-circle-trigger'),
  switcherContainer: document.getElementById('technique-switcher'),
  focusText: document.getElementById('breathe-focus-text'),
  phasesContainer: document.getElementById('breathe-phases-container')
};

// ==========================================
// 4. RENDER FUNGSI IKON & TAMPILAN
// ==========================================
// Menghasilkan markup ikon Phosphor untuk kartu fase
function renderPhaseIcon(phaseKey) {
  const iconConfig = PHASE_ICONS[phaseKey] || { iconClass: 'ph ph-sparkle text-[#2DD4A8]' };
  return `<i class="${iconConfig.iconClass} text-2xl sm:text-3xl select-none leading-none"></i>`;
}

// Merender switcher teknik: tombol pada layar tablet/desktop, dan dropdown pada ponsel sempit
function renderTechniqueSwitcher() {
  if (!UI.switcherContainer) return;

  const buttonsHtml = `
    <div class="hidden sm:flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
      ${TECHNIQUES.map((tech, idx) => {
        const isActive = idx === currentTechIndex;
        return `
          <button type="button"
            data-tech-index="${idx}"
            class="technique-tab-btn px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer backdrop-blur-md shadow-md ${
              isActive
                ? 'bg-[#2DD4A8]/25 border border-[#2DD4A8] text-[#2DD4A8] shadow-[0_0_15px_rgba(45,212,168,0.35)] scale-[1.02]'
                : 'bg-[#0D1220]/75 border border-white/15 text-[#E2E8F0] hover:text-white hover:bg-white/10 hover:border-white/30'
            }"
            style="text-shadow: 0 1px 3px rgba(0,0,0,0.85);"
            aria-selected="${isActive}"
            role="tab"
          >
            ${tech.name} <span class="opacity-75 font-normal">(${tech.ratio})</span>
          </button>
        `;
      }).join('')}
    </div>
  `;

  const dropdownHtml = `
    <div class="sm:hidden w-full max-w-xs mx-auto px-2">
      <select id="mobile-technique-select"
              class="w-full bg-[#0D1220]/90 border border-white/20 text-[#2DD4A8] text-xs font-semibold py-2.5 px-3 rounded-xl backdrop-blur-md focus:outline-none focus:border-[#2DD4A8] transition-colors"
              aria-label="Pilih Teknik Pernapasan">
        ${TECHNIQUES.map((tech, idx) => `
          <option value="${idx}" class="bg-[#0D1220] text-white" ${idx === currentTechIndex ? 'selected' : ''}>
            ${tech.name} (${tech.ratio})
          </option>
        `).join('')}
      </select>
    </div>
  `;

  UI.switcherContainer.innerHTML = buttonsHtml + dropdownHtml;

  // Pasang event listener untuk klik tab tombol desktop
  UI.switcherContainer.querySelectorAll('.technique-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-tech-index'), 10);
      switchTechnique(idx);
    });
  });

  // Pasang event listener untuk dropdown mobile
  const mobileSelect = document.getElementById('mobile-technique-select');
  if (mobileSelect) {
    mobileSelect.addEventListener('change', (e) => {
      const idx = parseInt(e.target.value, 10);
      switchTechnique(idx);
    });
  }
}

// Menampilkan deskripsi teknik dalam bentuk glass pill elegan
function updateFocusText() {
  if (!UI.focusText) return;
  const tech = TECHNIQUES[currentTechIndex];
  UI.focusText.innerHTML = `
    <div class="inline-block px-4 py-1.5 rounded-2xl sm:rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs sm:text-[13px] text-slate-200 shadow-md max-w-xl text-center leading-relaxed" style="text-shadow: 0 1px 4px rgba(0,0,0,0.9);">
      <strong class="text-white font-semibold mr-1">${tech.name}:</strong>
      <span>${tech.focusText}</span>
    </div>
  `;
}

// Merender baris kartu fase interaktif (Tarik Napas, Tahan Napas, Buang Napas)
function renderPhaseEmojis() {
  if (!UI.phasesContainer) return;
  const tech = TECHNIQUES[currentTechIndex];

  UI.phasesContainer.innerHTML = tech.phases.map((phase, idx) => {
    const isActive = isRunning && currentPhaseIndex === idx;
    return `
      <button type="button"
        id="phase-btn-${idx}"
        data-phase-index="${idx}"
        class="phase-item-btn group relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border transition-all duration-300 cursor-pointer min-w-[80px] sm:min-w-[100px] backdrop-blur-md shadow-lg"
        title="Klik untuk langsung melompat ke fase ${phase.label}"
        aria-label="Fase ${phase.label} ${phase.duration} detik"
        style="${
          isActive
            ? `border-color:${phase.color}; background-color:${phase.color}30; box-shadow:0 0 20px ${phase.color}50; transform:scale(1.06); opacity:1;`
            : 'border-color:rgba(255,255,255,0.15); background-color:rgba(13,18,32,0.75); transform:scale(0.96); opacity:0.8;'
        }"
      >
        <div class="phase-icon-wrapper transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.7));">
          ${renderPhaseIcon(phase.key)}
        </div>
        <span class="phase-label text-[11px] sm:text-xs font-semibold mt-1.5 transition-colors ${isActive ? 'text-white' : 'text-[#E2E8F0] group-hover:text-white'}" style="text-shadow: 0 1px 4px rgba(0,0,0,0.95);">
          ${phase.label}
        </span>
        <span class="phase-duration text-[10px] sm:text-[11px] font-mono mt-0.5" style="color:${isActive ? phase.color : 'rgba(203,213,225,0.9)'}; text-shadow: 0 1px 4px rgba(0,0,0,0.95);">
          ${phase.duration}s
        </span>
      </button>
    `;
  }).join('');

  // Menambahkan interaktivitas klik untuk melompat fase
  UI.phasesContainer.querySelectorAll('.phase-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-phase-index'), 10);
      jumpToPhase(idx);
    });
  });
}

// Memberikan highlight visual pada kartu fase yang sedang aktif
function highlightActivePhase(activeIdx) {
  const tech = TECHNIQUES[currentTechIndex];
  const buttons = document.querySelectorAll('.phase-item-btn');
  buttons.forEach((btn, idx) => {
    const isCur = idx === activeIdx && isRunning;
    const phase = tech.phases[idx];
    if (!phase) return;

    if (isCur) {
      btn.style.borderColor = phase.color;
      btn.style.backgroundColor = `${phase.color}30`;
      btn.style.boxShadow = `0 0 20px ${phase.color}50`;
      btn.style.transform = 'scale(1.06)';
      btn.style.opacity = '1';

      const labelEl = btn.querySelector('.phase-label');
      if (labelEl) {
        labelEl.style.color = '#FFFFFF';
        labelEl.style.textShadow = '0 1px 4px rgba(0,0,0,0.95)';
      }

      const durEl = btn.querySelector('.phase-duration');
      if (durEl) {
        durEl.style.color = phase.color;
        durEl.style.textShadow = '0 1px 4px rgba(0,0,0,0.95)';
      }
    } else {
      btn.style.borderColor = 'rgba(255,255,255,0.15)';
      btn.style.backgroundColor = 'rgba(13,18,32,0.75)';
      btn.style.boxShadow = 'none';
      btn.style.transform = 'scale(0.96)';
      btn.style.opacity = isRunning ? '0.6' : '0.85';

      const labelEl = btn.querySelector('.phase-label');
      if (labelEl) {
        labelEl.style.color = '#E2E8F0';
        labelEl.style.textShadow = '0 1px 4px rgba(0,0,0,0.95)';
      }

      const durEl = btn.querySelector('.phase-duration');
      if (durEl) {
        durEl.style.color = 'rgba(203,213,225,0.9)';
        durEl.style.textShadow = '0 1px 4px rgba(0,0,0,0.95)';
      }
    }
  });
}

// ==========================================
// 5. ANIMASI & SINKRONISASI VISUAL
// ==========================================
// Memperbarui posisi lingkaran timer, glowing dot, dan teks hitungan mundur
function updateVisuals(progressPercent, phase, timeLeft, activeIdx) {
  // Update teks instruksi di tengah lingkaran
  if (UI.phaseText) {
    UI.phaseText.textContent = phase.label;
    UI.phaseText.style.color = phase.color;
    UI.phaseText.style.textShadow = '0 2px 8px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)';
  }
  if (UI.countdown) {
    UI.countdown.classList.remove('hidden');
    UI.countdown.textContent = Math.ceil(timeLeft);
    UI.countdown.style.textShadow = '0 2px 8px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)';
  }
  if (UI.hint && (!hintTimeout || UI.hint.classList.contains('opacity-0'))) {
    UI.hint.classList.add('opacity-0');
  }

  // Update garis stroke lingkaran SVG
  if (UI.progress) {
    UI.progress.style.stroke = phase.color;
    const offset = CIRCLE_CIRCUMFERENCE - (progressPercent * CIRCLE_CIRCUMFERENCE);
    UI.progress.style.strokeDashoffset = offset;
  }

  // Update posisi dot bersinar (glowing dot)
  if (UI.dot) {
    UI.dot.style.backgroundColor = phase.color;
    UI.dot.style.boxShadow = `0 0 15px ${phase.color}`;

    // Posisi sudut trigonometri (mulai dari jam 12 / -90 derajat)
    const angle = (progressPercent * 2 * Math.PI) - (Math.PI / 2);
    const xPercent = 50 + 45 * Math.cos(angle);
    const yPercent = 50 + 45 * Math.sin(angle);

    UI.dot.style.left = `${xPercent}%`;
    UI.dot.style.top = `${yPercent}%`;
  }

  // Sorot kartu emoji aktif
  highlightActivePhase(activeIdx);
}

// Mengembalikan tampilan lingkaran ke status awal (idle)
function resetVisuals() {
  if (UI.phaseText) {
    UI.phaseText.textContent = "Mulai";
    UI.phaseText.style.color = "#2DD4A8";
    UI.phaseText.style.textShadow = '0 2px 8px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)';
  }
  if (UI.countdown) {
    UI.countdown.textContent = "--";
    UI.countdown.classList.add('hidden');
    UI.countdown.style.textShadow = '0 2px 8px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)';
  }
  if (UI.hint) {
    UI.hint.textContent = "Ketuk untuk mulai";
    UI.hint.classList.remove('opacity-0', 'hidden');
    UI.hint.classList.add('opacity-100');
  }

  if (UI.progress) {
    UI.progress.style.stroke = "#2DD4A8";
    UI.progress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
  }

  if (UI.dot) {
    UI.dot.style.backgroundColor = "#2DD4A8";
    UI.dot.style.boxShadow = "0 0 15px #2DD4A8";
    UI.dot.style.left = "50%";
    UI.dot.style.top = "5%";
  }

  highlightActivePhase(-1);
}

// ==========================================
// 6. ENGINE TICK (LOOP ANIMASI)
// ==========================================
function tick(timestamp) {
  if (!isRunning || isPaused) return;

  const tech = TECHNIQUES[currentTechIndex];
  const curPhase = tech.phases[currentPhaseIndex];
  const curPhaseMs = curPhase.duration * 1000;

  let elapsedInPhase = timestamp - phaseStartTime;

  // Jika durasi fase aktif telah tercapai, berganti ke fase berikutnya
  if (elapsedInPhase >= curPhaseMs) {
    currentPhaseIndex = (currentPhaseIndex + 1) % tech.phases.length;
    phaseStartTime = timestamp;
    elapsedInPhase = 0;
  }

  const activePhase = tech.phases[currentPhaseIndex];
  const activePhaseMs = activePhase.duration * 1000;
  const timeLeft = Math.max(0, (activePhaseMs - elapsedInPhase) / 1000);
  const phaseProgress = Math.min(1, Math.max(0, elapsedInPhase / activePhaseMs));

  updateVisuals(phaseProgress, activePhase, timeLeft, currentPhaseIndex);

  if (isRunning && !isPaused) {
    animationFrameId = requestAnimationFrame(tick);
  }
}

// ==========================================
// 7. KONTROL INTERAKSI
// ==========================================
// Memulai siklus latihan dari fase tertentu (default 0: Inhale)
function startSession(startPhase = 0) {
  isRunning = true;
  isPaused = false;
  currentPhaseIndex = startPhase;
  phaseStartTime = performance.now();

  if (UI.countdown) {
    UI.countdown.classList.remove('hidden');
  }
  if (UI.hint) {
    UI.hint.classList.add('opacity-0');
  }

  cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(tick);
}

// Menjeda latihan pernapasan (tekan dan tahan saat berjalan)
function pauseSession() {
  if (!isRunning || isPaused) return;
  isPaused = true;
  cancelAnimationFrame(animationFrameId);

  const tech = TECHNIQUES[currentTechIndex];
  const curPhase = tech.phases[currentPhaseIndex];
  const elapsedInPhase = performance.now() - phaseStartTime;
  pausedTimeLeft = Math.max(0, (curPhase.duration * 1000 - elapsedInPhase));

  if (UI.phaseText) {
    UI.phaseText.textContent = "Jeda";
    UI.phaseText.style.color = "#FB923C";
    UI.phaseText.style.textShadow = '0 2px 8px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)';
  }
  if (UI.countdown) {
    UI.countdown.classList.add('hidden');
  }
  if (UI.hint) {
    UI.hint.textContent = "Ketuk untuk lanjut · Tahan untuk berhenti";
    UI.hint.classList.remove('opacity-0', 'hidden');
    UI.hint.classList.add('opacity-100');
  }
}

// Melanjutkan latihan dari sisa detik saat dijeda
function resumeSession() {
  if (!isRunning || !isPaused) return;
  isPaused = false;

  const tech = TECHNIQUES[currentTechIndex];
  const curPhase = tech.phases[currentPhaseIndex];
  phaseStartTime = performance.now() - (curPhase.duration * 1000 - pausedTimeLeft);

  if (UI.phaseText) {
    UI.phaseText.textContent = curPhase.label;
    UI.phaseText.style.color = curPhase.color;
    UI.phaseText.style.textShadow = '0 2px 8px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)';
  }
  if (UI.countdown) {
    UI.countdown.classList.remove('hidden');
  }
  if (UI.hint) {
    UI.hint.classList.add('opacity-0');
  }

  cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(tick);
}

// Menghentikan latihan & mereset penuh ke status idle
function stopSession() {
  isRunning = false;
  isPaused = false;
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  cancelAnimationFrame(animationFrameId);
  currentPhaseIndex = 0;
  resetVisuals();
}

// Melompat langsung ke fase tertentu saat kartu fase diklik
function jumpToPhase(targetIndex) {
  const tech = TECHNIQUES[currentTechIndex];
  if (targetIndex < 0 || targetIndex >= tech.phases.length) return;

  currentPhaseIndex = targetIndex;
  phaseStartTime = performance.now();
  isPaused = false;

  if (!isRunning) {
    startSession(targetIndex);
  } else {
    const activePhase = tech.phases[currentPhaseIndex];
    updateVisuals(0, activePhase, activePhase.duration, currentPhaseIndex);
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(tick);
  }
}

// Mengganti teknik pernapasan aktif (otomatis reset bersih ke tarikan napas awal)
function switchTechnique(newTechIndex) {
  if (newTechIndex < 0 || newTechIndex >= TECHNIQUES.length) return;

  currentTechIndex = newTechIndex;
  currentPhaseIndex = 0;

  renderTechniqueSwitcher();
  updateFocusText();
  renderPhaseEmojis();

  if (isRunning) {
    phaseStartTime = performance.now();
    isPaused = false;

    const tech = TECHNIQUES[currentTechIndex];
    const firstPhase = tech.phases[0];
    updateVisuals(0, firstPhase, firstPhase.duration, 0);

    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(tick);
  } else {
    resetVisuals();
  }
}

// ==========================================
// 8. LOGIKA TRIGGER LINGKARAN & INTERAKSI TAP / HOLD
// ==========================================
function handlePointerDown(e) {
  if (e.button !== undefined && e.button !== 0) return;
  isHoldGesture = false;

  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }

  // Jika sedang berjalan atau dijeda, jalankan timer untuk mendeteksi tahanan (>350ms)
  if (isRunning) {
    holdTimer = setTimeout(() => {
      isHoldGesture = true;
      if (!isPaused) {
        // Sedang berjalan + ditahan -> Jeda (pause)
        pauseSession();
      } else {
        // Sedang dijeda + ditahan -> Berhenti (stop & reset ke idle)
        stopSession();
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(40); } catch (_) {}
      }
    }, HOLD_THRESHOLD);
  }
}

function handlePointerUp(e) {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }

  // Jika aksi tahan (hold) sudah aktif, abaikan ketukan release
  if (isHoldGesture) {
    isHoldGesture = false;
    return;
  }

  // 1. Ketuk saat status idle -> Mulai latihan
  if (!isRunning) {
    startSession(0);
  }
  // 2. Ketuk saat status dijeda -> Lanjutkan dari titik terakhir (resume)
  else if (isPaused) {
    resumeSession();
  }
  // 3. Ketuk saat status berjalan -> Berhenti & reset ke status idle
  else {
    stopSession();
  }
}

function handlePointerCancel() {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  isHoldGesture = false;
}

// Mengatur listener interaksi pada elemen pemicu lingkaran
function setupCircleTrigger() {
  const trigger = UI.circleTrigger || document.getElementById('breathe-circle-trigger');
  if (!trigger) return;

  let lastPointerActionTime = 0;

  trigger.addEventListener('pointerdown', (e) => {
    lastPointerActionTime = Date.now();
    handlePointerDown(e);
  });
  trigger.addEventListener('pointerup', (e) => {
    lastPointerActionTime = Date.now();
    handlePointerUp(e);
  });
  trigger.addEventListener('pointercancel', handlePointerCancel);
  trigger.addEventListener('pointerleave', handlePointerCancel);
  trigger.addEventListener('contextmenu', (e) => e.preventDefault());

  // Dukungan click sintetis (misalnya bila dipanggil melalui automated test trigger.click())
  trigger.addEventListener('click', (e) => {
    if (Date.now() - lastPointerActionTime < 150) return;
    if (!isRunning) {
      startSession(0);
    } else if (isPaused) {
      resumeSession();
    } else {
      stopSession();
    }
  });

  // Aksesibilitas Keyboard (Tombol Spasi atau Enter)
  let keyHoldTimer = null;
  let isKeyHold = false;

  trigger.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      if (e.repeat) return;
      e.preventDefault();
      isKeyHold = false;

      if (isRunning) {
        keyHoldTimer = setTimeout(() => {
          isKeyHold = true;
          if (!isPaused) {
            pauseSession();
          } else {
            stopSession();
          }
        }, HOLD_THRESHOLD);
      }
    }
  });

  trigger.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (keyHoldTimer) {
        clearTimeout(keyHoldTimer);
        keyHoldTimer = null;
      }

      if (isKeyHold) {
        isKeyHold = false;
        return;
      }

      if (!isRunning) {
        startSession(0);
      } else if (isPaused) {
        resumeSession();
      } else {
        stopSession();
      }
    }
  });
}

// ==========================================
// 9. INISIALISASI UTAMA
// ==========================================
function initBreathingApp() {
  UI.progress = document.getElementById('breathe-progress');
  UI.dot = document.getElementById('breathe-dot');
  UI.phaseText = document.getElementById('breathe-phase-text');
  UI.countdown = document.getElementById('breathe-countdown');
  UI.hint = document.getElementById('breathe-hint');
  UI.circleTrigger = document.getElementById('breathe-circle-trigger');
  UI.switcherContainer = document.getElementById('technique-switcher');
  UI.focusText = document.getElementById('breathe-focus-text');
  UI.phasesContainer = document.getElementById('breathe-phases-container');

  renderTechniqueSwitcher();
  updateFocusText();
  renderPhaseEmojis();
  setupCircleTrigger();
  resetVisuals();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBreathingApp);
} else {
  initBreathingApp();
}
