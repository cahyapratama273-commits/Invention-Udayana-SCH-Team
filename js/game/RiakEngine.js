/**
 * RiakEngine.js — Orkestrator & Mesin Sensorik Interaktif 2D Canvas
 * 
 * Modul ini menyediakan 3 mesin sensorik mandiri:
 * 1. AirEngine (Mode Air):
 *    - Simulasi gelombang air 2D Height-Field beresolusi tinggi.
 *    - Pembatasan nilai (displacement clamp MAX_VAL = 35) agar riak tenang dan stabil.
 *    - Peredaman fisika (damping = 0.992): riak bertahan ~2-3 detik dan melebar alami ~25-35% lebar kanvas.
 *    - Double-buffer Float32Array dibersihkan total saat inisialisasi dan perpindahan mode,
 *      sehingga tidak ada lingkaran statis aneh pada kanvas.
 *    - Menjalankan loop animasi dan pointer handler tersendiri.
 * 2. AngkasaEngine (Mode Angkasa):
 *    - Simulasi partikel bintang berpegas (Hukum Hooke / Spring Physics).
 *    - Gaya tolak kursor (repulsion) yang membubarkan bintang saat kursor lewat dan kembali ke posisi asal.
 *    - Sebaran bintang membentang di kanvas luas 400% sehingga tidak ada tepi hitam yang terlihat saat di-zoom out ke 25%.
 *    - Menjalankan loop animasi dan pointer handler tersendiri.
 * 3. MenulisEngine (Mode Menulis):
 *    - Dikelola oleh modul terpisah (MenulisEngine.js) dengan loop dan pointer handler mandiri.
 * 4. Master Orchestrator (RiakEngine):
 *    - Mengatur pergantian mode dengan prinsip: stop & cabut handler mesin sebelumnya,
 *      bersihkan kanvas, ganti set audio, lalu start mesin baru. Dua loop tidak akan pernah berjalan bersamaan.
 *    - Transformasi koordinat presisi yang menghitung skala zoom kanvas (scale 25% hingga 100%).
 */
