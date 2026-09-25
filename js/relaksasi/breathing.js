/**
 * breathing.js — Pernapasan Ritmis (Interactive Breathwork Guide)
 * 
 * Fitur Utama:
 * 1. 4 Teknik Pernapasan yang dapat dipilih (4-7-8, Box Breathing, 4-4-6, 5-2-5).
 * 2. Switcher teknik interaktif dengan highlight teal (#2DD4A8) & focus text edukatif.
 * 3. Baris emoji fase yang dapat diklik untuk melompat langsung ke fase terkait dengan durasi penuh.
 * 4. Animasi SVG circular timer dan dot glowing yang sinkron dengan fase & durasi aktif.
 * 5. Struktur ikon placeholder modular sehingga mudah ditukar dengan aset ikon kustom di kemudian hari.
 */

// ==========================================
// 1. KONFIGURASI IKON / EMOJI FASE PERNAPASAN
// ==========================================
/**
 * Konfigurasi Ikon/Emoji Fase Pernapasan
 * Anda dapat dengan mudah mengganti placeholder emoji di bawah ini dengan ikon/gambar kustom
 * dengan mengisi properti `customIcon` (contoh: '/assets/icons/inhale.svg').
 */
const PHASE_ICONS = {
  inhale: { emoji: '🫁', customIcon: null },
  hold:   { emoji: '✋', customIcon: null },
  exhale: { emoji: '💨', customIcon: null },
  hold2:  { emoji: '✋', customIcon: null }
};

