/**
 * RiakAudio.js — Mesin Efek Suara (Audio Engine) Ruang Sensorik BerTeduh
 * 
 * Modul ini mengatur:
 * 1. Efek Suara Air (Tap Tetesan & Seretan Riak Air Mengalir).
 * 2. Efek Suara Angkasa (Dentang Bintang & Gemerlap Debu Kosmik).
 * 3. Efek Suara Menulis & Menghapus (Looping Web Audio API untuk suara pensil dan penghapus).
 * 4. Penskalaan Volume & Pitch: volume dan nada suara beradaptasi dinamis mengikuti kecepatan goresan tangan.
 * 5. Fitur Bisu (Mute State) yang tersimpan di localStorage.
 */
(function (window) {
  'use strict';

  // Daftar file audio untuk tema Riak Air
  const WATER_SOUNDS = {
    click: '/assets/Sound/for_water/Tap-Water.wav',  // Suara ketukan tetesan air
    drag:  '/assets/Sound/for_water/Drag-Water.wav'   // Suara aliran air lembut
  };

  // Daftar file audio untuk tema Angkasa
  const ANGKASA_SOUNDS = {
    click: '/assets/Sound/for_star/511485__mlaudio__cartoon_wink_magic_sparkle.wav',
    drag: [
      '/assets/Sound/for_star/511485__mlaudio__cartoon_wink_magic_sparkle.wav'
    ]
  };

  // Daftar file audio untuk tema Menulis
  const MENULIS_SOUNDS = {
    pencil: '/assets/Sound/for_pencil/Normal-drags.wav',
    eraser: '/assets/Sound/for_pencil/Normal-drags.wav'
  };

  class RiakAudioEngine {
    constructor() {
      this.currentTheme = localStorage.getItem('riak_tema') || 'air';
      this.isMuted = localStorage.getItem('riak_muted') === 'true';
      this.lastClickTime = 0;
      this.lastDragTime = 0;
      this.dragInterval = 90; // Jeda minimal (throttling 90ms) agar suara aliran tidak bertumpuk bising
      this.audioCache = new Map();

      // ─── WEB AUDIO API: Looping Mulus Suara Pensil & Penghapus ───
      this._audioCtx      = null;  // Objek AudioContext (dibuat saat interaksi pertama)
      this._pencilBuf     = null;  // Buffer memori audio untuk suara pensil
      this._eraserBuf     = null;  // Buffer memori audio untuk suara penghapus
      this._pencilNode    = null;  // BufferSourceNode aktif
      this._pencilGain    = null;  // GainNode pengatur volume suara
      this._pencilLoaded  = false;
      this._pencilFailed  = false;
      this._pencilPlaying = false;
      this._currentPlayingTool = null; // 'pencil' atau 'eraser'

      // Pre-load file audio ke cache memori browser
      this.preloadPools();
    }

    /**
     * Membuat instance AudioContext secara lazy (hanya setelah user menyentuh layar / klik)
     */
    _getCtx() {
      if (!this._audioCtx) {
        try {
          this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
          this._pencilFailed = true;
        }
      }
      return this._audioCtx;
    }

    /**
     * Mengunduh dan men-decode file audio pensil & penghapus ke AudioBuffer sekali saja
     */
    _loadMenulisBuffers() {
      if (this._pencilLoaded || this._pencilFailed) return;
      this._pencilLoaded = true;

      const ctx = this._getCtx();
      if (!ctx) return;

      // Unduh dan decode audio suara pensil
      fetch(MENULIS_SOUNDS.pencil)
        .then(r => { if (!r.ok) throw new Error('Gagal mengambil audio pensil'); return r.arrayBuffer(); })
        .then(ab => ctx.decodeAudioData(ab))
        .then(buf => { this._pencilBuf = buf; })
        .catch(() => { this._pencilFailed = true; });

      // Unduh dan decode audio suara penghapus
      fetch(MENULIS_SOUNDS.eraser)
        .then(r => { if (!r.ok) throw new Error('Gagal mengambil audio penghapus'); return r.arrayBuffer(); })
        .then(ab => ctx.decodeAudioData(ab))
        .then(buf => { this._eraserBuf = buf; })
        .catch(() => {});
    }

    /**
     * Memanaskan pool audio elemen HTML Audio untuk responsivitas instan tanpa latency
     */
    preloadPools() {
      const allFiles = new Set([
        WATER_SOUNDS.click,
        WATER_SOUNDS.drag,
        ANGKASA_SOUNDS.click,
        ...ANGKASA_SOUNDS.drag
      ]);
      allFiles.forEach(src => {
        try {
          const audio = new Audio();
          audio.src = src;
          audio.preload = 'auto';
          this.audioCache.set(src, audio);
        } catch (e) {}
      });
    }

    /**
     * Mengatur tema suara aktif
     */
    setTheme(theme) {
      if (theme !== 'menulis') {
        this.stopPencilSound();
      }
      this.currentTheme = theme;
    }

    /**
     * Mengatur status bisu (mute) dan menyimpannya di localStorage
     */
    setMuted(muted) {
      this.isMuted = !!muted;
      localStorage.setItem('riak_muted', this.isMuted ? 'true' : 'false');
      if (this.isMuted) {
        this.stopPencilSound();
      }
    }

    /**
     * Toggle status bisu on/off
     */
    toggleMute() {
      this.setMuted(!this.isMuted);
      return this.isMuted;
    }

    /**
     * Memulai loop suara goresan pensil atau gesekan penghapus menggunakan Web Audio API
     */
    startPencilSound(speed = 0.5, isEraser = false) {
      if (this.isMuted) return;

      const ctx = this._getCtx();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      if (!this._pencilLoaded) {
        this._loadMenulisBuffers();
        return;
      }

      const activeTool = isEraser ? 'eraser' : 'pencil';
      const targetBuf = (isEraser && this._eraserBuf) ? this._eraserBuf : this._pencilBuf;

      if (this._pencilFailed || !targetBuf) return;

      if (this._pencilPlaying && this._currentPlayingTool === activeTool) {
        this._applyPencilParams(speed, isEraser);
        return;
      }

      // Jika berpindah tool saat audio sedang berputar, hentikan node audio lama terlebih dahulu
      if (this._pencilPlaying) {
        this.stopPencilSound();
      }

      try {
        this._pencilGain = ctx.createGain();
        this._pencilGain.connect(ctx.destination);

        this._pencilNode = ctx.createBufferSource();
        this._pencilNode.buffer = targetBuf;
        this._pencilNode.loop   = true;
        this._pencilNode.connect(this._pencilGain);

        this._applyPencilParams(speed, isEraser);

        this._pencilNode.start(0);
        this._pencilPlaying = true;
        this._currentPlayingTool = activeTool;

        this._pencilNode.onended = () => {
          this._pencilPlaying = false;
          this._currentPlayingTool = null;
        };
      } catch (err) {
        this._pencilFailed = true;
      }
    }

    /**
     * Menyesuaikan volume dan kecepatan putar (playbackRate) sesuai kecepatan gesekan kursor.
     * Volume dioptimalkan agar terdengar jelas, jernih, dan tidak bising.
     */
    _applyPencilParams(speed, isEraser = false) {
      if (!this._pencilGain || !this._pencilNode) return;
      const norm = Math.min(Math.max(speed, 0.2), 2.0);
      if (isEraser) {
        // Suara penghapus: volume ditingkatkan ke rentang 0.25 - 0.68 dengan nada lebih rendah
        this._pencilGain.gain.setTargetAtTime(
          Math.min(Math.max(0.28 + norm * 0.22, 0.25), 0.68),
          this._audioCtx.currentTime, 0.05
        );
        this._pencilNode.playbackRate.setTargetAtTime(
          0.75 + Math.min(norm * 0.1, 0.16),
          this._audioCtx.currentTime, 0.05
        );
      } else {
        // Suara pensil: volume ditingkatkan ke rentang 0.30 - 0.85 dengan tekstur renyah
        this._pencilGain.gain.setTargetAtTime(
          Math.min(Math.max(0.35 + norm * 0.28, 0.30), 0.85),
          this._audioCtx.currentTime, 0.05
        );
        this._pencilNode.playbackRate.setTargetAtTime(
          0.95 + Math.min(norm * 0.15, 0.25),
          this._audioCtx.currentTime, 0.05
        );
      }
    }

    /**
     * Memperbarui volume dan nada suara pensil saat kursor bergerak
     */
    updatePencilSound(speed = 0.5) {
      if (this.isMuted || !this._pencilPlaying) return;
      this._applyPencilParams(speed, false);
    }

    /**
     * Memulai suara penghapus
     */
    startEraserSound(speed = 0.5) {
      this.startPencilSound(speed, true);
    }

    /**
     * Memperbarui suara penghapus saat digosokkan
     */
    updateEraserSound(speed = 0.5) {
      if (this.isMuted || !this._pencilPlaying) return;
      this._applyPencilParams(speed, true);
    }

    /**
     * Menghentikan suara pensil / penghapus dengan efek fade-out halus agar tidak terputus kasar
     */
    stopPencilSound() {
      if (!this._pencilPlaying) return;
      try {
        const ctx = this._audioCtx;
        if (ctx && this._pencilGain) {
          // Fade-out cepat dalam 80ms
          this._pencilGain.gain.setTargetAtTime(0, ctx.currentTime, 0.025);
          const node = this._pencilNode;
          setTimeout(() => {
            try { node && node.stop(); } catch (e) {}
          }, 120);
        } else if (this._pencilNode) {
          this._pencilNode.stop();
        }
      } catch (err) {}
      this._pencilPlaying = false;
      this._currentPlayingTool = null;
      this._pencilNode = null;
      this._pencilGain = null;
    }

    /**
     * Memainkan efek suara ketukan / klik tunggal:
     * - Tema Air: Tetesan air jernih
     * - Tema Angkasa: Dentang lonceng bintang kosmik
     * Volume dioptimalkan ke rentang 0.50 - 0.95 agar jelas terdengar.
     */
    playClick(speed = 0.5) {
      if (this.isMuted) return;
      if (this.currentTheme === 'menulis') return;

      const now = performance.now();
      if (now - this.lastClickTime < 60) return;
      this.lastClickTime = now;

      let soundSrc = null;
      if (this.currentTheme === 'air') {
        soundSrc = WATER_SOUNDS.click;
      } else if (this.currentTheme === 'angkasa') {
        soundSrc = ANGKASA_SOUNDS.click;
      }

      if (!soundSrc) return;

      try {
        const audio = new Audio(soundSrc);
        // Variasi pitch acak mikro agar terdengar organik dan tidak kaku
        audio.playbackRate = 0.96 + Math.random() * 0.08;
        audio.volume = Math.min(Math.max(0.65 + (speed || 0.5) * 0.20, 0.50), 0.95);
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch (err) {}
    }

    /**
     * Memainkan efek suara seretan / riak yang mengalir:
     * - Tema Air: Aliran riak air mengalir
     * - Tema Angkasa: Gemerlap debu bintang galaksi
     * Volume ditingkatkan ke rentang 0.38 - 0.85 agar terdengar mengalir lembut dan nyata.
     */
    playDrag(speed = 0.5) {
      if (this.isMuted) return;
      if (this.currentTheme === 'menulis') return;

      const now = performance.now();
      if (now - this.lastDragTime < this.dragInterval) return;
      this.lastDragTime = now;

      let soundSrc = null;
      if (this.currentTheme === 'air') {
        soundSrc = WATER_SOUNDS.drag;
      } else if (this.currentTheme === 'angkasa') {
        const pool = ANGKASA_SOUNDS.drag;
        soundSrc = pool[Math.floor(Math.random() * pool.length)];
      }

      if (!soundSrc) return;

      try {
        const audio = new Audio(soundSrc);
        const normSpeed = Math.min(Math.max(speed, 0.1), 1.6);
        audio.playbackRate = 0.92 + Math.random() * 0.16;
        audio.volume = Math.min(Math.max(0.48 + normSpeed * 0.25, 0.38), 0.85);
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch (err) {}
    }

    /**
     * Fallback metode pemanggilan umum
     */
    play(speed = 0.5) {
      this.playDrag(speed);
    }
  }

  // Ekspor instance ke objek global window
  window.RiakAudio = new RiakAudioEngine();
})(window);
