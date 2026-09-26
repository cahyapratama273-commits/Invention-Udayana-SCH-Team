/**
 * RiakEngine.js — Pure 2D Canvas Sensory Simulation Engine
 * 
 * Features:
 * 1. Air Theme: Fine, crisp CPU 2D height-field wave simulation.
 *    - Higher-density simulation grid (~280 base resolution) for crisp, localized micro-ripples.
 *    - Clamped displacement (35 max) and subtle injection strength so ripples stay calm.
 *    - Tuned damping (0.935) so ripples settle quickly in ~1.0-1.2s and peak span <= 15-20% width.
 *    - Pure surface normal slope shading with smooth quadratic alpha falloff (no phantom blob).
 * 2. Angkasa Theme: Anchored stardust grid with Hooke's-law spring physics,
 *    cursor repulsion impulses, dynamic glow feedback, and drifting sparkle bursts.
 * 3. Sensory Audio & Controls: Speed-scaled sound triggers, color switching,
 *    and responsive pointer interactions.
 */
(function (window) {
  'use strict';

  class RiakCanvasEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.width = 0;
      this.height = 0;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.theme = 'air'; // 'air' | 'angkasa'
      this.primaryColor = '#38BDF8';
      this.primaryRgb = { r: 56, g: 189, b: 248 };

      // Water Simulation (Air Theme)
      this.simCols = 280;
      this.simRows = 160;
      this.buffer1 = null;
      this.buffer2 = null;
      this.currentBuffer = null;
      this.previousBuffer = null;
      this.damping = 0.992; // Settles over ~2-3s, expands to ~25-35% of canvas width naturally
      this.offscreenCanvas = null;
      this.offscreenCtx = null;
      this.offscreenImgData = null;
      this.droplets = []; // Subtle micro-droplets on click/tap

      // Stardust Physics Field (Angkasa Theme)
      this.stars = [];
      this.burstSparks = [];

      // Pointer tracking
      this.isPointerDown = false;
      this.lastX = 0;
      this.lastY = 0;
      this.lastPointerTime = 0;
      this.lastAudioTime = 0;

      this.lastInteractionTime = performance.now();
      this.isRunning = false;
      this.onFirstInteraction = null;
      this.hasInteracted = false;
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

      this.bindEvents();

      this.isRunning = true;
      requestAnimationFrame((t) => this.render(t));
    }

    hexToRgb(hex) {
      if (!hex || typeof hex !== 'string') return { r: 45, g: 212, b: 168 };
      let c = hex.replace('#', '').trim();
      if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      }
      const num = parseInt(c, 16);
      if (isNaN(num)) return { r: 45, g: 212, b: 168 };
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    }

    setColor(colorHex) {
      this.primaryColor = colorHex;
      this.primaryRgb = this.hexToRgb(colorHex);
      if (window.MenulisEngine) {
        window.MenulisEngine.setColor(colorHex);
      }
    }

    clearWaterSimulation() {
      if (this.buffer1) this.buffer1.fill(0);
      if (this.buffer2) this.buffer2.fill(0);
      if (this.currentBuffer) this.currentBuffer.fill(0);
      if (this.previousBuffer) this.previousBuffer.fill(0);
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

    setTheme(theme) {
      this.theme = theme;
      this.clearWaterSimulation();
      if (theme === 'angkasa') {
        this.initAngkasaField();
        this.burstSparks = [];
      } else if (theme === 'menulis') {
        if (window.MenulisEngine) {
          window.MenulisEngine.setColor(this.primaryColor);
          window.MenulisEngine.activate(this.canvas, this.ctx, this.width, this.height, this.dpr);
        }
      }

      if (theme !== 'menulis' && window.MenulisEngine) {
        window.MenulisEngine.deactivate();
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
      if (window.RiakAudio && typeof window.RiakAudio.stopPencilSound === 'function') {
        window.RiakAudio.stopPencilSound();
      }
    }

    handleResize() {
      if (!this.canvas) return;

      // Calculate unscaled 400vw x 400vh layout width & height
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

      this.initWaterSimulation();
      this.initAngkasaField();

      if (window.MenulisEngine) {
        window.MenulisEngine.handleResize(this.width, this.height, this.dpr);
      }
    }

    /**
     * Initializes higher-resolution simulation grid and double buffers for height-field water
     */
    initWaterSimulation() {
      // Sets fine grid resolution based on 4x expanded canvas aspect ratio:
      const baseCols = 320;
      if (this.width > 0 && this.height > 0) {
        if (this.width >= this.height) {
          this.simCols = baseCols;
          this.simRows = Math.max(80, Math.round(baseCols * (this.height / this.width)));
        } else {
          // Portrait (mobile devices): maintain high horizontal cell density
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

    /**
     * Initializes stardust grid with spring anchors for Angkasa theme
     */
    initAngkasaField() {
      this.stars = [];
      const spacing = 46;
      const cols = Math.ceil(this.width / spacing) + 1;
      const rows = Math.ceil(this.height / spacing) + 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const originX = c * spacing + (Math.random() - 0.5) * spacing * 0.65;
          const originY = r * spacing + (Math.random() - 0.5) * spacing * 0.65;
          const isStar = Math.random() < 0.22;

          this.stars.push({
            originX,
            originY,
            x: originX,
            y: originY,
            vx: 0,
            vy: 0,
            radius: isStar ? 2.0 + Math.random() * 1.6 : 0.8 + Math.random() * 1.3,
            isStar,
            baseAlpha: 0.22 + Math.random() * 0.42,
            twinkleSpeed: 0.0016 + Math.random() * 0.003,
            twinklePhase: Math.random() * Math.PI * 2,
            glow: 0
          });
        }
      }
    }

    bindEvents() {
      const getPos = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
        const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;

        // Exact normalized scale factor between canvas internal coordinate space and client rect
        const scaleX = (rect.width > 0) ? (this.width / rect.width) : 1;
        const scaleY = (rect.height > 0) ? (this.height / rect.height) : 1;

        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
        };
      };

      const handleStart = (e) => {
        this.isPointerDown = true;
        const pos = getPos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
        const now = performance.now();
        this.lastPointerTime = now;
        this.lastInteractionTime = now;

        this.triggerFirstInteraction();

        if (this.theme === 'menulis') {
          if (window.MenulisEngine) {
            window.MenulisEngine.handlePointerDown(pos.x, pos.y);
          }
          if (window.RiakAudio) {
            if (window.MenulisEngine && window.MenulisEngine.currentTool === 'eraser') {
              window.RiakAudio.startEraserSound(0.5);
            } else {
              window.RiakAudio.startPencilSound(0.5);
            }
          }
        } else {
          this.handlePointerClick(pos.x, pos.y);

          if (window.RiakAudio) {
            window.RiakAudio.playClick(0.5);
            this.lastAudioTime = now;
          }
        }
      };

      const handleMove = (e) => {
        if (!this.isPointerDown) return;
        const pos = getPos(e);
        const now = performance.now();
        const dt = Math.max(now - this.lastPointerTime, 1);
        const dx = pos.x - this.lastX;
        const dy = pos.y - this.lastY;
        const dist = Math.hypot(dx, dy);
        const speed = (dist / dt) * 0.8;

        this.lastInteractionTime = now;

        // Auto-hide navbar while dragging across canvas
        if (dist > 3 && window.RiakNavbar && typeof window.RiakNavbar.hide === 'function') {
          window.RiakNavbar.hide();
        }

        // Auto-show navbar if pointer moves near top edge (clientY <= 50)
        const rawClientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
        if (rawClientY <= 50 && window.RiakNavbar && typeof window.RiakNavbar.show === 'function') {
          window.RiakNavbar.show();
        }

        if (this.theme === 'menulis') {
          if (window.MenulisEngine) {
            window.MenulisEngine.handlePointerMove(pos.x, pos.y, dx, dy, dist, speed);
          }
          if (window.RiakAudio) {
            if (window.MenulisEngine && window.MenulisEngine.currentTool === 'eraser') {
              window.RiakAudio.updateEraserSound(speed);
            } else {
              window.RiakAudio.updatePencilSound(speed);
            }
          }
        } else {
          this.handlePointerDrag(pos.x, pos.y, dx, dy, dist, speed);

          // Sound throttling during drag (gentle flowing ripple wake)
          if (now - this.lastAudioTime >= 95 && dist >= 8) {
            if (window.RiakAudio) {
              window.RiakAudio.playDrag(speed);
            }
            this.lastAudioTime = now;
          }
        }

        this.lastX = pos.x;
        this.lastY = pos.y;
        this.lastPointerTime = now;
      };

      const handleEnd = () => {
        this.isPointerDown = false;
        if (this.theme === 'menulis') {
          if (window.MenulisEngine) {
            window.MenulisEngine.handlePointerUp();
          }
          if (window.RiakAudio) {
            window.RiakAudio.stopPencilSound();
          }
        }
      };

      // Mouse events
      this.canvas.addEventListener('mousedown', handleStart);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);

      // Touch events (passive: false to prevent scrolling)
      this.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleStart(e);
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (this.isPointerDown) {
          e.preventDefault();
          handleMove(e);
        }
      }, { passive: false });

      window.addEventListener('touchend', handleEnd);
      window.addEventListener('touchcancel', handleEnd);
    }

    triggerFirstInteraction() {
      if (!this.hasInteracted) {
        this.hasInteracted = true;
        if (typeof this.onFirstInteraction === 'function') {
          this.onFirstInteraction();
        }
      }
    }

    /**
     * Injects displacement into height-field grid with smooth cosine falloff and value clamping
     */
    injectWaterDisplacement(canvasX, canvasY, strength, radius = 3.6) {
      if (!this.currentBuffer || this.width <= 0 || this.height <= 0) return;
      const gx = Math.round((canvasX / this.width) * this.simCols);
      const gy = Math.round((canvasY / this.height) * this.simRows);
      const cols = this.simCols;
      const rows = this.simRows;

      const r = Math.ceil(radius);
      const rSq = radius * radius;
      const MAX_VAL = 35; // Maximum displacement clamp to ensure ripples stay localized

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

    /**
     * Repels stardust particles away from pointer in Angkasa theme
     */
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

    /**
     * Click / Tap interaction handler — natural expanding ripples
     */
    handlePointerClick(x, y) {
      if (this.theme === 'air') {
        // Natural downward displacement impulse for single click/tap (~25-35% width spread)
        this.injectWaterDisplacement(x, y, -28, 3.6);

        // Gentle surface micro-droplets
        const dropCount = 4;
        for (let i = 0; i < dropCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 0.5 + Math.random() * 1.0;
          this.droplets.push({
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            radius: 0.9 + Math.random() * 0.7,
            alpha: 0.8,
            decay: 0.035
          });
        }
      } else {
        // Angkasa: Repel nearby stars with strong impulse
        this.repelStars(x, y, 9.0, 130);

        // Spawn drifting sparkle burst
        const count = 12;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
          const spd = 1.0 + Math.random() * 1.8;
          this.burstSparks.push({
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: 2.0 + Math.random() * 2.4,
            alpha: 1.0,
            decay: 0.018 + Math.random() * 0.008,
            isStar: Math.random() > 0.4
          });
        }
      }
    }

    /**
     * Drag interaction handler — natural wake along pointer path
     */
    handlePointerDrag(x, y, dx, dy, dist, speed) {
      if (this.theme === 'air') {
        // Controlled, natural wake interpolation along drag path
        const normSpeed = Math.min(speed, 2.0);
        const dragImpulse = -(10 + normSpeed * 6);
        const stepSize = 14;
        const steps = Math.max(1, Math.min(6, Math.ceil(dist / stepSize)));

        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const ix = this.lastX + dx * t;
          const iy = this.lastY + dy * t;
          this.injectWaterDisplacement(ix, iy, dragImpulse / Math.sqrt(steps), 2.5);
        }
      } else {
        // Angkasa: Continuous push / repulsion along pointer path
        const pushRadius = 80 + Math.min(speed * 25, 45);
        const pushForce = 3.0 + Math.min(speed * 3.5, 6);
        this.repelStars(x, y, pushForce, pushRadius);

        // Light cosmic dust sparks along trail
        if (Math.random() < 0.5) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 0.4 + Math.random() * 0.9;
          this.burstSparks.push({
            x: x + (Math.random() - 0.5) * 6,
            y: y + (Math.random() - 0.5) * 6,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: 1.4 + Math.random() * 1.6,
            alpha: 0.85,
            decay: 0.026,
            isStar: Math.random() > 0.6
          });
        }
      }
    }

    /**
     * Classic 2D Wave Propagation Simulation Step with Height Clamping
     * Formula: newHeight[i] = ((sum 4 neighbors) / 2 - previous[i]) * damping
     */
    updateWaterSimulation() {
      if (!this.currentBuffer || !this.previousBuffer) return;
      const cols = this.simCols;
      const rows = this.simRows;
      const current = this.currentBuffer;
      const previous = this.previousBuffer;
      const damping = this.damping;
      const MAX_VAL = 35; // Maximum displacement clamp

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

      // Ping-pong buffer swap
      const temp = this.currentBuffer;
      this.currentBuffer = this.previousBuffer;
      this.previousBuffer = temp;
    }

    /**
     * Renders height-field onto offscreen canvas ImageData and scales up with crisp detail
     */
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

          // Border absorbing boundary
          if (x === 0 || x === cols - 1 || y === 0 || y === rows - 1) {
            data[pIdx] = 0;
            data[pIdx + 1] = 0;
            data[pIdx + 2] = 0;
            data[pIdx + 3] = 0;
            pIdx += 4;
            continue;
          }

          // Surface slope gradient (normal derivatives)
          const dx = current[idx + 1] - current[idx - 1];
          const dy = current[idx + cols] - current[idx - cols];

          // Directional surface slope (top-left light reflection)
          const shade = (-dx - dy) * 2.4;

          if (shade > 1.0) {
            // Crisp, fine crest highlight with smooth quadratic alpha falloff
            const intensity = Math.min((shade - 1.0) / 20, 1.0);
            const whiteBlend = intensity * 0.75;
            data[pIdx]     = Math.min(255, Math.floor(cr + (255 - cr) * whiteBlend));
            data[pIdx + 1] = Math.min(255, Math.floor(cg + (255 - cg) * whiteBlend));
            data[pIdx + 2] = Math.min(255, Math.floor(cb + (255 - cb) * whiteBlend));
            data[pIdx + 3] = Math.floor(intensity * intensity * 190);
          } else if (shade < -1.0) {
            // Subtle, localized trough shadow
            const intensity = Math.min((-shade - 1.0) / 24, 1.0);
            data[pIdx]     = Math.floor(cr * 0.15);
            data[pIdx + 1] = Math.floor(cg * 0.20);
            data[pIdx + 2] = Math.floor(cb * 0.35);
            data[pIdx + 3] = Math.floor(intensity * intensity * 125);
          } else {
            // Calm water: 100% transparent (no haze/blur)
            data[pIdx] = 0;
            data[pIdx + 1] = 0;
            data[pIdx + 2] = 0;
            data[pIdx + 3] = 0;
          }

          pIdx += 4;
        }
      }

      this.offscreenCtx.putImageData(this.offscreenImgData, 0, 0);

      // Scaled up rendering — medium smoothing keeps fine ripple lines crisp without muddy blur
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'medium';
      this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height);

      // Render micro-droplets
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

    /**
     * Updates and renders the Angkasa theme stardust spring physics
     */
    updateAndRenderAngkasa(time) {
      const springK = 0.038;
      const damping = 0.89;
      const { r: cr, g: cg, b: cb } = this.primaryRgb;

      // 1. Update and render anchored stardust
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];

        // Hooke's Law spring back to anchor
        const ax = (s.originX - s.x) * springK;
        const ay = (s.originY - s.y) * springK;

        s.vx = (s.vx + ax) * damping;
        s.vy = (s.vy + ay) * damping;

        s.x += s.vx;
        s.y += s.vy;

        if (s.glow > 0.01) {
          s.glow *= 0.94;
        } else {
          s.glow = 0;
        }

        // Twinkle calculation
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

      // 2. Update and render drifting burst sparks
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

    /**
     * Draws a crisp 2D four-pointed sparkle star
     */
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

    render(time) {
      if (!this.isRunning) return;

      this.ctx.clearRect(0, 0, this.width, this.height);

      if (this.theme === 'air') {
        this.updateWaterSimulation();
        this.renderWater();
      } else if (this.theme === 'angkasa') {
        this.updateAndRenderAngkasa(time);
      } else if (this.theme === 'menulis') {
        if (window.MenulisEngine && window.MenulisEngine.isActive) {
          window.MenulisEngine.render(time);
        }
      }

      requestAnimationFrame((t) => this.render(t));
    }
  }

  // Export to global window
  window.RiakEngine = new RiakCanvasEngine();
})(window);