// ==========================================
// 2. DEFINISI 4 TEKNIK PERNAPASAN
// ==========================================
const TECHNIQUES = [
  {
    id: '4-7-8',
    name: '4-7-8 (Relaksasi Dalam)',
    focusText: 'Memperlambat detak jantung dan menenangkan sistem saraf. Cocok untuk meredakan insomnia.',
    phases: [
      { key: 'inhale', label: 'Tarik Napas', duration: 4, color: '#2DD4A8' },
      { key: 'hold', label: 'Tahan Napas', duration: 7, color: '#38BDF8' },
      { key: 'exhale', label: 'Buang Napas', duration: 8, color: '#FB923C' }
    ]
  },
  {
    id: 'box',
    name: 'Box Breathing (Fokus & Panik)',
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
    name: '4-4-6 (Pemula)',
    focusText: 'Alternatif lebih ringan dari 4-7-8, cocok jika menahan napas 7 detik terasa berat.',
    phases: [
      { key: 'inhale', label: 'Tarik Napas', duration: 4, color: '#2DD4A8' },
      { key: 'hold', label: 'Tahan Napas', duration: 4, color: '#38BDF8' },
      { key: 'exhale', label: 'Buang Napas', duration: 6, color: '#FB923C' }
    ]
  },
  {
    id: '5-2-5',
    name: '5-2-5 (Penyeimbang)',
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

let currentTechIndex = 0;       // Teknik aktif saat ini (default: 4-7-8)
let currentPhaseIndex = 0;      // Indeks fase aktif di dalam teknik saat ini
let isRunning = false;          // Status latihan berjalan
let isPaused = false;           // Status jeda (pause)
let phaseStartTime = 0;         // Waktu mulai fase aktif (performance.now)
let pausedTimeLeft = 0;         // Sisa durasi saat dijeda
let animationFrameId = null;

const UI = {
  progress: document.getElementById('breathe-progress'),
  dot: document.getElementById('breathe-dot'),
  phaseText: document.getElementById('breathe-phase-text'),
  countdown: document.getElementById('breathe-countdown'),
  btnToggle: document.getElementById('btn-breathe-toggle'),
  btnStop: document.getElementById('btn-breathe-stop'),
  switcherContainer: document.getElementById('technique-switcher'),
  focusText: document.getElementById('breathe-focus-text'),
  phasesContainer: document.getElementById('breathe-phases-container')
};

// ==========================================
// 4. HELPER PERHITUNGAN OFFSET WAKTU FASE
// ==========================================
function getPhaseOffsetMs(tech, phaseIdx) {
  let offset = 0;
  for (let i = 0; i < phaseIdx; i++) {
    offset += tech.phases[i].duration * 1000;
  }
  return offset;
}

// ==========================================
// 5. RENDER FUNGSI IKON & UI
// ==========================================
function renderPhaseIcon(phaseKey) {
  const iconConfig = PHASE_ICONS[phaseKey] || { emoji: '🧘', customIcon: null };
  if (iconConfig.customIcon) {
    return `<img src="${iconConfig.customIcon}" alt="${phaseKey}" class="w-7 h-7 sm:w-8 sm:h-8 object-contain" />`;
  }
  return `<span class="phase-emoji text-2xl sm:text-3xl select-none leading-none">${iconConfig.emoji}</span>`;
}

function renderTechniqueSwitcher() {
  if (!UI.switcherContainer) return;

  UI.switcherContainer.innerHTML = TECHNIQUES.map((tech, idx) => {
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
        ${tech.name}
      </button>
    `;
  }).join('');

  UI.switcherContainer.querySelectorAll('.technique-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-tech-index'), 10);
      switchTechnique(idx);
    });
  });
}

function updateFocusText() {
  if (!UI.focusText) return;
  const tech = TECHNIQUES[currentTechIndex];
  UI.focusText.innerHTML = `<span class="inline-block px-4 py-2 rounded-xl bg-[#0D1220]/80 backdrop-blur-md border border-white/15 text-[#E2E8F0] text-xs sm:text-[13px] leading-relaxed shadow-xl" style="text-shadow: 0 1px 4px rgba(0,0,0,0.9);"><strong class="text-white font-semibold mr-1.5">${tech.name}:</strong>${tech.focusText}</span>`;
}

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

  UI.phasesContainer.querySelectorAll('.phase-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-phase-index'), 10);
      jumpToPhase(idx);
    });
  });
}

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
// 6. ANIMASI & VISUAL CIRCLE
// ==========================================
function updateVisuals(progressPercent, phase, timeLeft, activeIdx) {
  // Update teks di tengah lingkaran dengan text-shadow kuat untuk kontras
  if (UI.phaseText) {
    UI.phaseText.textContent = phase.label;
    UI.phaseText.style.color = phase.color;
    UI.phaseText.style.textShadow = '0 2px 8px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)';
  }
  if (UI.countdown) {
    UI.countdown.textContent = Math.ceil(timeLeft);
    UI.countdown.style.textShadow = '0 2px 8px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)';
  }

  // Update garis stroke & dot lingkaran
  if (UI.progress) {
    UI.progress.style.stroke = phase.color;
    const offset = CIRCLE_CIRCUMFERENCE - (progressPercent * CIRCLE_CIRCUMFERENCE);
    UI.progress.style.strokeDashoffset = offset;
  }

  if (UI.dot) {
    UI.dot.style.backgroundColor = phase.color;
    UI.dot.style.boxShadow = `0 0 15px ${phase.color}`;

    // Konversi progres ke posisi radian (mulai jam 12 / -PI/2)
    const angle = (progressPercent * 2 * Math.PI) - (Math.PI / 2);
    const xPercent = 50 + 45 * Math.cos(angle);
    const yPercent = 50 + 45 * Math.sin(angle);

    UI.dot.style.left = `${xPercent}%`;
    UI.dot.style.top = `${yPercent}%`;
  }

  // Sorot kartu emoji yang aktif
  highlightActivePhase(activeIdx);
}

function resetVisuals() {
  if (UI.phaseText) {
    UI.phaseText.textContent = "Siap";
    UI.phaseText.style.color = "#2DD4A8";
    UI.phaseText.style.textShadow = '0 2px 8px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)';
  }
  if (UI.countdown) {
    UI.countdown.textContent = "--";
    UI.countdown.style.textShadow = '0 2px 8px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)';
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

  if (UI.btnToggle) {
    UI.btnToggle.textContent = "Mulai Latihan";
    UI.btnToggle.disabled = false;
    UI.btnToggle.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  if (UI.btnStop) {
    UI.btnStop.classList.add('hidden');
  }

  highlightActivePhase(-1);
}

// ==========================================
// 7. ENGINE PERNAPASAN (LOOP / TICK)
// ==========================================
function tick(timestamp) {
  if (!isRunning) return;

  const tech = TECHNIQUES[currentTechIndex];
  const curPhase = tech.phases[currentPhaseIndex];
  const curPhaseMs = curPhase.duration * 1000;

  let elapsedInPhase = timestamp - phaseStartTime;

  // Jika durasi fase aktif telah selesai, maju ke fase berikutnya
  if (elapsedInPhase >= curPhaseMs) {
    currentPhaseIndex = (currentPhaseIndex + 1) % tech.phases.length;
    phaseStartTime = timestamp;
    elapsedInPhase = 0;
  }

  const activePhase = tech.phases[currentPhaseIndex];
  const activePhaseMs = activePhase.duration * 1000;
  const timeLeft = Math.max(0, (activePhaseMs - elapsedInPhase) / 1000);

  // Hitung progres siklus keseluruhan untuk pergerakan dot dan lingkaran
  const phaseOffset = getPhaseOffsetMs(tech, currentPhaseIndex);
  const totalCycleElapsed = phaseOffset + elapsedInPhase;
  const progressPercent = Math.min(1, Math.max(0, totalCycleElapsed / tech.totalDurationMs));

  updateVisuals(progressPercent, activePhase, timeLeft, currentPhaseIndex);

  if (isRunning) {
    animationFrameId = requestAnimationFrame(tick);
  }
}

// ==========================================
// 8. KONTROL INTERAKSI (START, JUMP, SWITCH, STOP)
// ==========================================
function startSession(startPhase = 0) {
  isRunning = true;
  isPaused = false;
  currentPhaseIndex = startPhase;
  phaseStartTime = performance.now();

  if (UI.btnToggle) {
    UI.btnToggle.textContent = "Jeda";
  }
  if (UI.btnStop) {
    UI.btnStop.classList.remove('hidden');
  }

  cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(tick);
}

function pauseSession() {
  if (!isRunning || isPaused) return;
  isPaused = true;
  cancelAnimationFrame(animationFrameId);

  const tech = TECHNIQUES[currentTechIndex];
  const curPhase = tech.phases[currentPhaseIndex];
  const elapsedInPhase = performance.now() - phaseStartTime;
  pausedTimeLeft = Math.max(0, (curPhase.duration * 1000 - elapsedInPhase));

  if (UI.btnToggle) {
    UI.btnToggle.textContent = "Lanjutkan";
  }
}

function resumeSession() {
  if (!isRunning || !isPaused) return;
  isPaused = false;

  const tech = TECHNIQUES[currentTechIndex];
  const curPhase = tech.phases[currentPhaseIndex];
  phaseStartTime = performance.now() - (curPhase.duration * 1000 - pausedTimeLeft);

  if (UI.btnToggle) {
    UI.btnToggle.textContent = "Jeda";
  }

  cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(tick);
}

function stopSession() {
  isRunning = false;
  isPaused = false;
  cancelAnimationFrame(animationFrameId);
  currentPhaseIndex = 0;
  resetVisuals();
}

/**
 * Lompat manual ke fase tertentu (dipanggil saat emoji fase diklik)
 */
function jumpToPhase(targetIndex) {
  const tech = TECHNIQUES[currentTechIndex];
  if (targetIndex < 0 || targetIndex >= tech.phases.length) return;

  currentPhaseIndex = targetIndex;
  phaseStartTime = performance.now();
  isPaused = false;

  if (!isRunning) {
    startSession(targetIndex);
  } else {
    // Segera perbarui tampilan dengan durasi penuh fase tujuan
    const activePhase = tech.phases[currentPhaseIndex];
    const phaseOffset = getPhaseOffsetMs(tech, currentPhaseIndex);
    const progressPercent = phaseOffset / tech.totalDurationMs;
    updateVisuals(progressPercent, activePhase, activePhase.duration, currentPhaseIndex);

    if (UI.btnToggle) {
      UI.btnToggle.textContent = "Jeda";
    }
  }
}

/**
 * Beralih teknik pernapasan (sebelum atau selama sesi berjalan)
 */
function switchTechnique(newTechIndex) {
  if (newTechIndex < 0 || newTechIndex >= TECHNIQUES.length) return;

  currentTechIndex = newTechIndex;
  currentPhaseIndex = 0;

  renderTechniqueSwitcher();
  updateFocusText();
  renderPhaseEmojis();

  if (isRunning) {
    // Reset timer ke durasi fase teknik baru, mulai segar dari fase Inhale
    phaseStartTime = performance.now();
    isPaused = false;

    const tech = TECHNIQUES[currentTechIndex];
    const firstPhase = tech.phases[0];
    updateVisuals(0, firstPhase, firstPhase.duration, 0);

    if (UI.btnToggle) {
      UI.btnToggle.textContent = "Jeda";
    }
  } else {
    resetVisuals();
  }
}

// ==========================================
// 9. INISIALISASI EVENT LISTENERS
// ==========================================
function initBreathingApp() {
  UI.progress = document.getElementById('breathe-progress');
  UI.dot = document.getElementById('breathe-dot');
  UI.phaseText = document.getElementById('breathe-phase-text');
  UI.countdown = document.getElementById('breathe-countdown');
  UI.btnToggle = document.getElementById('btn-breathe-toggle');
  UI.btnStop = document.getElementById('btn-breathe-stop');
  UI.switcherContainer = document.getElementById('technique-switcher');
  UI.focusText = document.getElementById('breathe-focus-text');
  UI.phasesContainer = document.getElementById('breathe-phases-container');

  renderTechniqueSwitcher();
  updateFocusText();
  renderPhaseEmojis();
  resetVisuals();

  if (UI.btnToggle) {
    UI.btnToggle.addEventListener('click', () => {
      if (!isRunning) {
        startSession(0);
      } else if (isPaused) {
        resumeSession();
      } else {
        pauseSession();
      }
    });
  }

  if (UI.btnStop) {
    UI.btnStop.addEventListener('click', stopSession);
  }
}

// Jalankan ketika DOM sudah siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBreathingApp);
} else {
  initBreathingApp();
}
