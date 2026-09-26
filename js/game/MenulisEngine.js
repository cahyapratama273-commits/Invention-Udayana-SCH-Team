/**
 * MenulisEngine.js — Mesin Simulasi Sensorik Kertas & Pensil 2D Canvas Murni
 * 
 * Bagian dari "Ruang Sensorik" BerTeduh
 * 
 * Fitur Utama:
 * 1. Tekstur Kertas Berserat Alami ("Kertas Lembut"):
 *    - Membuat permukaan kertas sketsa off-white yang menenangkan secara prosedural.
 *    - Pola serat mikro, butiran pasir/kertas alami, dan pencahayaan vinyet lembut.
 *    - Dirender secara mulus melalui CanvasPattern untuk performa stabil di 60fps tanpa memory lag.
 * 2. Goresan Pensil Grafit Otentik ("Goresan Pensil"):
 *    - Goresan pensil berlapis realistis (halo arsiran lembut di serat kertas, inti pensil grafit pekat).
 *    - Ketebalan goresan beradaptasi dinamis mengikuti kecepatan gerak jari/mouse.
 *    - Debu grafit mikro di sepanjang jalur goresan pensil.
 *    - Menggunakan warna hitam grafit pensil (#1C1917) sebagai standar, dengan opsi warna pensil lain.
 * 3. Pembersihan Otomatis yang Menenangkan (Inactivity Fade):
 *    - Setelah ~2.8 detik tidak disentuh, goresan akan memudar perlahan selama ~9.5 detik,
 *      memberikan ruang tanpa batas untuk menulis jurnal & menyalurkan emosi tanpa henti.
 */
