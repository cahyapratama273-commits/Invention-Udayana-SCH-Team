/**
 * RiakUI.js — UI Controller for Riak Sensory Experience
 * Manages theme switching, native color picker, motion-sensitivity warning,
 * audio mute toggling, interaction hints, and localStorage state persistence.
 */
(function (window) {
  'use strict';

  // Default color fallbacks per theme (used when user hasn't chosen a custom color)
  const THEME_DEFAULTS = {
    air: '#38BDF8',     // Bright, realistic water blue
    angkasa: '#C084FC'  // Deep cosmic purple
  };

  class RiakUIController {
    constructor() {
      // Stored or default preferences
      this.currentTheme = localStorage.getItem('riak_tema') || 'air';

      const savedColor = localStorage.getItem('riak_warna');
      this.hasCustomColor = savedColor !== null;
      this.currentColor = savedColor || THEME_DEFAULTS[this.currentTheme] || '#38BDF8';

      this.isMuted = localStorage.getItem('riak_muted') === 'true';
      this.hintDismissed = localStorage.getItem('riak_hint_dismissed') === 'true';
      this.warningDismissed = localStorage.getItem('riak_warning_dismissed') === 'true';
    }

    async init() {
      if (typeof loadNavigasi === 'function') {
        try { await loadNavigasi(); } catch(e) {
          console.error('Failed to load navbar:', e);
        }
      }

      const canvasEl = document.getElementById('riak-canvas');
      const wrapperEl = document.getElementById('riak-experience-wrapper');

      if (!canvasEl || !wrapperEl) return;

      // Initialize Engine & Audio
      if (window.RiakEngine) {
        window.RiakEngine.init(canvasEl);
        window.RiakEngine.setTheme(this.currentTheme);
        window.RiakEngine.setColor(this.currentColor);

        window.RiakEngine.onFirstInteraction = () => {
          this.dismissHint();
        };
      }

      if (window.RiakAudio) {
        window.RiakAudio.setTheme(this.currentTheme);
        window.RiakAudio.setMuted(this.isMuted);
      }

      // Apply initial theme background class
      this.updateThemeBackground();

      // Render controls and banners
      this.bindThemeToggle();
      this.bindColorPicker();
      this.bindMuteButton();
      this.initHint();
      this.initMotionWarning();
    }

    updateThemeBackground() {
      const wrapper = document.getElementById('riak-experience-wrapper');
      if (!wrapper) return;
      wrapper.classList.remove('riak-theme-air', 'riak-theme-angkasa');
      wrapper.classList.add(this.currentTheme === 'angkasa' ? 'riak-theme-angkasa' : 'riak-theme-air');
    }

    bindThemeToggle() {
      const btnAir = document.getElementById('riak-theme-air-btn');
      const btnAngkasa = document.getElementById('riak-theme-angkasa-btn');

      const updateButtons = () => {
        if (btnAir && btnAngkasa) {
          if (this.currentTheme === 'air') {
            btnAir.classList.add('active');
            btnAngkasa.classList.remove('active');
          } else {
            btnAir.classList.remove('active');
            btnAngkasa.classList.add('active');
          }
        }
      };

      if (btnAir) {
        btnAir.addEventListener('click', () => {
          if (this.currentTheme !== 'air') {
            this.setTheme('air');
            updateButtons();
          }
        });
      }

      if (btnAngkasa) {
        btnAngkasa.addEventListener('click', () => {
          if (this.currentTheme !== 'angkasa') {
            this.setTheme('angkasa');
            updateButtons();
          }
        });
      }

      updateButtons();
    }

    setTheme(theme) {
      this.currentTheme = theme;
      localStorage.setItem('riak_tema', theme);

      // If user hasn't explicitly saved a custom color, adapt to theme default
      if (!this.hasCustomColor) {
        const defaultColor = THEME_DEFAULTS[theme] || '#38BDF8';
        this.setColor(defaultColor, false);
      }

      this.updateThemeBackground();
      this.updateMotionWarningVisibility();

      if (window.RiakEngine) {
        window.RiakEngine.setTheme(theme);
        window.RiakEngine.setColor(this.currentColor);
      }

      if (window.RiakAudio) {
        window.RiakAudio.setTheme(theme);
      }
    }

    bindColorPicker() {
      const colorInput = document.getElementById('riak-color-input');
      const colorPreview = document.getElementById('riak-color-preview');

      if (colorInput) {
        colorInput.value = this.currentColor;
        if (colorPreview) {
          colorPreview.style.backgroundColor = this.currentColor;
        }

        const handleColorChange = (e) => {
          const newHex = e.target.value;
          this.setColor(newHex, true);
        };

        colorInput.addEventListener('input', handleColorChange);
        colorInput.addEventListener('change', handleColorChange);
      }
    }

    setColor(colorHex, isExplicitUserAction = true) {
      this.currentColor = colorHex;

      if (isExplicitUserAction) {
        this.hasCustomColor = true;
        localStorage.setItem('riak_warna', colorHex);
      }

      if (window.RiakEngine) {
        window.RiakEngine.setColor(colorHex);
      }

      const preview = document.getElementById('riak-color-preview');
      if (preview) {
        preview.style.backgroundColor = colorHex;
      }

      const colorInput = document.getElementById('riak-color-input');
      if (colorInput && colorInput.value.toLowerCase() !== colorHex.toLowerCase()) {
        colorInput.value = colorHex;
      }
    }

    bindMuteButton() {
      const muteBtn = document.getElementById('riak-mute-btn');
      const iconOn = document.getElementById('riak-icon-sound-on');
      const iconOff = document.getElementById('riak-icon-sound-off');

      const updateMuteUI = () => {
        if (iconOn && iconOff) {
          if (this.isMuted) {
            iconOn.classList.add('hidden');
            iconOff.classList.remove('hidden');
          } else {
            iconOn.classList.remove('hidden');
            iconOff.classList.add('hidden');
          }
        }
      };

      if (muteBtn) {
        muteBtn.addEventListener('click', () => {
          this.isMuted = !this.isMuted;
          if (window.RiakAudio) {
            window.RiakAudio.setMuted(this.isMuted);
          }
          updateMuteUI();
        });
      }

      updateMuteUI();
    }

    initHint() {
      const hintEl = document.getElementById('riak-hint');
      if (!hintEl) return;

      if (this.hintDismissed) {
        hintEl.remove();
      }
    }

    dismissHint() {
      const hintEl = document.getElementById('riak-hint');
      if (hintEl && !this.hintDismissed) {
        this.hintDismissed = true;
        localStorage.setItem('riak_hint_dismissed', 'true');
        hintEl.classList.add('faded');
        setTimeout(() => hintEl.remove(), 1000);
      }
    }

    /**
     * Motion Sensitivity Warning Banner Management (Air Theme only)
     */
    initMotionWarning() {
      const warningEl = document.getElementById('riak-motion-warning');
      const dismissBtn = document.getElementById('riak-warning-dismiss-btn');
      if (!warningEl) return;

      if (this.warningDismissed) {
        warningEl.classList.add('hidden');
        return;
      }

      this.updateMotionWarningVisibility();

      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          this.dismissMotionWarning();
        });
      }
    }

    updateMotionWarningVisibility() {
      const warningEl = document.getElementById('riak-motion-warning');
      if (!warningEl) return;

      if (this.warningDismissed) {
        warningEl.classList.add('hidden');
        return;
      }

      if (this.currentTheme === 'air') {
        warningEl.classList.remove('hidden', 'opacity-0');
      } else {
        warningEl.classList.add('hidden');
      }
    }

    dismissMotionWarning() {
      const warningEl = document.getElementById('riak-motion-warning');
      if (!warningEl || this.warningDismissed) return;

      this.warningDismissed = true;
      localStorage.setItem('riak_warning_dismissed', 'true');

      warningEl.classList.add('opacity-0');
      setTimeout(() => {
        warningEl.classList.add('hidden');
      }, 320);
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    window.RiakUI = new RiakUIController();
    window.RiakUI.init();
  });
})(window);
