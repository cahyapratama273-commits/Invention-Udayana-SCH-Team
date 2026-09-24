/**
 * RiakAudio.js — Audio Engine for Riak Sensory Experience
 * Manages sound effects, pitch variations, speed-based volume scaling, and mute state.
 */
(function (window) {
  'use strict';

  // Sound pools per theme
  const SOUND_POOLS = {
    air: [
      '/assets/Sound/for_water/273870__beskhu__water-drop-1.aiff',
      '/assets/Sound/for_water/450307__veromarengere__little-drop-of-water.wav',
      '/assets/Sound/for_water/530359__danielpodlovics__water.wav',
      '/assets/Sound/for_water/683102__florianreichelt__water-drop.mp3'
    ],
    angkasa: [
      '/assets/Sound/for_star/161322__chanhun__se_refresh.aiff',
      '/assets/Sound/for_star/511485__mlaudio__cartoon_wink_magic_sparkle.wav',
      '/assets/Sound/for_star/545238__mr_fritz__item-sparkle.wav',
      '/assets/Sound/for_star/63001__radian__chime-0024.wav'
    ]
  };

  class RiakAudioEngine {
    constructor() {
      this.currentTheme = localStorage.getItem('riak_tema') || 'air';
      this.isMuted = localStorage.getItem('riak_muted') === 'true';
      this.lastPlayTime = 0;
      this.minInterval = 55; // Throttle to prevent acoustic saturation on fast dragging
      this.audioCache = new Map();

      // Pre-warm audio elements
      this.preloadPools();
    }

    preloadPools() {
      const allFiles = new Set([...SOUND_POOLS.air, ...SOUND_POOLS.angkasa]);
      allFiles.forEach(src => {
        try {
          const audio = new Audio();
          audio.src = src;
          audio.preload = 'auto';
          this.audioCache.set(src, audio);
        } catch (e) {
          // Ignore early load errors
        }
      });
    }

    setTheme(theme) {
      if (SOUND_POOLS[theme]) {
        this.currentTheme = theme;
      }
    }

    setMuted(muted) {
      this.isMuted = !!muted;
      localStorage.setItem('riak_muted', this.isMuted ? 'true' : 'false');
    }

    toggleMute() {
      this.setMuted(!this.isMuted);
      return this.isMuted;
    }

    /**
     * Plays a ripple / sparkle sound effect.
     * @param {number} speed - Pointer speed (0 to 1+) to scale volume gently.
     */
    play(speed = 0.5) {
      if (this.isMuted) return;

      const now = performance.now();
      if (now - this.lastPlayTime < this.minInterval) return;
      this.lastPlayTime = now;

      const pool = SOUND_POOLS[this.currentTheme] || SOUND_POOLS.air;
      if (!pool || pool.length === 0) return;

      const randomIndex = Math.floor(Math.random() * pool.length);
      const soundSrc = pool[randomIndex];

      try {
        const audio = new Audio(soundSrc);

        // Random slight pitch variation: 0.9 to 1.1
        const pitchVariation = 0.9 + Math.random() * 0.2;
        audio.playbackRate = pitchVariation;

        // Subtle volume scaling: faster drag = slightly louder (0.15 to 0.45 max)
        const normalizedSpeed = Math.min(Math.max(speed, 0), 1.5);
        const calculatedVolume = 0.18 + normalizedSpeed * 0.18;
        audio.volume = Math.min(Math.max(calculatedVolume, 0.15), 0.45);

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay policies or user hasn't interacted yet
          });
        }
      } catch (err) {
        // Safe fallback
      }
    }
  }

  // Export to global window
  window.RiakAudio = new RiakAudioEngine();
})(window);
