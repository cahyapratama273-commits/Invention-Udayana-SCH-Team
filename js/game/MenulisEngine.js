/**
 * MenulisEngine.js — Pure 2D Canvas Paper & Pencil Sensory Simulation Engine
 * 
 * Part of BerTeduh "Ruang Sensorik"
 * 
 * Features:
 * 1. White Paper Texture ("Kertas Lembut"):
 *    - Procedurally generates an authentic, soothing off-white paper/sketchbook surface.
 *    - Fine organic micro-fibers, natural paper tooth, and soft vignette lighting.
 *    - Rendered seamlessly via CanvasPattern for 60fps performance without memory lag.
 * 2. Graphite Pencil Drawing ("Goresan Pensil"):
 *    - Multi-layered tactile graphite stroke (soft graphite tooth halo, solid core lead).
 *    - Natural speed-adaptive line width and graphite micro-dust along stroke paths.
 *    - Pure pencil graphite black (#1C1917) by default, with colored pencil support if chosen.
 * 3. Peaceful Inactivity Reset:
 *    - After ~3 seconds of idle time, drawings gently fade away over ~9-11 seconds,
 *      providing a continuous, calming journaling & sketching canvas.
 */
(function (window) {
  'use strict';

  class MenulisCanvasEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.isActive = false;

      // Color palette (Graphite pencil black default)
      this.primaryColor = '#1C1917';
      this.primaryRgb = { r: 28, g: 25, b: 23 };

      // Offscreen Paper Fiber Pattern
      this.grainPattern = null;
      this.grainCanvas = null;

      // Offscreen Trail Buffer (pencil marks)
      this.trailCanvas = null;
      this.trailCtx = null;
      this.hasActiveTrail = false;
      this.trailAlpha = 1.0;

      // Pointer & stroke tracking
      this.isDrawing = false;
      this.lastX = 0;
      this.lastY = 0;
      this.lastStrokeTime = 0;

      // Active tool: 'pencil' | 'eraser'
      this.currentTool = 'pencil';

      // Refill / fade timing parameters
      this.idleThresholdMs = 2800; // Wait 2.8s after last touch before fading starts
      this.refillDurationMs = 9500; // Smoothly fades over ~9.5 seconds
    }

    setTool(tool) {
      this.currentTool = tool === 'eraser' ? 'eraser' : 'pencil';
    }

    hexToRgb(hex) {
      if (!hex || typeof hex !== 'string') return { r: 28, g: 25, b: 23 };
      let c = hex.replace('#', '').trim();
      if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      }
      const num = parseInt(c, 16);
      if (isNaN(num)) return { r: 28, g: 25, b: 23 };
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    }

    setColor(colorHex) {
      this.primaryColor = colorHex;
      this.primaryRgb = this.hexToRgb(colorHex);
    }

    activate(canvas, ctx, width, height, dpr) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.width = width || (canvas ? canvas.width : window.innerWidth);
      this.height = height || (canvas ? canvas.height : window.innerHeight);
      this.dpr = dpr || Math.min(window.devicePixelRatio || 1, 2);
      this.isActive = true;

      this.initTrailBuffer();
      this.generatePaperPattern();
    }

    deactivate() {
      this.isActive = false;
      this.isDrawing = false;
      if (this.trailCtx && this.trailCanvas) {
        this.trailCtx.save();
        this.trailCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
        this.trailCtx.restore();
      }
      this.hasActiveTrail = false;
      this.trailAlpha = 1.0;
    }

    clearCanvas() {
      if (this.trailCtx && this.trailCanvas) {
        this.trailCtx.save();
        this.trailCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
        this.trailCtx.restore();
      }
      this.hasActiveTrail = false;
      this.trailAlpha = 1.0;
      this.isDrawing = false;
    }

    handleResize(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr || this.dpr || Math.min(window.devicePixelRatio || 1, 2);
      this.initTrailBuffer();
      this.generatePaperPattern();
    }

    /**
     * Initializes the offscreen canvas used to record smooth pencil strokes
     * Uses devicePixelRatio for pixel-perfect sharpness and exact cursor alignment
     */
    initTrailBuffer() {
      if (!this.width || !this.height) return;
      const w = Math.max(1, Math.floor(this.width));
      const h = Math.max(1, Math.floor(this.height));
      const dpr = this.dpr || Math.min(window.devicePixelRatio || 1, 2);
      const targetBufferW = Math.floor(w * dpr);
      const targetBufferH = Math.floor(h * dpr);

      let prevCanvas = null;
      if (this.trailCanvas && this.hasActiveTrail) {
        prevCanvas = document.createElement('canvas');
        prevCanvas.width = this.trailCanvas.width;
        prevCanvas.height = this.trailCanvas.height;
        const pCtx = prevCanvas.getContext('2d');
        pCtx.drawImage(this.trailCanvas, 0, 0);
      }

      if (!this.trailCanvas) {
        this.trailCanvas = document.createElement('canvas');
      }

      this.trailCanvas.width = targetBufferW;
      this.trailCanvas.height = targetBufferH;
      this.trailCtx = this.trailCanvas.getContext('2d', { alpha: true });
      this.trailCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.trailCtx.scale(dpr, dpr);
      this.trailCtx.clearRect(0, 0, w, h);

      if (prevCanvas) {
        this.trailCtx.drawImage(prevCanvas, 0, 0, w, h);
      } else {
        this.hasActiveTrail = false;
        this.trailAlpha = 1.0;
      }
    }

    /**
     * Procedurally bakes a 256x256 repeating seamless sand & paper fiber texture
     * Layer 1: Dense fine grain sand/paper tooth noise (alpha 0.08 - 0.18)
     * Layer 2: Sparser coarse sand & mineral particle depth (radius 0.9 - 2.0px)
     */
    generatePaperPattern() {
      const size = 256;
      if (!this.grainCanvas) {
        this.grainCanvas = document.createElement('canvas');
        this.grainCanvas.width = size;
        this.grainCanvas.height = size;
      }
      const gCtx = this.grainCanvas.getContext('2d');
      gCtx.clearRect(0, 0, size, size);

      // --- LAYER 1: Dense fine sand grains & micro-fibers ---
      const fineCount = 2800;
      for (let i = 0; i < fineCount; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const roll = Math.random();

        if (roll < 0.15) {
          // Fine fiber / sand brush streak
          const len = Math.random() * 3.5 + 1.2;
          const angle = Math.random() * Math.PI;
          const alpha = (0.08 + Math.random() * 0.10).toFixed(3);
          gCtx.strokeStyle = `rgba(115, 100, 80, ${alpha})`;
          gCtx.lineWidth = 0.6;
          gCtx.beginPath();
          gCtx.moveTo(x, y);
          gCtx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
          gCtx.stroke();
        } else if (roll < 0.65) {
          // Warm sand speckle (medium-dark grain)
          const rad = Math.random() * 0.85 + 0.35;
          const alpha = (0.09 + Math.random() * 0.12).toFixed(3);
          gCtx.fillStyle = `rgba(135, 118, 95, ${alpha})`;
          gCtx.beginPath();
          gCtx.arc(x, y, rad, 0, Math.PI * 2);
          gCtx.fill();
        } else {
          // Bright quartz / mineral reflection
          const rad = Math.random() * 0.75 + 0.3;
          const alpha = (0.35 + Math.random() * 0.35).toFixed(2);
          gCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          gCtx.beginPath();
          gCtx.arc(x, y, rad, 0, Math.PI * 2);
          gCtx.fill();
        }
      }

      // --- LAYER 2: Sparser coarse sand grains & organic depth variation ---
      const coarseCount = 320;
      for (let i = 0; i < coarseCount; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const rad = Math.random() * 1.1 + 0.9;
        const isDark = Math.random() < 0.65;

        if (isDark) {
          // Coarse mineral / sand grain with micro-shadow
          const alpha = (0.12 + Math.random() * 0.14).toFixed(3);
          gCtx.fillStyle = `rgba(105, 90, 72, ${alpha})`;
          gCtx.beginPath();
          gCtx.arc(x, y, rad, 0, Math.PI * 2);
          gCtx.fill();

          // Subtle offset highlight for 3D tactile sand feel
          gCtx.fillStyle = `rgba(255, 255, 255, ${(0.18 + Math.random() * 0.15).toFixed(2)})`;
          gCtx.beginPath();
          gCtx.arc(x - 0.5, y - 0.5, rad * 0.6, 0, Math.PI * 2);
          gCtx.fill();
        } else {
          // Distinct quartz crystal sparkle
          const alpha = (0.45 + Math.random() * 0.35).toFixed(2);
          gCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          gCtx.beginPath();
          gCtx.arc(x, y, rad * 0.8, 0, Math.PI * 2);
          gCtx.fill();
        }
      }

      if (this.ctx) {
        this.grainPattern = this.ctx.createPattern(this.grainCanvas, 'repeat');
      }
    }

    handlePointerDown(x, y) {
      if (!this.isActive) return;
      this.isDrawing = true;
      this.lastX = x;
      this.lastY = y;
      this.lastStrokeTime = performance.now();
      this.trailAlpha = 1.0;
      this.hasActiveTrail = true;

      // Draw initial touch point mark based on active tool
      if (this.currentTool === 'eraser') {
        this.eraseStroke(x, y, x + 0.1, y + 0.1, 24);
      } else {
        this.drawPencilStroke(x, y, x + 0.1, y + 0.1, 4.2);
      }
    }

    handlePointerMove(x, y, dx, dy, dist, speed) {
      if (!this.isActive || !this.isDrawing) return;

      this.lastStrokeTime = performance.now();
      this.trailAlpha = 1.0;
      this.hasActiveTrail = true;

      if (this.currentTool === 'eraser') {
        // Natural speed-adaptive eraser head diameter: 20px to 34px
        const eraserWidth = Math.max(20, Math.min(34, 24 + speed * 1.4));
        this.eraseStroke(this.lastX, this.lastY, x, y, eraserWidth);
      } else {
        // Brush width dynamically varies smoothly with stroke speed: 3.5px to 7.5px (natural pencil tip)
        const brushWidth = Math.max(3.2, Math.min(7.5, 4.2 + speed * 0.7));
        this.drawPencilStroke(this.lastX, this.lastY, x, y, brushWidth);
      }

      this.lastX = x;
      this.lastY = y;
    }

    handlePointerUp() {
      if (!this.isActive) return;
      this.isDrawing = false;
      this.lastStrokeTime = performance.now();
    }

    /**
     * Erases graphite marks cleanly from the offscreen trail buffer
     * using destination-out compositing with soft feathered outer edges
     */
    eraseStroke(x1, y1, x2, y2, eraserWidth = 24) {
      if (!this.trailCtx) return;

      const ctx = this.trailCtx;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'destination-out';

      // Pass 1: Feathered outer eraser perimeter (subtle soft edges)
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = eraserWidth + 6;
      ctx.stroke();

      // Pass 2: Solid clean eraser core
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
      ctx.lineWidth = eraserWidth;
      ctx.stroke();

      ctx.restore();
    }

    /**
     * Draws authentic graphite pencil strokes onto the offscreen trail buffer
     */
    drawPencilStroke(x1, y1, x2, y2, brushWidth) {
      if (!this.trailCtx) return;

      const ctx = this.trailCtx;
      const { r: cr, g: cg, b: cb } = this.primaryRgb;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Pass 1: Soft graphite tooth halo (subtle shading on tooth of paper)
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.22)`;
      ctx.lineWidth = brushWidth + 2.5;
      ctx.stroke();

      // Pass 2: Main graphite body
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.78)`;
      ctx.lineWidth = brushWidth;
      ctx.stroke();

      // Pass 3: Dense pencil core
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.94)`;
      ctx.lineWidth = Math.max(1.8, brushWidth * 0.55);
      ctx.stroke();

      // Pass 4: Realistic graphite lead micro-flecks along the tooth of the paper
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const scatterCount = Math.floor(dist * 0.25);
      for (let i = 0; i < scatterCount; i++) {
        const t = Math.random();
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        const angle = Math.random() * Math.PI * 2;
        const offset = (brushWidth * 0.42) + Math.random() * 2.2;
        const sx = px + Math.cos(angle) * offset;
        const sy = py + Math.sin(angle) * offset;
        const rad = Math.random() * 0.65 + 0.25;

        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${(0.25 + Math.random() * 0.35).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    /**
     * Renders the complete paper & pencil sensory scene onto main canvas
     */
    render(timestamp) {
      if (!this.isActive || !this.ctx || !this.width || !this.height) return;

      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      // 1. Soothing, gentle ambient paper radial gradient (clean off-white sketch paper)
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.48, 0, w * 0.5, h * 0.48, Math.max(w, h) * 0.75);
      bgGrad.addColorStop(0, '#FCFBF8');
      bgGrad.addColorStop(0.65, '#F5F2EA');
      bgGrad.addColorStop(1, '#ECE6DA');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Overlay seamless procedural paper tooth & fiber pattern
      if (!this.grainPattern) {
        this.generatePaperPattern();
      }
      if (this.grainPattern) {
        ctx.save();
        ctx.fillStyle = this.grainPattern;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // 3. Subtle sketchbook page vignette at bottom
      const pageShadow = ctx.createLinearGradient(0, h - 35, 0, h);
      pageShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
      pageShadow.addColorStop(1, 'rgba(0, 0, 0, 0.045)');
      ctx.fillStyle = pageShadow;
      ctx.fillRect(0, h - 35, w, 35);

      // 4. Update inactivity refill / peaceful drawing fade
      if (this.hasActiveTrail && this.trailCanvas) {
        const now = performance.now();
        const idleTime = now - this.lastStrokeTime;

        if (!this.isDrawing && idleTime > this.idleThresholdMs) {
          const refillElapsed = idleTime - this.idleThresholdMs;
          const progress = Math.min(1.0, refillElapsed / this.refillDurationMs);

          // Smooth cosine ease-in-out fade
          this.trailAlpha = 0.5 * (1 + Math.cos(progress * Math.PI));

          if (progress >= 1.0) {
            // Full fade complete: reset buffer
            if (this.trailCtx) {
              this.trailCtx.save();
              this.trailCtx.setTransform(1, 0, 0, 1, 0, 0);
              this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
              this.trailCtx.restore();
            }
            this.hasActiveTrail = false;
            this.trailAlpha = 1.0;
          }
        }

        // 5. Composite pencil marks onto paper canvas with current opacity
        if (this.hasActiveTrail && this.trailAlpha > 0.001) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, this.trailAlpha));
          ctx.drawImage(this.trailCanvas, 0, 0, w, h);
          ctx.restore();
        }
      }
    }
  }

  // Export singleton to global window
  window.MenulisEngine = new MenulisCanvasEngine();
})(window);