(function (window) {
  'use strict';

  class MenulisCanvasEngine {
    constructor() {
      this.canvas = null;               // Elemen kanvas HTML
      this.ctx = null;                  // 2D Rendering Context
      this.width = 0;                   // Lebar kanvas aktif
      this.height = 0;                  // Tinggi kanvas aktif
      this.dpr = 1;                     // Device Pixel Ratio untuk ketajaman retina display
      this.isActive = false;            // Status mode menulis aktif

      // Warna goresan (Default: Hitam Grafit Pensil #1C1917)
      this.primaryColor = '#1C1917';
      this.primaryRgb = { r: 28, g: 25, b: 23 };

      // Pola tekstur serat kertas offscreen
      this.grainPattern = null;
      this.grainCanvas = null;

      // Kanvas offscreen khusus untuk menampung goresan pensil
      this.trailCanvas = null;
      this.trailCtx = null;
      this.hasActiveTrail = false;
      this.trailAlpha = 1.0;            // Nilai transparansi goresan pensil (1.0 = penuh, 0 = hilang)

      // Pelacakan posisi kursor & goresan
      this.isDrawing = false;           // Status saat tombol mouse / sentuhan sedang ditekan
      this.lastX = 0;                   // Titik koordinat X terakhir
      this.lastY = 0;                   // Titik koordinat Y terakhir
      this.lastStrokeTime = 0;          // Waktu terakhir user membuat goresan (performance.now)

      // Alat aktif yang dipilih: 'pencil' (pensil) atau 'eraser' (penghapus)
      this.currentTool = 'pencil';

      // Parameter pemudaran otomatis saat idle
      this.idleThresholdMs = 2800;      // Tunggu 2.8 detik setelah sentuhan terakhir sebelum mulai memudar
      this.refillDurationMs = 9500;     // Durasi memudar perlahan selama ~9.5 detik
    }

    /**
     * Memilih alat aktif: 'pencil' atau 'eraser'
     */
    setTool(tool) {
      this.currentTool = tool === 'eraser' ? 'eraser' : 'pencil';
    }

    /**
     * Mengonversi kode warna Hex (#1C1917) ke objek RGB {r, g, b}
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
     * Mengatur warna pensil
     */
    setColor(colorHex) {
      this.primaryColor = colorHex;
      this.primaryRgb = this.hexToRgb(colorHex);
    }

    /**
     * Mengaktifkan mesin canvas mode menulis
     */
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

    /**
     * Menonaktifkan mode menulis dan membersihkan buffer memori
     */
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

    /**
     * Membersihkan seluruh goresan di kanvas secara langsung (Clear Canvas)
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
    }

    /**
     * Menyesuaikan ukuran buffer kanvas saat ukuran layar browser berubah
     */
    handleResize(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr || this.dpr || Math.min(window.devicePixelRatio || 1, 2);
      this.initTrailBuffer();
      this.generatePaperPattern();
    }

    /**
     * Menginisialisasi kanvas offscreen untuk merekam goresan pensil dengan ketajaman piksel tinggi
     */
    initTrailBuffer() {
      if (!this.width || !this.height) return;
      const w = Math.max(1, Math.floor(this.width));
      const h = Math.max(1, Math.floor(this.height));
      const dpr = this.dpr || Math.min(window.devicePixelRatio || 1, 2);
      const targetBufferW = Math.floor(w * dpr);
      const targetBufferH = Math.floor(h * dpr);

      // Simpan goresan lama jika sedang ada goresan saat resize
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
     * Membuat tekstur serat kertas dan butiran pasir secara prosedural (256x256 seamless pattern)
     * Lapisan 1: Butiran pasir & serat mikro halus dengan kontras jelas (alpha 0.08 - 0.18)
     * Lapisan 2: Butiran mineral & pasir kasar yang memberikan efek kedalaman 3D organik
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

      // ─── LAPISAN 1: Butiran Pasir Halus & Serat Mikro (2800 partikel) ───
      const fineCount = 2800;
      for (let i = 0; i < fineCount; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const roll = Math.random();

        if (roll < 0.15) {
          // Serat halus kertas / goresan pasir tipis
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
          // Butiran pasir hangat
          const rad = Math.random() * 0.85 + 0.35;
          const alpha = (0.09 + Math.random() * 0.12).toFixed(3);
          gCtx.fillStyle = `rgba(135, 118, 95, ${alpha})`;
          gCtx.beginPath();
          gCtx.arc(x, y, rad, 0, Math.PI * 2);
          gCtx.fill();
        } else {
          // Kilau mineral / kuarsa putih alami
          const rad = Math.random() * 0.75 + 0.3;
          const alpha = (0.35 + Math.random() * 0.35).toFixed(2);
          gCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          gCtx.beginPath();
          gCtx.arc(x, y, rad, 0, Math.PI * 2);
          gCtx.fill();
        }
      }

      // ─── LAPISAN 2: Butiran Pasir Kasar & Variasi Kedalaman (320 partikel) ───
      const coarseCount = 320;
      for (let i = 0; i < coarseCount; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const rad = Math.random() * 1.1 + 0.9;
        const isDark = Math.random() < 0.65;

        if (isDark) {
          // Butiran pasir gelap dengan bayangan mikro
          const alpha = (0.12 + Math.random() * 0.14).toFixed(3);
          gCtx.fillStyle = `rgba(105, 90, 72, ${alpha})`;
          gCtx.beginPath();
          gCtx.arc(x, y, rad, 0, Math.PI * 2);
          gCtx.fill();

          // Highlight offset halus untuk ilusi tekstur 3D timbul
          gCtx.fillStyle = `rgba(255, 255, 255, ${(0.18 + Math.random() * 0.15).toFixed(2)})`;
          gCtx.beginPath();
          gCtx.arc(x - 0.5, y - 0.5, rad * 0.6, 0, Math.PI * 2);
          gCtx.fill();
        } else {
          // Kilau kristal pasir terang
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

    /**
     * Menangani awal mula sentuhan jari / klik mouse di kanvas
     */
    handlePointerDown(x, y) {
      if (!this.isActive) return;
      this.isDrawing = true;
      this.lastX = x;
      this.lastY = y;
      this.lastStrokeTime = performance.now();
      this.trailAlpha = 1.0;
      this.hasActiveTrail = true;

      // Gambar titik awal goresan sesuai alat yang aktif
      if (this.currentTool === 'eraser') {
        this.eraseStroke(x, y, x + 0.1, y + 0.1, 24);
      } else {
        this.drawPencilStroke(x, y, x + 0.1, y + 0.1, 4.2);
      }
    }

    /**
     * Menangani pergerakan kursor saat sedang ditekan (membuat garis goresan)
     */
    handlePointerMove(x, y, dx, dy, dist, speed) {
      if (!this.isActive || !this.isDrawing) return;

      this.lastStrokeTime = performance.now();
      this.trailAlpha = 1.0;
      this.hasActiveTrail = true;

      if (this.currentTool === 'eraser') {
        // Diameter penghapus beradaptasi halus mengikuti kecepatan gerak (20px sampai 34px)
        const eraserWidth = Math.max(20, Math.min(34, 24 + speed * 1.4));
        this.eraseStroke(this.lastX, this.lastY, x, y, eraserWidth);
      } else {
        // Ketebalan pensil dinamis mengikuti kecepatan goresan (3.2px sampai 7.5px)
        const brushWidth = Math.max(3.2, Math.min(7.5, 4.2 + speed * 0.7));
        this.drawPencilStroke(this.lastX, this.lastY, x, y, brushWidth);
      }

      this.lastX = x;
      this.lastY = y;
    }

    /**
     * Menangani pelepasan sentuhan jari / klik mouse
     */
    handlePointerUp() {
      if (!this.isActive) return;
      this.isDrawing = false;
      this.lastStrokeTime = performance.now();
    }

    /**
     * Menghapus goresan grafit dari buffer offscreen menggunakan compositing destination-out
     */
    eraseStroke(x1, y1, x2, y2, eraserWidth = 24) {
      if (!this.trailCtx) return;

      const ctx = this.trailCtx;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'destination-out';

      // Lapisan 1: Bagian tepi penghapus yang lembut (soft feathering)
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = eraserWidth + 6;
      ctx.stroke();

      // Lapisan 2: Inti penghapus pekat
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
      ctx.lineWidth = eraserWidth;
      ctx.stroke();

      ctx.restore();
    }

    /**
     * Menggambar goresan pensil grafit otentik berlapis ke buffer offscreen
     */
    drawPencilStroke(x1, y1, x2, y2, brushWidth) {
      if (!this.trailCtx) return;

      const ctx = this.trailCtx;
      const { r: cr, g: cg, b: cb } = this.primaryRgb;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Lapisan 1: Halo arsiran grafit lembut di serat kertas
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.22)`;
      ctx.lineWidth = brushWidth + 2.5;
      ctx.stroke();

      // Lapisan 2: Badan utama goresan pensil
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.78)`;
      ctx.lineWidth = brushWidth;
      ctx.stroke();

      // Lapisan 3: Inti ujung pensil pekat
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.94)`;
      ctx.lineWidth = Math.max(1.8, brushWidth * 0.55);
      ctx.stroke();

      // Lapisan 4: Percikan debu grafit mikro di sepanjang jalur serat kertas
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
     * Merender seluruh adegan kanvas kertas dan goresan pensil
     */
    render(timestamp) {
      if (!this.isActive || !this.ctx || !this.width || !this.height) return;

      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      // 1. Gradasi warna latar belakang kertas sketsa off-white
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.48, 0, w * 0.5, h * 0.48, Math.max(w, h) * 0.75);
      bgGrad.addColorStop(0, '#FCFBF8');
      bgGrad.addColorStop(0.65, '#F5F2EA');
      bgGrad.addColorStop(1, '#ECE6DA');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Lapisi dengan pola tekstur serat kertas alami
      if (!this.grainPattern) {
        this.generatePaperPattern();
      }
      if (this.grainPattern) {
        ctx.save();
        ctx.fillStyle = this.grainPattern;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // 3. Efek vinyet bayangan lembut di bagian bawah kertas
      const pageShadow = ctx.createLinearGradient(0, h - 35, 0, h);
      pageShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
      pageShadow.addColorStop(1, 'rgba(0, 0, 0, 0.045)');
      ctx.fillStyle = pageShadow;
      ctx.fillRect(0, h - 35, w, 35);

      // 4. Proses pemudaran otomatis saat tidak ada aktivitas sentuhan (idle fade)
      if (this.hasActiveTrail && this.trailCanvas) {
        const now = performance.now();
        const idleTime = now - this.lastStrokeTime;

        if (!this.isDrawing && idleTime > this.idleThresholdMs) {
          const refillElapsed = idleTime - this.idleThresholdMs;
          const progress = Math.min(1.0, refillElapsed / this.refillDurationMs);

          // Rumus pemudaran halus (Cosine Ease-in-out)
          this.trailAlpha = 0.5 * (1 + Math.cos(progress * Math.PI));

          if (progress >= 1.0) {
            // Setelah selesai memudar sempurna, bersihkan buffer goresan
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

        // 5. Gambar goresan pensil di atas kanvas kertas dengan tingkat transparansi saat ini
        if (this.hasActiveTrail && this.trailAlpha > 0.001) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, this.trailAlpha));
          ctx.drawImage(this.trailCanvas, 0, 0, w, h);
          ctx.restore();
        }
      }
    }
  }

  // Ekspor singleton instance ke objek global window
  window.MenulisEngine = new MenulisCanvasEngine();
})(window);
