/**
 * MenulisEngine.js — Mesin Simulasi Sensorik Kertas & Pensil 2D Canvas Murni
 * 
 * Modul mandiri untuk Ruang Sensorik "Menulis" (Kertas & Pensil):
 * 1. Tekstur Kertas Prosedural Alami:
 *    - Gradasi kertas sketsa hangat off-white (#FCFBF8 ke #ECE6DA).
 *    - Serat kertas mikro, butiran pasir hangat, dan kristal kuarsa berkilau.
 *    - Di-cache ke kanvas offscreen sekali saja agar performa 60 FPS tetap ringan dan hemat CPU.
 * 2. Goresan Pensil & Penghapus Responsif:
 *    - Goresan pensil grafit berlapis (halo arsiran serat kertas, badan pensil lembut, dan inti pekat).
 *    - Partikel debu grafit mikro di sepanjang jalur goresan.
 *    - Mode penghapus (Eraser) berbasis destination-out untuk menghapus goresan dengan lembut.
 *    - Efek suara gesekan pensil/penghapus yang menyesuaikan kecepatan goresan tangan.
 * 3. Pemudaran Otomatis (Inactivity Fade):
 *    - Goresan memudar secara tenang setelah ~3 detik jeda selama ~8-9 detik (total ~11 detik),
 *      memberikan kanvas hening tanpa akhir untuk meluapkan emosi batin.
 * 4. Siklus Hidup Mandiri (Engine Lifecycle):
 *    - Memiliki fungsi start() dan stop() mandiri: memasang pointer listener saat aktif,
 *      dan mencabut listener serta menghentikan requestAnimationFrame saat mode lain dipilih.
 */