(function (window) {
  'use strict';

  // Helper konversi HEX ke RGB
  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return { r: 56, g: 189, b: 248 };
    let c = hex.replace('#', '').trim();
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const num = parseInt(c, 16);
    if (isNaN(num)) return { r: 56, g: 189, b: 248 };
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  // ==========================================================================
  // 1. ENGINE MODE AIR: Simulasi Gelombang Air 2D Height-Field
  // ==========================================================================
  class AirEngineMode {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.primaryColor = '#38BDF8';
      this.primaryRgb = { r: 56, g: 189, b: 248 };

      this.simCols = 280;
      this.simRows = 160;
      this.buffer1 = null;
      this.buffer2 = null;
      this.currentBuffer = null;
      this.previousBuffer = null;
      this.damping = 0.992; // Riak menyebar santai selama ~2-3 detik hingga 25-35% lebar kanvas

      this.offscreenCanvas = null;
      this.offscreenCtx = null;
      this.offscreenImgData = null;
      this.droplets = [];

      this.isPointerDown = false;
      this.lastX = 0;
      this.lastY = 0;
      this.lastAudioTime = 0;
      this.rafId = null;
      this.isRunning = false;

      this.getPos = null;
      this.onFirstInteraction = null;

      this._boundDown = null;
      this._boundMove = null;
      this._boundUp = null;
    }

    setColor(colorHex) {
      this.primaryColor = colorHex;
      this.primaryRgb = hexToRgb(colorHex);
    }

    clearWaterSimulation() {
      if (this.buffer1) this.buffer1.fill(0);
      if (this.buffer2) this.buffer2.fill(0);
      this.droplets = [];
      if (this.offscreenImgData) {
        this.offscreenImgData.data.fill(0);
        if (this.offscreenCtx) {
          this.offscreenCtx.putImageData(this.offscreenImgData, 0, 0);
        }
      }
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
    }

    initSimulationGrid() {
      const baseCols = 320;
      if (this.width > 0 && this.height > 0) {
        if (this.width >= this.height) {
          this.simCols = baseCols;
          this.simRows = Math.max(80, Math.round(baseCols * (this.height / this.width)));
        } else {
          this.simCols = 280;
          this.simRows = Math.max(120, Math.round(280 * (this.height / this.width)));
        }
      } else {
        this.simCols = 320;
        this.simRows = 180;
      }

      const size = this.simCols * this.simRows;
      this.buffer1 = new Float32Array(size);
      this.buffer2 = new Float32Array(size);
      this.currentBuffer = this.buffer1;
      this.previousBuffer = this.buffer2;

      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = this.simCols;
      this.offscreenCanvas.height = this.simRows;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
      this.offscreenImgData = this.offscreenCtx.createImageData(this.simCols, this.simRows);

      this.clearWaterSimulation();
    }

    injectWaterDisplacement(canvasX, canvasY, strength, radius = 3.6) {
      if (!this.currentBuffer || this.width <= 0 || this.height <= 0) return;
      const gx = Math.round((canvasX / this.width) * this.simCols);
      const gy = Math.round((canvasY / this.height) * this.simRows);
      const cols = this.simCols;
      const rows = this.simRows;

      const r = Math.ceil(radius);
      const rSq = radius * radius;
      const MAX_VAL = 35; // Pembatasan perpindahan agar riak tetap jernih dan tenang

      for (let dy = -r; dy <= r; dy++) {
        const y = gy + dy;
        if (y <= 0 || y >= rows - 1) continue;
        const rowOffset = y * cols;
        for (let dx = -r; dx <= r; dx++) {
          const x = gx + dx;
          if (x <= 0 || x >= cols - 1) continue;
          const distSq = dx * dx + dy * dy;
          if (distSq <= rSq) {
            const dist = Math.sqrt(distSq);
            const falloff = Math.cos((dist / radius) * (Math.PI / 2));
            const idx = rowOffset + x;
            const newVal = this.currentBuffer[idx] + strength * falloff;
            this.currentBuffer[idx] = Math.max(-MAX_VAL, Math.min(MAX_VAL, newVal));
          }
        }
      }
    }

    start(canvas, ctx, width, height, dpr, primaryColor, onFirstInteraction, getPos) {
      this.stop(); // Hentikan instance sebelumnya jika ada

      this.canvas = canvas;
      this.ctx = ctx;
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.getPos = getPos;
      this.onFirstInteraction = onFirstInteraction;
      if (primaryColor) this.setColor(primaryColor);

      this.isRunning = true;
      this.initSimulationGrid();
      this.attachPointerHandlers();

      // Jalankan loop render tersendiri untuk mode Air
      const loop = () => {
        if (!this.isRunning) return;
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.updateSimulation();
        this.renderWater();
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    }

    stop() {
      this.isRunning = false;
      this.isPointerDown = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.detachPointerHandlers();
      this.clearWaterSimulation();
    }

    attachPointerHandlers() {
      if (!this.canvas) return;

      const getCoord = (e) => {
        if (typeof this.getPos === 'function') return this.getPos(e);
        const rect = this.canvas.getBoundingClientRect();
        const cx = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
        const cy = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        const sx = rect.width > 0 ? (this.width / rect.width) : 1;
        const sy = rect.height > 0 ? (this.height / rect.height) : 1;
        return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
      };

      this._boundDown = (e) => {
        if (!this.isRunning) return;
        this.isPointerDown = true;
        const pos = getCoord(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
        const now = performance.now();

        if (typeof this.onFirstInteraction === 'function') {
          this.onFirstInteraction();
        }

        // Tetesan riak air
        this.injectWaterDisplacement(pos.x, pos.y, -28, 3.6);

        // Beberapa butiran tetesan mikro
        for (let i = 0; i < 4; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 0.5 + Math.random() * 1.0;
          this.droplets.push({
            x: pos.x,
            y: pos.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            radius: 0.9 + Math.random() * 0.7,
            alpha: 0.8,
            decay: 0.035
          });
        }

        if (window.RiakAudio) {
          window.RiakAudio.playClick(0.5);
          this.lastAudioTime = now;
        }
      };

      this._boundMove = (e) => {
        if (!this.isRunning || !this.isPointerDown) return;
        const pos = getCoord(e);
        const dx = pos.x - this.lastX;
        const dy = pos.y - this.lastY;
        const dist = Math.hypot(dx, dy);
        const now = performance.now();
        const dt = Math.max(now - (this.lastMoveTime || now), 1);
        this.lastMoveTime = now;
        const speed = (dist / dt) * 0.8;

        // Sembunyikan navbar jika sedang aktif berinteraksi
        if (dist > 3 && window.RiakNavbar && typeof window.RiakNavbar.hide === 'function') {
          window.RiakNavbar.hide();
        }

        const rawY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        if (rawY <= 50 && window.RiakNavbar && typeof window.RiakNavbar.show === 'function') {
          window.RiakNavbar.show();
        }

        // Buat alur riak di sepanjang jalur geser
        const normSpeed = Math.min(speed, 2.0);
        const dragImpulse = -(10 + normSpeed * 6);
        const steps = Math.max(1, Math.min(6, Math.ceil(dist / 14)));

        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const ix = this.lastX + dx * t;
          const iy = this.lastY + dy * t;
          this.injectWaterDisplacement(ix, iy, dragImpulse / Math.sqrt(steps), 2.5);
        }

        // Putar audio riak air mengalir (throttled)
        if (now - this.lastAudioTime >= 95 && dist >= 8) {
          if (window.RiakAudio) window.RiakAudio.playDrag(speed);
          this.lastAudioTime = now;
        }

        this.lastX = pos.x;
        this.lastY = pos.y;
      };

      this._boundUp = () => {
        this.isPointerDown = false;
      };

      this.canvas.addEventListener('mousedown', this._boundDown);
      window.addEventListener('mousemove', this._boundMove);
      window.addEventListener('mouseup', this._boundUp);

      this.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this._boundDown(e);
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (this.isPointerDown) {
          e.preventDefault();
          this._boundMove(e);
        }
      }, { passive: false });

      window.addEventListener('touchend', this._boundUp);
      window.addEventListener('touchcancel', this._boundUp);
    }

    detachPointerHandlers() {
      if (this.canvas && this._boundDown) {
        this.canvas.removeEventListener('mousedown', this._boundDown);
      }
      if (this._boundMove) {
        window.removeEventListener('mousemove', this._boundMove);
      }
      if (this._boundUp) {
        window.removeEventListener('mouseup', this._boundUp);
        window.removeEventListener('touchend', this._boundUp);
        window.removeEventListener('touchcancel', this._boundUp);
      }
    }

    updateSimulation() {
      if (!this.currentBuffer || !this.previousBuffer) return;
      const cols = this.simCols;
      const rows = this.simRows;
      const current = this.currentBuffer;
      const previous = this.previousBuffer;
      const damping = this.damping;
      const MAX_VAL = 35;

      for (let y = 1; y < rows - 1; y++) {
        const rowOffset = y * cols;
        for (let x = 1; x < cols - 1; x++) {
          const idx = rowOffset + x;
          const sum = current[idx - 1] + current[idx + 1] + current[idx - cols] + current[idx + cols];
          let newVal = (sum * 0.5 - previous[idx]) * damping;
          if (newVal > MAX_VAL) newVal = MAX_VAL;
          else if (newVal < -MAX_VAL) newVal = -MAX_VAL;
          previous[idx] = newVal;
        }
      }

      // Tukar buffer ganda (Ping-Pong Swap)
      const temp = this.currentBuffer;
      this.currentBuffer = this.previousBuffer;
      this.previousBuffer = temp;
    }

    renderWater() {
      const data = this.offscreenImgData.data;
      const current = this.currentBuffer;
      const cols = this.simCols;
      const rows = this.simRows;
      const { r: cr, g: cg, b: cb } = this.primaryRgb;

      let pIdx = 0;
      for (let y = 0; y < rows; y++) {
        const rowOffset = y * cols;
        for (let x = 0; x < cols; x++) {
          const idx = rowOffset + x;

          if (x === 0 || x === cols - 1 || y === 0 || y === rows - 1) {
            data[pIdx] = data[pIdx + 1] = data[pIdx + 2] = data[pIdx + 3] = 0;
            pIdx += 4;
            continue;
          }

          const dx = current[idx + 1] - current[idx - 1];
          const dy = current[idx + cols] - current[idx - cols];
          const shade = (-dx - dy) * 2.4;

          if (shade > 1.0) {
            // Puncak riak yang memantulkan cahaya
            const intensity = Math.min((shade - 1.0) / 20, 1.0);
            const whiteBlend = intensity * 0.75;
            data[pIdx]     = Math.min(255, Math.floor(cr + (255 - cr) * whiteBlend));
            data[pIdx + 1] = Math.min(255, Math.floor(cg + (255 - cg) * whiteBlend));
            data[pIdx + 2] = Math.min(255, Math.floor(cb + (255 - cb) * whiteBlend));
            data[pIdx + 3] = Math.floor(intensity * intensity * 190);
          } else if (shade < -1.0) {
            // Bayangan lembah air lembut
            const intensity = Math.min((-shade - 1.0) / 24, 1.0);
            data[pIdx]     = Math.floor(cr * 0.15);
            data[pIdx + 1] = Math.floor(cg * 0.20);
            data[pIdx + 2] = Math.floor(cb * 0.35);
            data[pIdx + 3] = Math.floor(intensity * intensity * 125);
          } else {
            data[pIdx] = data[pIdx + 1] = data[pIdx + 2] = data[pIdx + 3] = 0;
          }

          pIdx += 4;
        }
      }

      this.offscreenCtx.putImageData(this.offscreenImgData, 0, 0);

      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'medium';
      this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height);

      // Render butiran tetesan air
      for (let i = this.droplets.length - 1; i >= 0; i--) {
        const d = this.droplets[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vx *= 0.94;
        d.vy *= 0.94;
        d.alpha -= d.decay;

        if (d.alpha <= 0) {
          this.droplets.splice(i, 1);
          continue;
        }

        this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, d.alpha.toFixed(3))})`;
        this.ctx.beginPath();
        this.ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    handleResize(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.initSimulationGrid();
    }
  }

  // ==========================================================================
  // 2. ENGINE MODE ANGKASA: Fisika Partikel Bintang Berpegas & Repulsi Kursor
  // ==========================================================================
  class AngkasaEngineMode {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.primaryColor = '#C084FC';
      this.primaryRgb = { r: 192, g: 132, b: 252 };

      this.stars = [];
      this.burstSparks = [];

      this.isPointerDown = false;
      this.lastX = 0;
      this.lastY = 0;
      this.rafId = null;
      this.isRunning = false;

      this.getPos = null;
      this.onFirstInteraction = null;

      this._boundDown = null;
      this._boundMove = null;
      this._boundUp = null;
    }

    setColor(colorHex) {
      this.primaryColor = colorHex;
      this.primaryRgb = hexToRgb(colorHex);
    }

    initStarfield() {
      this.stars = [];
      // Jarak partikel 58px menghasilkan sebaran yang padat merata di kanvas 400%
      // dengan performa 60 FPS yang sangat ringan
      const spacing = 58;
      const cols = Math.ceil(this.width / spacing) + 1;
      const rows = Math.ceil(this.height / spacing) + 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const originX = c * spacing + (Math.random() - 0.5) * spacing * 0.7;
          const originY = r * spacing + (Math.random() - 0.5) * spacing * 0.7;
          const isStar = Math.random() < 0.22;

          this.stars.push({
            originX,
            originY,
            x: originX,
            y: originY,
            vx: 0,
            vy: 0,
            radius: isStar ? 2.0 + Math.random() * 1.5 : 0.8 + Math.random() * 1.2,
            isStar,
            baseAlpha: 0.22 + Math.random() * 0.42,
            twinkleSpeed: 0.0016 + Math.random() * 0.003,
            twinklePhase: Math.random() * Math.PI * 2,
            glow: 0
          });
        }
      }
    }

    repelStars(px, py, force = 5.5, radius = 110) {
      const rSq = radius * radius;
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        const dx = s.x - px;
        const dy = s.y - py;
        const distSq = dx * dx + dy * dy;
        if (distSq < rSq && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const ratio = 1 - dist / radius;
          const impulse = ratio * ratio * force;
          const nx = dx / dist;
          const ny = dy / dist;
          s.vx += nx * impulse;
          s.vy += ny * impulse;
          s.glow = Math.min(1.0, s.glow + ratio * 1.3);
        }
      }
    }

    start(canvas, ctx, width, height, dpr, primaryColor, onFirstInteraction, getPos) {
      this.stop(); // Hentikan instance sebelumnya

      this.canvas = canvas;
      this.ctx = ctx;
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.getPos = getPos;
      this.onFirstInteraction = onFirstInteraction;
      if (primaryColor) this.setColor(primaryColor);

      this.isRunning = true;
      this.burstSparks = [];
      this.initStarfield();
      this.attachPointerHandlers();

      // Jalankan loop render tersendiri untuk mode Angkasa
      const loop = (t) => {
        if (!this.isRunning) return;
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.updateAndRender(t);
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    }

    stop() {
      this.isRunning = false;
      this.isPointerDown = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.detachPointerHandlers();
      this.stars = [];
      this.burstSparks = [];
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
    }

    attachPointerHandlers() {
      if (!this.canvas) return;

      const getCoord = (e) => {
        if (typeof this.getPos === 'function') return this.getPos(e);
        const rect = this.canvas.getBoundingClientRect();
        const cx = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
        const cy = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        const sx = rect.width > 0 ? (this.width / rect.width) : 1;
        const sy = rect.height > 0 ? (this.height / rect.height) : 1;
        return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
      };

      this._boundDown = (e) => {
        if (!this.isRunning) return;
        this.isPointerDown = true;
        const pos = getCoord(e);
        this.lastX = pos.x;
        this.lastY = pos.y;

        if (typeof this.onFirstInteraction === 'function') {
          this.onFirstInteraction();
        }

        // Dorong bintang menjauh dari titik klik
        this.repelStars(pos.x, pos.y, 9.0, 130);

        // Percikan debu kosmik melayang
        const count = 12;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
          const spd = 1.0 + Math.random() * 1.8;
          this.burstSparks.push({
            x: pos.x,
            y: pos.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: 2.0 + Math.random() * 2.4,
            alpha: 1.0,
            decay: 0.018 + Math.random() * 0.008,
            isStar: Math.random() > 0.4
          });
        }

        if (window.RiakAudio) window.RiakAudio.playClick(0.5);
      };

      this._boundMove = (e) => {
        if (!this.isRunning || !this.isPointerDown) return;
        const pos = getCoord(e);
        const dx = pos.x - this.lastX;
        const dy = pos.y - this.lastY;
        const dist = Math.hypot(dx, dy);
        const dt = Math.max(performance.now() - (this.lastMoveTime || performance.now()), 1);
        this.lastMoveTime = performance.now();
        const speed = (dist / dt) * 0.8;

        if (dist > 3 && window.RiakNavbar && typeof window.RiakNavbar.hide === 'function') {
          window.RiakNavbar.hide();
        }

        const rawY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        if (rawY <= 50 && window.RiakNavbar && typeof window.RiakNavbar.show === 'function') {
          window.RiakNavbar.show();
        }

        const pushRadius = 80 + Math.min(speed * 25, 45);
        const pushForce = 3.0 + Math.min(speed * 3.5, 6);
        this.repelStars(pos.x, pos.y, pushForce, pushRadius);

        if (Math.random() < 0.5) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 0.4 + Math.random() * 0.9;
          this.burstSparks.push({
            x: pos.x + (Math.random() - 0.5) * 6,
            y: pos.y + (Math.random() - 0.5) * 6,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: 1.4 + Math.random() * 1.6,
            alpha: 0.85,
            decay: 0.026,
            isStar: Math.random() > 0.6
          });
        }

        if (window.RiakAudio && dist > 8) {
          window.RiakAudio.playDrag(speed);
        }

        this.lastX = pos.x;
        this.lastY = pos.y;
      };

      this._boundUp = () => {
        this.isPointerDown = false;
      };

      this.canvas.addEventListener('mousedown', this._boundDown);
      window.addEventListener('mousemove', this._boundMove);
      window.addEventListener('mouseup', this._boundUp);

      this.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this._boundDown(e);
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (this.isPointerDown) {
          e.preventDefault();
          this._boundMove(e);
        }
      }, { passive: false });

      window.addEventListener('touchend', this._boundUp);
      window.addEventListener('touchcancel', this._boundUp);
    }

    detachPointerHandlers() {
      if (this.canvas && this._boundDown) {
        this.canvas.removeEventListener('mousedown', this._boundDown);
      }
      if (this._boundMove) {
        window.removeEventListener('mousemove', this._boundMove);
      }
      if (this._boundUp) {
        window.removeEventListener('mouseup', this._boundUp);
        window.removeEventListener('touchend', this._boundUp);
        window.removeEventListener('touchcancel', this._boundUp);
      }
    }

    updateAndRender(time) {
      const springK = 0.038;
      const damping = 0.89;
      const { r: cr, g: cg, b: cb } = this.primaryRgb;

      // 1. Fisika partikel bintang
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        const ax = (s.originX - s.x) * springK;
        const ay = (s.originY - s.y) * springK;

        s.vx = (s.vx + ax) * damping;
        s.vy = (s.vy + ay) * damping;
        s.x += s.vx;
        s.y += s.vy;

        if (s.glow > 0.01) s.glow *= 0.94;
        else s.glow = 0;

        const tw = Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.16;
        const alpha = Math.min(1.0, Math.max(0.06, s.baseAlpha + tw + s.glow * 0.65));

        let fillStyle;
        if (s.glow > 0.04) {
          const g = s.glow;
          const r = Math.floor(255 * (1 - g) + cr * g);
          const gr = Math.floor(255 * (1 - g) + cg * g);
          const b = Math.floor(255 * (1 - g) + cb * g);
          fillStyle = `rgba(${r}, ${gr}, ${b}, ${alpha.toFixed(3)})`;
        } else {
          fillStyle = `rgba(240, 246, 255, ${alpha.toFixed(3)})`;
        }

        this.ctx.fillStyle = fillStyle;

        if (s.isStar) {
          const size = s.radius * (1.0 + s.glow * 0.45);
          this.drawStar(this.ctx, s.x, s.y, 4, size, size * 0.35);
        } else {
          const rad = s.radius * (1.0 + s.glow * 0.3);
          this.ctx.beginPath();
          this.ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }

      // 2. Percikan bintang melayang
      for (let i = this.burstSparks.length - 1; i >= 0; i--) {
        const sp = this.burstSparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.95;
        sp.vy *= 0.95;
        sp.alpha -= sp.decay;

        if (sp.alpha <= 0) {
          this.burstSparks.splice(i, 1);
          continue;
        }

        this.ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${Math.max(0, sp.alpha.toFixed(3))})`;

        if (sp.isStar) {
          this.drawStar(this.ctx, sp.x, sp.y, 4, sp.size, sp.size * 0.35);
        } else {
          this.ctx.beginPath();
          this.ctx.arc(sp.x, sp.y, sp.size * 0.5, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
    }

    handleResize(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.initStarfield();
    }
  }

  // ==========================================================================
  // 3. MASTER ORCHESTRATOR: Pengatur Mode Ruang Sensorik (RiakEngine)
  // ==========================================================================
  class MasterRiakEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.width = 0;
      this.height = 0;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.currentTheme = 'air'; // 'air' | 'angkasa' | 'menulis'
      this.primaryColor = '#38BDF8';

      // Instance mesin untuk masing-masing mode
      this.airEngine = new AirEngineMode();
      this.angkasaEngine = new AngkasaEngineMode();
      this.activeEngine = null;

      this.onFirstInteraction = null;
    }

    init(canvasElement) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d', { alpha: true });

      this.handleResize();
      window.addEventListener('resize', () => this.handleResize());

      if (window.ResizeObserver && this.canvas) {
        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(this.canvas);
      }
    }

    /**
     * Konversi koordinat layar ke koordinat internal kanvas
     * Memperhitungkan efek zoom CSS Transform Scale secara akurat
     */
    getPos(e) {
      if (!this.canvas) return { x: 0, y: 0 };
      const rect = this.canvas.getBoundingClientRect();
      const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
      const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;

      const scaleX = rect.width > 0 ? (this.width / rect.width) : 1;
      const scaleY = rect.height > 0 ? (this.height / rect.height) : 1;

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    /**
     * Berpindah tema secara bersih:
     * 1. Hentikan engine aktif sebelumnya (batalkan RAF dan cabut pointer listener)
     * 2. Bersihkan kanvas
     * 3. Ganti set audio
     * 4. Jalankan engine baru
     */
    setTheme(theme) {
      if (this.activeEngine && typeof this.activeEngine.stop === 'function') {
        this.activeEngine.stop();
      }

      this.currentTheme = theme;

      // Bersihkan kanvas utama
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }

      // Tentukan engine yang baru
      if (theme === 'angkasa') {
        this.activeEngine = this.angkasaEngine;
      } else if (theme === 'menulis') {
        this.activeEngine = window.MenulisEngine || null;
      } else {
        this.activeEngine = this.airEngine;
      }

      // Mulai engine baru
      if (this.activeEngine && typeof this.activeEngine.start === 'function') {
        this.activeEngine.start(
          this.canvas,
          this.ctx,
          this.width,
          this.height,
          this.dpr,
          this.primaryColor,
          () => {
            if (typeof this.onFirstInteraction === 'function') {
              this.onFirstInteraction();
            }
          },
          (e) => this.getPos(e)
        );
      }

      // Sinkronkan tema suara di RiakAudio
      if (window.RiakAudio) {
        window.RiakAudio.setTheme(theme);
      }
    }

    setColor(colorHex) {
      this.primaryColor = colorHex;
      if (this.activeEngine && typeof this.activeEngine.setColor === 'function') {
        this.activeEngine.setColor(colorHex);
      }
    }

    setMenulisTool(tool) {
      if (window.MenulisEngine && typeof window.MenulisEngine.setTool === 'function') {
        window.MenulisEngine.setTool(tool);
      }
    }

    clearMenulisCanvas() {
      if (window.MenulisEngine && typeof window.MenulisEngine.clearCanvas === 'function') {
        window.MenulisEngine.clearCanvas();
      }
    }

    handleResize() {
      if (!this.canvas) return;

      // Kanvas berdimensi luas (400vw x 400vh) agar zoom out hingga 25% tidak menampilkan celah hitam
      const unscaledW = (this.canvas.offsetWidth > 0) ? this.canvas.offsetWidth : Math.floor(window.innerWidth * 4);
      const unscaledH = (this.canvas.offsetHeight > 0) ? this.canvas.offsetHeight : Math.floor(window.innerHeight * 4);

      if (this.width === unscaledW && this.height === unscaledH && this.canvas.width > 0) {
        return;
      }

      this.width = unscaledW;
      this.height = unscaledH;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this.dpr, this.dpr);

      if (this.activeEngine && typeof this.activeEngine.handleResize === 'function') {
        this.activeEngine.handleResize(this.width, this.height, this.dpr);
      }
    }
  }

  // Ekspor instance ke window
  window.RiakEngine = new MasterRiakEngine();
})(window);
