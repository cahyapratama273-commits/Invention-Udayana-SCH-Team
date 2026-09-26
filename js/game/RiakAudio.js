/**
 * RiakAudio.js — Audio Engine for Riak Sensory Experience
 * Manages sound effects, pitch variations, speed-based volume scaling, and mute state.
 */
(function (window) {
  'use strict';

  // Streamlined sound architecture for Water, Angkasa, and Menulis
  const WATER_SOUNDS = {
    click: '/assets/Sound/for_water/Tap-Water.wav',  // Crisp water tap
    drag:  '/assets/Sound/for_water/Drag-Water.wav'   // Gentle water flow
  };

  const ANGKASA_SOUNDS = {
    click: '/assets/Sound/for_star/511485__mlaudio__cartoon_wink_magic_sparkle.wav',
    drag: [
      '/assets/Sound/for_star/511485__mlaudio__cartoon_wink_magic_sparkle.wav',
      // '/assets/Sound/for_star/545238__mr_fritz__item-sparkle.wav'
    ]
  };

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
      this.dragInterval = 90; // Natural throttle for drag audio
      this.audioCache = new Map();

      // ── Web Audio API: pencil & eraser looping ──────────────────────────
      this._audioCtx      = null;  // AudioContext (lazy init)
      this._pencilBuf     = null;  // AudioBuffer for Normal-drags.wav
      this._eraserBuf     = null;  // AudioBuffer for Slow-drags.wav
      this._pencilNode    = null;  // BufferSourceNode aktif
      this._pencilGain    = null;  // GainNode untuk volume
      this._pencilLoaded  = false;
      this._pencilFailed  = false;
      this._pencilPlaying = false;
      this._currentPlayingTool = null; // 'pencil' atau 'eraser'

      // Pre-warm audio elements
      this.preloadPools();
    }

    /** Lazily create AudioContext (harus setelah user gesture) */
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

    /** Decode Normal-drags.wav & Slow-drags.wav ke AudioBuffer sekali */
    _loadMenulisBuffers() {
      if (this._pencilLoaded || this._pencilFailed) return;
      this._pencilLoaded = true;

      const ctx = this._getCtx();
      if (!ctx) return;

      // Load Normal-drags.wav for pencil
      fetch(MENULIS_SOUNDS.pencil)
        .then(r => { if (!r.ok) throw new Error('pencil sound fetch failed'); return r.arrayBuffer(); })
        .then(ab => ctx.decodeAudioData(ab))
        .then(buf => { this._pencilBuf = buf; })
        .catch(() => { this._pencilFailed = true; });

      // Load Slow-drags.wav for eraser
      fetch(MENULIS_SOUNDS.eraser)
        .then(r => { if (!r.ok) throw new Error('eraser sound fetch failed'); return r.arrayBuffer(); })
        .then(ab => ctx.decodeAudioData(ab))
        .then(buf => { this._eraserBuf = buf; })
        .catch(() => {});
    }

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

    setTheme(theme) {
      if (theme !== 'menulis') {
        this.stopPencilSound();
      }
      this.currentTheme = theme;
    }

    setMuted(muted) {
      this.isMuted = !!muted;
      localStorage.setItem('riak_muted', this.isMuted ? 'true' : 'false');
      if (this.isMuted) {
        this.stopPencilSound();
      }
    }

    toggleMute() {
      this.setMuted(!this.isMuted);
      return this.isMuted;
    }

    /**
     * Mainkan loop suara pensil atau penghapus menggunakan Web Audio API
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

      // Jika berpindah tool saat sedang playing, stop dulu node lama
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

    /** Atur volume & playback rate sesuai tool dan kecepatan */
    _applyPencilParams(speed, isEraser = false) {
      if (!this._pencilGain || !this._pencilNode) return;
      const norm = Math.min(Math.max(speed, 0.2), 2.0);
      if (isEraser) {
        this._pencilGain.gain.setTargetAtTime(
          Math.min(Math.max(0.10 + norm * 0.12, 0.08), 0.36),
          this._audioCtx.currentTime, 0.05
        );
        this._pencilNode.playbackRate.setTargetAtTime(
          0.75 + Math.min(norm * 0.1, 0.16),
          this._audioCtx.currentTime, 0.05
        );
      } else {
        this._pencilGain.gain.setTargetAtTime(
          Math.min(Math.max(0.12 + norm * 0.16, 0.12), 0.50),
          this._audioCtx.currentTime, 0.05
        );
        this._pencilNode.playbackRate.setTargetAtTime(
          0.95 + Math.min(norm * 0.15, 0.25),
          this._audioCtx.currentTime, 0.05
        );
      }
    }

    /** Update volume/rate saat pointer bergerak */
    updatePencilSound(speed = 0.5) {
      if (this.isMuted || !this._pencilPlaying) return;
      this._applyPencilParams(speed, false);
    }

    /** Mulai suara penghapus (lebih pelan, pitch lebih rendah) */
    startEraserSound(speed = 0.5) {
      this.startPencilSound(speed, true);
    }

    /** Update volume/rate penghapus */
    updateEraserSound(speed = 0.5) {
      if (this.isMuted || !this._pencilPlaying) return;
      this._applyPencilParams(speed, true);
    }

    /** Hentikan loop pensil/penghapus dengan fade-out singkat */
    stopPencilSound() {
      if (!this._pencilPlaying) return;
      try {
        const ctx = this._audioCtx;
        if (ctx && this._pencilGain) {
          // Fade out dalam 80ms agar tidak putus tiba-tiba
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
     * Plays click/tap sound effect:
     * - Air theme: Single crisp water droplet drop
     * - Angkasa theme: Sparkle chime
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
        // Subtle pitch nuance for natural organic feeling
        audio.playbackRate = 0.96 + Math.random() * 0.08;
        audio.volume = Math.min(Math.max(0.28 + (speed || 0.5) * 0.12, 0.2), 0.45);
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch (err) {}
    }

    /**
     * Plays dragging wake/ripple sound effect:
     * - Air theme: Continuous gentle flowing water wake
     * - Angkasa theme: Cosmic stardust shimmer
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
        audio.volume = Math.min(Math.max(0.14 + normSpeed * 0.16, 0.12), 0.42);
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch (err) {}
    }

    /**
     * General play method (backward-compatible fallback)
     */
    play(speed = 0.5) {
      this.playDrag(speed);
    }
  }

  // Export to global window
  window.RiakAudio = new RiakAudioEngine();
})(window);