(function (window) {
  'use strict';

  class MenulisCanvasEngine {
    constructor() {
      this.canvas = null;               // Elemen kanvas HTML utama
      this.ctx = null;                  // 2D Rendering Context
      this.width = 0;                   // Lebar aktif
      this.height = 0;                  // Tinggi aktif
      this.dpr = 1;                     // Device Pixel Ratio
      this.isActive = false;            // Status mode menulis aktif
      this.rafId = null;                // ID requestAnimationFrame loop

      // Warna goresan pensil (Standar: Hitam Grafit #1C1917)
      this.primaryColor = '#1C1917';
      this.primaryRgb = { r: 28, g: 25, b: 23 };

      // Kanvas offscreen latar belakang kertas
      this.paperCanvas = null;
      this.paperCtx = null;

      // Kanvas offscreen untuk jejak goresan pensil
      this.trailCanvas = null;
      this.trailCtx = null;
      this.hasActiveTrail = false;
      this.trailAlpha = 1.0;            // Opasitas goresan saat memudar perlahan

      // Status interaksi pointer
      this.isDrawing = false;
      this.lastX = 0;
      this.lastY = 0;
      this.lastStrokeTime = 0;

      // Alat aktif: 'pencil' (pensil) atau 'eraser' (penghapus)
      this.currentTool = 'pencil';

      // Parameter pemudaran otomatis (inactivity fade)
      this.idleThresholdMs = 3000;      // Tunggu 3 detik setelah sentuhan terakhir sebelum mulai pudar
      this.refillDurationMs = 8500;     // Durasi pemudaran halus ~8.5 detik (total ~11.5 detik)

      // Fungsi pembantu koordinat & callback
      this.getPos = null;
      this.onFirstInteraction = null;

      // Bound handler untuk registrasi dan pembersihan listener
      this._boundDown = null;
      this._boundMove = null;
      this._boundUp = null;
    }

    /**
     * Mengonversi format hex color ke objek RGB {r, g, b}
     */
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

    /**
     * Mengatur warna pensil aktif
     */
    setColor(colorHex) {
      this.primaryColor = colorHex;
      this.primaryRgb = this.hexToRgb(colorHex);
    }

    /**
     * Mengatur alat aktif: 'pencil' atau 'eraser'
     */
    setTool(tool) {
      this.currentTool = tool === 'eraser' ? 'eraser' : 'pencil';
    }

    /**
     * Membersihkan seluruh goresan pensil di kanvas secara instan
     */
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
      if (window.RiakAudio && typeof window.RiakAudio.stopPencilSound === 'function') {
        window.RiakAudio.stopPencilSound();
      }
    }

    /**
     * Memulai engine Menulis:
     * 1. Menyiapkan kanvas latar kertas & buffer jejak pensil
     * 2. Memasang pointer event listeners khusus mode menulis
     * 3. Menjalankan render loop tersendiri
     */
    start(canvas, ctx, width, height, dpr, primaryColor, onFirstInteraction, getPos) {
      this.stop(); // Pastikan tidak ada loop atau listener lama yang tertinggal

      this.canvas = canvas;
      this.ctx = ctx;
      this.width = width || canvas.offsetWidth || window.innerWidth;
      this.height = height || canvas.offsetHeight || window.innerHeight;
      this.dpr = dpr || Math.min(window.devicePixelRatio || 1, 2);
      this.getPos = getPos;
      this.onFirstInteraction = onFirstInteraction;
      if (primaryColor) this.setColor(primaryColor);

      this.isActive = true;

      // Inisialisasi buffer kanvas
      this.initTrailBuffer();
      this.renderPaperBackground();

      // Pasang event listeners khusus menulis
      this.attachPointerHandlers();

      // Mulai loop animasi frame
      const loop = (t) => {
        if (!this.isActive) return;
        this.render(t);
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    }

    /**
     * Menghentikan engine Menulis:
     * 1. Membatalkan requestAnimationFrame
     * 2. Mencabut semua pointer event listeners
     * 3. Menghentikan efek suara pensil
     */
    stop() {
      this.isActive = false;
      this.isDrawing = false;

      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }

      this.detachPointerHandlers();

      if (window.RiakAudio && typeof window.RiakAudio.stopPencilSound === 'function') {
        window.RiakAudio.stopPencilSound();
      }

      // Bersihkan kanvas jejak pensil
      if (this.trailCtx && this.trailCanvas) {
        this.trailCtx.save();
        this.trailCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
        this.trailCtx.restore();
      }
      this.hasActiveTrail = false;
      this.trailAlpha = 1.0;
    }

    /**
     * Memasang penanganan interaksi sentuhan dan kursor mouse
     */
    attachPointerHandlers() {
      if (!this.canvas) return;

      const getCoord = (e) => {
        if (typeof this.getPos === 'function') {
          return this.getPos(e);
        }
        const rect = this.canvas.getBoundingClientRect();
        const cx = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
        const cy = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        const sx = rect.width > 0 ? (this.width / rect.width) : 1;
        const sy = rect.height > 0 ? (this.height / rect.height) : 1;
        return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
      };

      this._boundDown = (e) => {
        if (!this.isActive) return;
        const pos = getCoord(e);
        this.isDrawing = true;
        this.lastX = pos.x;
        this.lastY = pos.y;
        this.lastStrokeTime = performance.now();
        this.trailAlpha = 1.0;
        this.hasActiveTrail = true;

        if (typeof this.onFirstInteraction === 'function') {
          this.onFirstInteraction();
        }

        // Gambar titik goresan awal
        if (this.currentTool === 'eraser') {
          this.eraseStroke(pos.x, pos.y, pos.x + 0.1, pos.y + 0.1, 26);
          if (window.RiakAudio) window.RiakAudio.startEraserSound(0.5);
        } else {
          this.drawPencilStroke(pos.x, pos.y, pos.x + 0.1, pos.y + 0.1, 4.2);
          if (window.RiakAudio) window.RiakAudio.startPencilSound(0.5);
        }
      };

      this._boundMove = (e) => {
        if (!this.isActive || !this.isDrawing) return;
        const pos = getCoord(e);
        const dx = pos.x - this.lastX;
        const dy = pos.y - this.lastY;
        const dist = Math.hypot(dx, dy);
        const dt = Math.max(performance.now() - this.lastStrokeTime, 1);
        const speed = (dist / dt) * 0.8;

        this.lastStrokeTime = performance.now();
        this.trailAlpha = 1.0;
        this.hasActiveTrail = true;

        // Sembunyikan navbar otomatis saat aktif menggambar
        if (dist > 3 && window.RiakNavbar && typeof window.RiakNavbar.hide === 'function') {
          window.RiakNavbar.hide();
        }

        // Munculkan navbar jika kursor di tepi paling atas (clientY <= 50)
        const rawY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        if (rawY <= 50 && window.RiakNavbar && typeof window.RiakNavbar.show === 'function') {
          window.RiakNavbar.show();
        }

        if (this.currentTool === 'eraser') {
          const eraserW = Math.max(20, Math.min(36, 24 + speed * 1.5));
          this.eraseStroke(this.lastX, this.lastY, pos.x, pos.y, eraserW);
          if (window.RiakAudio) window.RiakAudio.updateEraserSound(speed);
        } else {
          const brushW = Math.max(3.2, Math.min(7.5, 4.2 + speed * 0.7));
          this.drawPencilStroke(this.lastX, this.lastY, pos.x, pos.y, brushW);
          if (window.RiakAudio) window.RiakAudio.updatePencilSound(speed);
        }

        this.lastX = pos.x;
        this.lastY = pos.y;
      };

      this._boundUp = () => {
        if (!this.isActive) return;
        this.isDrawing = false;
        this.lastStrokeTime = performance.now();
        if (window.RiakAudio) window.RiakAudio.stopPencilSound();
      };

      // Pasang listener mouse
      this.canvas.addEventListener('mousedown', this._boundDown);
      window.addEventListener('mousemove', this._boundMove);
      window.addEventListener('mouseup', this._boundUp);

      // Pasang listener sentuh (touch)
      this.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this._boundDown(e);
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (this.isDrawing) {
          e.preventDefault();
          this._boundMove(e);
        }
      }, { passive: false });

      window.addEventListener('touchend', this._boundUp);
      window.addEventListener('touchcancel', this._boundUp);
    }

    /**
     * Mencabut pointer event listeners agar tidak terjadi kebocoran memori (memory leak)
     */
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

    /**
     * Inisialisasi kanvas jejak goresan pensil
     */
    initTrailBuffer() {
      if (!this.width || !this.height) return;
      const w = Math.max(1, Math.floor(this.width));
      const h = Math.max(1, Math.floor(this.height));
      const dpr = this.dpr || 1;

      if (!this.trailCanvas) {
        this.trailCanvas = document.createElement('canvas');
      }

      this.trailCanvas.width = Math.floor(w * dpr);
      this.trailCanvas.height = Math.floor(h * dpr);
      this.trailCtx = this.trailCanvas.getContext('2d', { alpha: true });
      this.trailCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.trailCtx.scale(dpr, dpr);
      this.trailCtx.clearRect(0, 0, w, h);

      this.hasActiveTrail = false;
      this.trailAlpha = 1.0;
    }

    /**
     * Merender latar belakang kertas prosedural (gradasi halus + butiran serat mikro)
     * sekali saja ke kanvas offscreen agar rendering frame 60 FPS tetap instan dan super ringan.
     */
    renderPaperBackground() {
      if (!this.width || !this.height) return;
      const w = Math.max(1, Math.floor(this.width));
      const h = Math.max(1, Math.floor(this.height));

      if (!this.paperCanvas) {
        this.paperCanvas = document.createElement('canvas');
      }
      this.paperCanvas.width = w;
      this.paperCanvas.height = h;
      this.paperCtx = this.paperCanvas.getContext('2d');
      const pCtx = this.paperCtx;

      // 1. Gradasi warna kertas sketsa lembut
      const bgGrad = pCtx.createRadialGradient(w * 0.5, h * 0.48, 0, w * 0.5, h * 0.48, Math.max(w, h) * 0.75);
      bgGrad.addColorStop(0, '#FCFBF8');
      bgGrad.addColorStop(0.65, '#F5F2EA');
      bgGrad.addColorStop(1, '#ECE6DA');
      pCtx.fillStyle = bgGrad;
      pCtx.fillRect(0, 0, w, h);

      // 2. Butiran serat kertas mikro halus (seamless procedural noise)
      const grainTile = document.createElement('canvas');
      grainTile.width = 256;
      grainTile.height = 256;
      const gCtx = grainTile.getContext('2d');

      const fineCount = 2400;
      for (let i = 0; i < fineCount; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const roll = Math.random();

        if (roll < 0.18) {
          // Serat kertas halus
          const len = Math.random() * 3.5 + 1.2;
          const angle = Math.random() * Math.PI;
          gCtx.strokeStyle = `rgba(115, 100, 80, ${(0.08 + Math.random() * 0.08).toFixed(3)})`;
          gCtx.lineWidth = 0.6;
          gCtx.beginPath();
          gCtx.moveTo(x, y);
          gCtx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
          gCtx.stroke();
        } else if (roll < 0.70) {
          // Butiran pasir hangat
          const rad = Math.random() * 0.8 + 0.3;
          gCtx.fillStyle = `rgba(135, 118, 95, ${(0.08 + Math.random() * 0.10).toFixed(3)})`;
          gCtx.beginPath();
          gCtx.arc(x, y, rad, 0, Math.PI * 2);
          gCtx.fill();
        } else {
          // Kilau kristal pasir kuarsa
          const rad = Math.random() * 0.7 + 0.3;
          gCtx.fillStyle = `rgba(255, 255, 255, ${(0.25 + Math.random() * 0.25).toFixed(2)})`;
          gCtx.beginPath();
          gCtx.arc(x, y, rad, 0, Math.PI * 2);
          gCtx.fill();
        }
      }

      const pattern = pCtx.createPattern(grainTile, 'repeat');
      if (pattern) {
        pCtx.fillStyle = pattern;
        pCtx.fillRect(0, 0, w, h);
      }

      // 3. Bayangan vinyet lembut di tepi bawah kertas
      const pageShadow = pCtx.createLinearGradient(0, h - 40, 0, h);
      pageShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
      pageShadow.addColorStop(1, 'rgba(0, 0, 0, 0.045)');
      pCtx.fillStyle = pageShadow;
      pCtx.fillRect(0, h - 40, w, 40);
    }

    /**
     * Menghapus goresan pada buffer jejak menggunakan destination-out
     */
    eraseStroke(x1, y1, x2, y2, eraserWidth = 26) {
      if (!this.trailCtx) return;

      const ctx = this.trailCtx;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'destination-out';

      // Lapisan bulu lembut di tepi luar
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = eraserWidth + 6;
      ctx.stroke();

      // Lapisan inti penghapus pekat
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
      ctx.lineWidth = eraserWidth;
      ctx.stroke();

      ctx.restore();
    }

    /**
     * Menggambar goresan pensil grafit otentik berlapis ke buffer jejak
     */
    drawPencilStroke(x1, y1, x2, y2, brushWidth) {
      if (!this.trailCtx) return;

      const ctx = this.trailCtx;
      const { r: cr, g: cg, b: cb } = this.primaryRgb;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Lapisan 1: Halo arsiran grafit di permukaan serat kertas
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.22)`;
      ctx.lineWidth = brushWidth + 2.5;
      ctx.stroke();

      // Lapisan 2: Badan pensil grafit lembut
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.78)`;
      ctx.lineWidth = brushWidth;
      ctx.stroke();

      // Lapisan 3: Inti ujung mata pensil pekat
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.94)`;
      ctx.lineWidth = Math.max(1.8, brushWidth * 0.55);
      ctx.stroke();

      // Lapisan 4: Debu grafit mikro alami
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const scatterCount = Math.floor(dist * 0.22);
      for (let i = 0; i < scatterCount; i++) {
        const t = Math.random();
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        const angle = Math.random() * Math.PI * 2;
        const offset = (brushWidth * 0.45) + Math.random() * 2.0;
        const sx = px + Math.cos(angle) * offset;
        const sy = py + Math.sin(angle) * offset;
        const rad = Math.random() * 0.6 + 0.25;

        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${(0.22 + Math.random() * 0.3).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    /**
     * Menyesuaikan ukuran buffer saat ukuran jendela berubah
     */
    handleResize(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr || this.dpr || 1;
      this.initTrailBuffer();
      this.renderPaperBackground();
    }

    /**
     * Render frame loop: menggambar kertas dan jejak tulisan dengan efek pemudaran santai
     */
    render(timestamp) {
      if (!this.isActive || !this.ctx || !this.width || !this.height) return;

      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      // 1. Gambar latar belakang kertas yang sudah di-cache (eksekusi sangat cepat)
      if (this.paperCanvas) {
        ctx.drawImage(this.paperCanvas, 0, 0, w, h);
      }

      // 2. Logika pemudaran jejak tulisan otomatis saat pengguna idle
      if (this.hasActiveTrail && this.trailCanvas) {
        const now = performance.now();
        const idleTime = now - this.lastStrokeTime;

        if (!this.isDrawing && idleTime > this.idleThresholdMs) {
          const refillElapsed = idleTime - this.idleThresholdMs;
          const progress = Math.min(1.0, refillElapsed / this.refillDurationMs);

          // Kurva pemudaran santai (Cosine Ease-in-out)
          this.trailAlpha = 0.5 * (1 + Math.cos(progress * Math.PI));

          if (progress >= 1.0) {
            // Bersihkan kanvas jejak setelah benar-benar memudar sempurna
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

        // Gambar jejak goresan pensil dengan opasitas aktif
        if (this.hasActiveTrail && this.trailAlpha > 0.001) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, this.trailAlpha));
          ctx.drawImage(this.trailCanvas, 0, 0, w, h);
          ctx.restore();
        }
      }
    }
  }

  // Ekspor singleton instance ke window
  window.MenulisEngine = new MenulisCanvasEngine();
})(window);
