// Durasi pernapasan total 19 Detik, dibagi jadi sesi menarik napas, menahan, lalu membuang napas
const PHASE_DURATION = 19000 / 3; // 6.333 ms (6.333 detik)

const phases = [
  { label: 'Tarik Napas', duration: PHASE_DURATION, color: '#2DD4A8' },
  { label: 'Tahan', duration: PHASE_DURATION, color: '#38BDF8' },
  { label: 'Hembuskan', duration: PHASE_DURATION, color: '#FB923C' },
];

const MAX_CYCLES = 4;
const totalCycleDuration = phases.reduce((acc, p) => acc + p.duration, 0);

const UI = {
  progress: document.getElementById('breathe-progress'),
  dot: document.getElementById('breathe-dot'),
  phaseText: document.getElementById('breathe-phase-text'),
  countdown: document.getElementById('breathe-countdown'),
  cycleText: document.getElementById('breathe-cycle-text'),
  hint: document.getElementById('breathe-hint'),
  btn: document.getElementById('btn-breathe-toggle'),
  btnStop: document.getElementById('btn-breathe-stop')
};

const CIRCLE_CIRCUMFERENCE = 565.48;

let isRunning = false;
let startTime = null;
let currentCycle = 0;
let animationFrameId = null;

function getPhaseAtElapsed(elapsed) {
  let acc = 0;
  for (let phase of phases) {
    if (elapsed < acc + phase.duration) {
      return { phase, elapsedInPhase: elapsed - acc };
    }
    acc += phase.duration;
  }
  // Fallback untuk floating point kalau error di akhir siklus
  return { phase: phases[phases.length - 1], elapsedInPhase: phases[phases.length - 1].duration };
}

function updateVisuals(progressPercent, phase, timeLeft) {
  UI.phaseText.textContent = phase.label;
  UI.phaseText.style.color = phase.color;
  UI.progress.style.stroke = phase.color;
  UI.dot.style.backgroundColor = phase.color;
  UI.dot.style.boxShadow = `0 0 15px ${phase.color}`;
  
  UI.countdown.textContent = Math.ceil(timeLeft);
  UI.cycleText.textContent = `Siklus ${currentCycle + 1} dari ${MAX_CYCLES}`;

  // Update garis progress
  const offset = CIRCLE_CIRCUMFERENCE - (progressPercent * CIRCLE_CIRCUMFERENCE);
  UI.progress.style.strokeDashoffset = offset;

  // Konversi persentase jalan ke radian. Dikurangi pi/2 agar mulai dari titik atas (jam 12)
  const angle = (progressPercent * 2 * Math.PI) - (Math.PI / 2);
  
  // Radius lingkaran di SVG adalah 90 dari viewBox 200, yang berarti sekitar 45% dari lebar kontainer
  const xPercent = 50 + 45 * Math.cos(angle);
  const yPercent = 50 + 45 * Math.sin(angle);

  UI.dot.style.left = `${xPercent}%`;
  UI.dot.style.top = `${yPercent}%`;
}

function tick(timestamp) {
  if (!startTime) startTime = timestamp;
  
  const totalElapsed = timestamp - startTime;
  
  if (totalElapsed >= totalCycleDuration) {
    currentCycle++;
    startTime = timestamp;
    
    if (currentCycle >= MAX_CYCLES) {
      finishSession();
      return;
    }
  }

  const elapsedInCycle = timestamp - startTime;
  const progressPercent = elapsedInCycle / totalCycleDuration;
  
  const { phase, elapsedInPhase } = getPhaseAtElapsed(elapsedInCycle);
  const timeLeftInPhase = (phase.duration - elapsedInPhase) / 1000;
  
  updateVisuals(progressPercent, phase, timeLeftInPhase);

  if (isRunning) {
    animationFrameId = requestAnimationFrame(tick);
  }
}

function resetVisuals(isNaturalFinish) {
  UI.phaseText.textContent = isNaturalFinish ? "Selesai" : "Siap";
  UI.phaseText.style.color = "#2DD4A8";
  UI.countdown.textContent = "--";
  UI.cycleText.textContent = isNaturalFinish ? `Siklus ${MAX_CYCLES} dari ${MAX_CYCLES}` : `Siklus 0 dari ${MAX_CYCLES}`;
  if (UI.hint) {
    UI.hint.textContent = isNaturalFinish ? "Sesi selesai! Tekan tombol di bawah untuk mengulangi latihan." : "Tekan tombol di bawah untuk memulai sesi 4 siklus pernapasan.";
    UI.hint.classList.remove('hidden');
  }
  
  UI.progress.style.stroke = "#2DD4A8";
  UI.progress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
  
  UI.dot.style.backgroundColor = "#2DD4A8";
  UI.dot.style.boxShadow = `0 0 15px #2DD4A8`;
  UI.dot.style.left = "50%";
  UI.dot.style.top = "5%";
  
  UI.btn.textContent = isNaturalFinish ? "Ulangi Latihan" : "Mulai Latihan";
  UI.btn.disabled = false;
  UI.btn.classList.remove('opacity-50', 'cursor-not-allowed');
  
  UI.btnStop.classList.add('hidden');
}

function finishSession() {
  isRunning = false;
  cancelAnimationFrame(animationFrameId);
  resetVisuals(true);
}

function stopSession() {
  isRunning = false;
  cancelAnimationFrame(animationFrameId);
  resetVisuals(false);
}

function startSession() {
  isRunning = true;
  currentCycle = 0;
  startTime = null;

  if (UI.hint) {
    UI.hint.textContent = "Fokus pada ritme pernapasanmu...";
  }
  
  UI.btn.textContent = "Sedang Berjalan...";
  UI.btn.disabled = true;
  UI.btn.classList.add('opacity-50', 'cursor-not-allowed');
  
  UI.btnStop.classList.remove('hidden');
  
  animationFrameId = requestAnimationFrame(tick);
}

UI.btn.addEventListener('click', () => {
  if (!isRunning) startSession();
});

UI.btnStop.addEventListener('click', () => {
  if (isRunning) stopSession();
});
