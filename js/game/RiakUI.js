/**
 * RiakUI.js — UI Controller for Ruang Sensorik (Sensory Experience)
 * 
 * Manages:
 * 1. Mode Switching: Air (Water Ripple) | Angkasa (Stardust Field) | Menulis (Sand Writing)
 * 2. Color Picker: Dual desktop and mobile synchronized controls
 * 3. Audio Mute: Ambient sound / pencil SFX mute toggle
 * 4. Mobile Draggable Floating Menu Button (FAB):
 *    - Touch-draggable anywhere within viewport bounds
 *    - Distinguishes clean TAP (toggles popover) vs DRAG (repositions button)
 *    - Persists session position across interactions via sessionStorage
 *    - Clamps to safe screen boundaries (never off-screen or behind nav)
 * 5. Interaction Hint: Subtle first-touch overlay
 */
(function (window) {
  'use strict';

  // Default color fallbacks per theme (used when user hasn't chosen a custom color)
  const THEME_DEFAULTS = {
    air: '#38BDF8',     // Bright water blue
    angkasa: '#C084FC', // Deep cosmic purple
    menulis: '#1C1917'  // Graphite pencil black
  };

  class RiakUIController {
    constructor() {
      // Stored or default preferences
      this.currentTheme = localStorage.getItem('riak_tema') || 'air';

      const savedColor = localStorage.getItem('riak_warna');
      this.hasCustomColor = savedColor !== null;
      
      if (this.currentTheme === 'menulis') {
        const savedMenulisColor = localStorage.getItem('riak_warna_menulis');
        this.currentColor = savedMenulisColor || '#1C1917';
      } else {
        this.currentColor = savedColor || THEME_DEFAULTS[this.currentTheme] || '#38BDF8';
      }

      this.isMuted = localStorage.getItem('riak_muted') === 'true';
      this.hintDismissed = localStorage.getItem('riak_hint_dismissed') === 'true';

      // Mobile FAB state
      this.fabEl = null;
      this.fabContainer = null;
      this.popoverEl = null;
      this.isPopoverOpen = false;

      // Menulis active tool: 'pencil' | 'eraser'
      this.currentMenulisTool = 'pencil';

      // Zoom level state (0.25 to 1.00)
      const savedZoom = sessionStorage.getItem('riak_zoom_level');
      this.zoomLevel = savedZoom ? Math.min(1.0, Math.max(0.25, parseFloat(savedZoom))) : 1.0;
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

      // Initialize Engines & Audio
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

      // Render desktop and mobile controls
      this.bindThemeToggle();
      this.bindMenulisTools();
      this.bindColorPicker();
      this.bindMuteButton();
      this.bindZoomControls();
      this.initMobileFab();
      this.initHint();
      this.initNavbarAutoHide();
      this.updateMenulisToolsVisibility();
      this.applyZoom(this.zoomLevel, false);
    }

    updateThemeBackground() {
      const wrapper = document.getElementById('riak-experience-wrapper');
      if (!wrapper) return;
      wrapper.classList.remove('riak-theme-air', 'riak-theme-angkasa', 'riak-theme-menulis');

      if (this.currentTheme === 'angkasa') {
        wrapper.classList.add('riak-theme-angkasa');
      } else if (this.currentTheme === 'menulis') {
        wrapper.classList.add('riak-theme-menulis');
      } else {
        wrapper.classList.add('riak-theme-air');
      }
    }

    bindThemeToggle() {
      // Desktop theme buttons
      const btnAir = document.getElementById('riak-theme-air-btn');
      const btnAngkasa = document.getElementById('riak-theme-angkasa-btn');
      const btnMenulis = document.getElementById('riak-theme-menulis-btn');

      // Mobile popover theme buttons
      const mBtnAir = document.getElementById('riak-mobile-theme-air-btn');
      const mBtnAngkasa = document.getElementById('riak-mobile-theme-angkasa-btn');
      const mBtnMenulis = document.getElementById('riak-mobile-theme-menulis-btn');

      const allButtons = [
        { theme: 'air', btns: [btnAir, mBtnAir] },
        { theme: 'angkasa', btns: [btnAngkasa, mBtnAngkasa] },
        { theme: 'menulis', btns: [btnMenulis, mBtnMenulis] }
      ];

      const updateButtons = () => {
        allButtons.forEach(group => {
          const isActive = this.currentTheme === group.theme;
          group.btns.forEach(b => {
            if (b) {
              if (isActive) b.classList.add('active');
              else b.classList.remove('active');
            }
          });
        });
      };

      allButtons.forEach(group => {
        group.btns.forEach(b => {
          if (b) {
            b.addEventListener('click', () => {
              if (this.currentTheme !== group.theme) {
                this.setTheme(group.theme);
                updateButtons();
              }
            });
          }
        });
      });

      updateButtons();
    }

    setTheme(theme) {
      this.currentTheme = theme;
      localStorage.setItem('riak_tema', theme);

      // When switching to menulis, ensure graphite pencil black is selected by default
      const defaultColor = THEME_DEFAULTS[theme] || '#38BDF8';
      if (theme === 'menulis') {
        const savedMenulisColor = localStorage.getItem('riak_warna_menulis');
        this.setColor(savedMenulisColor || defaultColor, false);
      } else {
        const savedThemeColor = localStorage.getItem(`riak_warna_${theme}`);
        this.setColor(savedThemeColor || (!this.hasCustomColor ? defaultColor : this.currentColor), false);
      }

      this.updateThemeBackground();
      this.updateMenulisToolsVisibility();

      if (window.RiakEngine) {
        window.RiakEngine.setTheme(theme);
        window.RiakEngine.setColor(this.currentColor);
      }

      if (window.RiakAudio) {
        window.RiakAudio.setTheme(theme);
      }
    }

    bindMenulisTools() {
      const pBtn = document.getElementById('riak-tool-pencil-btn');
      const eBtn = document.getElementById('riak-tool-eraser-btn');
      const cBtn = document.getElementById('riak-tool-clear-btn');
      const mpBtn = document.getElementById('riak-mobile-tool-pencil-btn');
      const meBtn = document.getElementById('riak-mobile-tool-eraser-btn');
      const mcBtn = document.getElementById('riak-mobile-tool-clear-btn');

      if (pBtn) pBtn.addEventListener('click', () => this.setMenulisTool('pencil'));
      if (eBtn) eBtn.addEventListener('click', () => this.setMenulisTool('eraser'));
      if (cBtn) cBtn.addEventListener('click', () => this.clearMenulisCanvas());
      if (mpBtn) mpBtn.addEventListener('click', () => this.setMenulisTool('pencil'));
      if (meBtn) meBtn.addEventListener('click', () => this.setMenulisTool('eraser'));
      if (mcBtn) mcBtn.addEventListener('click', () => this.clearMenulisCanvas());
    }

    clearMenulisCanvas() {
      if (window.RiakEngine && typeof window.RiakEngine.clearMenulisCanvas === 'function') {
        window.RiakEngine.clearMenulisCanvas();
      }
    }

    setMenulisTool(tool) {
      this.currentMenulisTool = tool === 'eraser' ? 'eraser' : 'pencil';

      if (window.RiakEngine && typeof window.RiakEngine.setMenulisTool === 'function') {
        window.RiakEngine.setMenulisTool(this.currentMenulisTool);
      }

      const pBtn = document.getElementById('riak-tool-pencil-btn');
      const eBtn = document.getElementById('riak-tool-eraser-btn');
      const mpBtn = document.getElementById('riak-mobile-tool-pencil-btn');
      const meBtn = document.getElementById('riak-mobile-tool-eraser-btn');

      const isPencil = this.currentMenulisTool === 'pencil';
      if (pBtn) pBtn.classList.toggle('active', isPencil);
      if (eBtn) eBtn.classList.toggle('active', !isPencil);
      if (mpBtn) mpBtn.classList.toggle('active', isPencil);
      if (meBtn) meBtn.classList.toggle('active', !isPencil);

      const wrapper = document.getElementById('riak-experience-wrapper');
      if (wrapper) {
        if (!isPencil) wrapper.classList.add('tool-eraser');
        else wrapper.classList.remove('tool-eraser');
      }
    }

    updateMenulisToolsVisibility() {
      const toolsWrapper = document.getElementById('riak-menulis-tools-wrapper');
      const mobileTools = document.getElementById('riak-mobile-menulis-tools');
      const wrapper = document.getElementById('riak-experience-wrapper');

      const isMenulis = this.currentTheme === 'menulis';

      if (toolsWrapper) {
        if (isMenulis) {
          toolsWrapper.classList.add('active');
        } else {
          toolsWrapper.classList.remove('active');
        }
      }

      if (mobileTools) {
        if (isMenulis) {
          mobileTools.classList.remove('hidden');
          mobileTools.classList.add('flex');
        } else {
          mobileTools.classList.add('hidden');
          mobileTools.classList.remove('flex');
        }
      }

      if (wrapper) {
        if (isMenulis && this.currentMenulisTool === 'eraser') {
          wrapper.classList.add('tool-eraser');
        } else {
          wrapper.classList.remove('tool-eraser');
        }
      }
    }

    bindColorPicker() {
      const desktopInput = document.getElementById('riak-color-input');
      const desktopPreview = document.getElementById('riak-color-preview');
      const mobileInput = document.getElementById('riak-mobile-color-input');
      const mobilePreview = document.getElementById('riak-mobile-color-preview');

      const syncInputs = (hex) => {
        if (desktopInput && desktopInput.value.toLowerCase() !== hex.toLowerCase()) desktopInput.value = hex;
        if (desktopPreview) desktopPreview.style.backgroundColor = hex;
        if (mobileInput && mobileInput.value.toLowerCase() !== hex.toLowerCase()) mobileInput.value = hex;
        if (mobilePreview) mobilePreview.style.backgroundColor = hex;
      };

      syncInputs(this.currentColor);

      const handleColorChange = (e) => {
        const newHex = e.target.value;
        this.setColor(newHex, true);
        syncInputs(newHex);
      };

      if (desktopInput) {
        desktopInput.addEventListener('input', handleColorChange);
        desktopInput.addEventListener('change', handleColorChange);
      }

      if (mobileInput) {
        mobileInput.addEventListener('input', handleColorChange);
        mobileInput.addEventListener('change', handleColorChange);
      }
    }

    setColor(colorHex, isExplicitUserAction = true) {
      this.currentColor = colorHex;

      if (isExplicitUserAction) {
        this.hasCustomColor = true;
        localStorage.setItem('riak_warna', colorHex);
        localStorage.setItem(`riak_warna_${this.currentTheme}`, colorHex);
      }

      if (window.RiakEngine) {
        window.RiakEngine.setColor(colorHex);
      }

      const desktopPreview = document.getElementById('riak-color-preview');
      if (desktopPreview) desktopPreview.style.backgroundColor = colorHex;

      const mobilePreview = document.getElementById('riak-mobile-color-preview');
      if (mobilePreview) mobilePreview.style.backgroundColor = colorHex;

      const desktopInput = document.getElementById('riak-color-input');
      if (desktopInput && desktopInput.value.toLowerCase() !== colorHex.toLowerCase()) {
        desktopInput.value = colorHex;
      }

      const mobileInput = document.getElementById('riak-mobile-color-input');
      if (mobileInput && mobileInput.value.toLowerCase() !== colorHex.toLowerCase()) {
        mobileInput.value = colorHex;
      }
    }

    bindMuteButton() {
      const desktopMuteBtn = document.getElementById('riak-mute-btn');
      const mobileMuteBtn = document.getElementById('riak-mobile-mute-btn');

      const desktopIconOn = document.getElementById('riak-icon-sound-on');
      const desktopIconOff = document.getElementById('riak-icon-sound-off');
      const mobileIconOn = document.getElementById('riak-mobile-icon-sound-on');
      const mobileIconOff = document.getElementById('riak-mobile-icon-sound-off');
      const mobileLabel = document.getElementById('riak-mobile-mute-label');

      const updateMuteUI = () => {
        if (desktopIconOn && desktopIconOff) {
          if (this.isMuted) {
            desktopIconOn.classList.add('hidden');
            desktopIconOff.classList.remove('hidden');
          } else {
            desktopIconOn.classList.remove('hidden');
            desktopIconOff.classList.add('hidden');
          }
        }

        if (mobileIconOn && mobileIconOff) {
          if (this.isMuted) {
            mobileIconOn.classList.add('hidden');
            mobileIconOff.classList.remove('hidden');
            if (mobileLabel) mobileLabel.textContent = 'Bisu';
          } else {
            mobileIconOn.classList.remove('hidden');
            mobileIconOff.classList.add('hidden');
            if (mobileLabel) mobileLabel.textContent = 'Bunyi';
          }
        }
      };

      const toggleMuteAction = () => {
        this.isMuted = !this.isMuted;
        if (window.RiakAudio) {
          window.RiakAudio.setMuted(this.isMuted);
        }
        updateMuteUI();
      };

      if (desktopMuteBtn) desktopMuteBtn.addEventListener('click', toggleMuteAction);
      if (mobileMuteBtn) mobileMuteBtn.addEventListener('click', toggleMuteAction);

      updateMuteUI();
    }

    bindZoomControls() {
      // Desktop buttons
      const btnOut = document.getElementById('riak-zoom-out-btn');
      const btnIn = document.getElementById('riak-zoom-in-btn');
      const btnReset = document.getElementById('riak-zoom-reset-btn');

      // Mobile popover buttons
      const mBtnOut = document.getElementById('riak-mobile-zoom-out-btn');
      const mBtnIn = document.getElementById('riak-mobile-zoom-in-btn');
      const mBtnReset = document.getElementById('riak-mobile-zoom-reset-btn');

      const handleZoomOut = () => this.setZoom(this.zoomLevel - 0.1, true);
      const handleZoomIn = () => this.setZoom(this.zoomLevel + 0.1, true);
      const handleReset = () => this.setZoom(1.0, true);

      if (btnOut) btnOut.addEventListener('click', handleZoomOut);
      if (btnIn) btnIn.addEventListener('click', handleZoomIn);
      if (btnReset) btnReset.addEventListener('click', handleReset);

      if (mBtnOut) mBtnOut.addEventListener('click', handleZoomOut);
      if (mBtnIn) mBtnIn.addEventListener('click', handleZoomIn);
      if (mBtnReset) mBtnReset.addEventListener('click', handleReset);

      const wrapper = document.getElementById('riak-experience-wrapper');
      if (wrapper) {
        // Desktop mouse wheel zoom (Requires Ctrl / Cmd key)
        wrapper.addEventListener('wheel', (e) => {
          const controlsPill = document.getElementById('riak-desktop-controls');
          const fabContainer = document.getElementById('riak-mobile-fab-container');

          if ((controlsPill && controlsPill.contains(e.target)) ||
              (fabContainer && fabContainer.contains(e.target))) {
            return;
          }

          // Lock wheel zoom to Ctrl + Scroll (or Cmd + Scroll on macOS)
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.0015;
            this.setZoom(this.zoomLevel + delta, true);
          }
        }, { passive: false });

        // Mobile pinch-to-zoom
        let initialPinchDist = 0;
        let initialZoom = 1.0;

        wrapper.addEventListener('touchstart', (e) => {
          if (e.touches && e.touches.length === 2) {
            initialPinchDist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            initialZoom = this.zoomLevel;
          }
        }, { passive: true });

        wrapper.addEventListener('touchmove', (e) => {
          if (e.touches && e.touches.length === 2 && initialPinchDist > 0) {
            e.preventDefault();
            const currentDist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            const scaleFactor = currentDist / initialPinchDist;
            this.setZoom(initialZoom * scaleFactor, false);
          }
        }, { passive: false });

        const resetPinch = () => {
          initialPinchDist = 0;
        };

        wrapper.addEventListener('touchend', resetPinch, { passive: true });
        wrapper.addEventListener('touchcancel', resetPinch, { passive: true });
      }
    }

    setZoom(targetZoom, animate = true) {
      const clamped = Math.min(1.0, Math.max(0.25, targetZoom));
      const rounded = Math.round(clamped * 100) / 100;

      this.zoomLevel = rounded;
      sessionStorage.setItem('riak_zoom_level', rounded.toString());
      this.applyZoom(rounded, animate);
    }

    applyZoom(zoom, animate = true) {
      const canvasEl = document.getElementById('riak-canvas');
      if (canvasEl) {
        if (!animate) {
          canvasEl.style.transition = 'none';
        } else {
          canvasEl.style.transition = '';
        }
        canvasEl.style.transform = `scale(${zoom})`;
      }

      const percentageStr = `${Math.round(zoom * 100)}%`;

      const desktopLabel = document.getElementById('riak-zoom-label');
      const mobileLabel = document.getElementById('riak-mobile-zoom-label');
      if (desktopLabel) desktopLabel.textContent = percentageStr;
      if (mobileLabel) mobileLabel.textContent = percentageStr;

      // Reset button visibility (shown when zoom < 0.99)
      const desktopReset = document.getElementById('riak-zoom-reset-btn');
      const mobileReset = document.getElementById('riak-mobile-zoom-reset-btn');
      const isZoomedOut = zoom < 0.99;

      if (desktopReset) {
        if (isZoomedOut) desktopReset.classList.remove('hidden');
        else desktopReset.classList.add('hidden');
      }
      if (mobileReset) {
        if (isZoomedOut) mobileReset.classList.remove('hidden');
        else mobileReset.classList.add('hidden');
      }

      // Zoom In button state (disabled at 1.0 / 100%)
      const desktopIn = document.getElementById('riak-zoom-in-btn');
      const mobileIn = document.getElementById('riak-mobile-zoom-in-btn');
      const atMax = zoom >= 0.99;
      if (desktopIn) desktopIn.classList.toggle('opacity-40', atMax);
      if (mobileIn) mobileIn.classList.toggle('opacity-40', atMax);

      // Zoom Out button state (disabled at 0.25 / 25%)
      const desktopOut = document.getElementById('riak-zoom-out-btn');
      const mobileOut = document.getElementById('riak-mobile-zoom-out-btn');
      const atMin = zoom <= 0.26;
      if (desktopOut) desktopOut.classList.toggle('opacity-40', atMin);
      if (mobileOut) mobileOut.classList.toggle('opacity-40', atMin);
    }

    /**
     * Initializes Draggable Floating Action Button (FAB) + Popover for Mobile
     */
    initMobileFab() {
      this.fabContainer = document.getElementById('riak-mobile-fab-container');
      this.fabEl = document.getElementById('riak-mobile-fab-btn');
      this.popoverEl = document.getElementById('riak-mobile-popover');
      const closeBtn = document.getElementById('riak-mobile-popover-close');

      if (!this.fabContainer || !this.fabEl || !this.popoverEl) return;

      // Safe viewport boundary clamps
      const getBounds = () => {
        const fabWidth = this.fabEl.offsetWidth || 50;
        const fabHeight = this.fabEl.offsetHeight || 50;
        return {
          minX: 12,
          maxX: Math.max(12, window.innerWidth - fabWidth - 12),
          minY: 70, // Safe padding below fixed navbar
          maxY: Math.max(70, window.innerHeight - fabHeight - 16)
        };
      };

      const clampPosition = (x, y) => {
        const bounds = getBounds();
        return {
          x: Math.min(Math.max(x, bounds.minX), bounds.maxX),
          y: Math.min(Math.max(y, bounds.minY), bounds.maxY)
        };
      };

      // Restore session position or set default bottom-right
      const restorePosition = () => {
        const saved = sessionStorage.getItem('riak_fab_pos');
        if (saved) {
          try {
            const { x, y } = JSON.parse(saved);
            const clamped = clampPosition(x, y);
            this.fabContainer.style.left = `${clamped.x}px`;
            this.fabContainer.style.top = `${clamped.y}px`;
            this.fabContainer.style.right = 'auto';
            this.fabContainer.style.bottom = 'auto';
            return;
          } catch (e) {}
        }
        // Default placement (bottom-right)
        const defX = window.innerWidth - 66;
        const defY = window.innerHeight - 130;
        const clamped = clampPosition(defX, defY);
        this.fabContainer.style.left = `${clamped.x}px`;
        this.fabContainer.style.top = `${clamped.y}px`;
        this.fabContainer.style.right = 'auto';
        this.fabContainer.style.bottom = 'auto';
      };

      restorePosition();
      window.addEventListener('resize', () => {
        const currLeft = parseFloat(this.fabContainer.style.left) || 0;
        const currTop = parseFloat(this.fabContainer.style.top) || 0;
        const clamped = clampPosition(currLeft, currTop);
        this.fabContainer.style.left = `${clamped.x}px`;
        this.fabContainer.style.top = `${clamped.y}px`;
        if (this.isPopoverOpen) {
          this.positionPopover();
        }
      });

      // Pointer Dragging & Tap Distinction
      let isPointerDown = false;
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initLeft = 0;
      let initTop = 0;
      const DRAG_THRESHOLD = 9; // pixels moved before qualifying as drag

      this.fabEl.addEventListener('pointerdown', (e) => {
        isPointerDown = true;
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;

        const rect = this.fabContainer.getBoundingClientRect();
        initLeft = rect.left;
        initTop = rect.top;

        this.fabEl.setPointerCapture(e.pointerId);
      });

      this.fabEl.addEventListener('pointermove', (e) => {
        if (!isPointerDown) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const dist = Math.hypot(dx, dy);

        if (dist > DRAG_THRESHOLD) {
          isDragging = true;
          // Hide popover while dragging
          if (this.isPopoverOpen) {
            this.closePopover();
          }

          const newX = initLeft + dx;
          const newY = initTop + dy;
          const clamped = clampPosition(newX, newY);

          this.fabContainer.style.left = `${clamped.x}px`;
          this.fabContainer.style.top = `${clamped.y}px`;
        }
      });

      const handlePointerRelease = (e) => {
        if (!isPointerDown) return;
        isPointerDown = false;

        try {
          this.fabEl.releasePointerCapture(e.pointerId);
        } catch (err) {}

        if (isDragging) {
          // Persist dragged position for session
          const currX = parseFloat(this.fabContainer.style.left) || initLeft;
          const currY = parseFloat(this.fabContainer.style.top) || initTop;
          sessionStorage.setItem('riak_fab_pos', JSON.stringify({ x: currX, y: currY }));
        } else {
          // Clean TAP -> Toggle Popover Menu
          this.togglePopover();
        }
      };

      this.fabEl.addEventListener('pointerup', handlePointerRelease);
      this.fabEl.addEventListener('pointercancel', handlePointerRelease);

      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closePopover();
        });
      }

      // Close popover when tapping outside
      document.addEventListener('pointerdown', (e) => {
        if (this.isPopoverOpen && !this.fabContainer.contains(e.target)) {
          this.closePopover();
        }
      });
    }

    positionPopover() {
      if (!this.popoverEl || !this.fabContainer) return;

      const rect = this.fabContainer.getBoundingClientRect();
      const popoverWidth = 260;
      const popoverHeight = 220;

      // Vertical placement: above button if on bottom half of viewport, else below
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < popoverHeight + 20 && rect.top > popoverHeight + 20) {
        this.popoverEl.style.bottom = '58px';
        this.popoverEl.style.top = 'auto';
      } else {
        this.popoverEl.style.top = '58px';
        this.popoverEl.style.bottom = 'auto';
      }

      // Horizontal placement: align right edge if near right screen boundary
      if (rect.left + popoverWidth > window.innerWidth - 16) {
        this.popoverEl.style.right = '0px';
        this.popoverEl.style.left = 'auto';
      } else {
        this.popoverEl.style.left = '0px';
        this.popoverEl.style.right = 'auto';
      }
    }

    togglePopover() {
      if (this.isPopoverOpen) {
        this.closePopover();
      } else {
        this.openPopover();
      }
    }

    openPopover() {
      if (!this.popoverEl) return;
      this.isPopoverOpen = true;
      this.positionPopover();
      this.popoverEl.classList.remove('hidden');
      this.popoverEl.classList.add('flex');
    }

    closePopover() {
      if (!this.popoverEl) return;
      this.isPopoverOpen = false;
      this.popoverEl.classList.add('hidden');
      this.popoverEl.classList.remove('flex');
    }

    initNavbarAutoHide() {
      const getNavEl = () => {
        const slot = document.getElementById('navbar-slot');
        return slot ? slot.querySelector('nav') : null;
      };

      let isNavHidden = false;

      const hideNavbar = () => {
        if (isNavHidden) return;
        isNavHidden = true;
        document.body.classList.add('riak-nav-hidden');
        const slot = document.getElementById('navbar-slot');
        if (slot) slot.classList.add('nav-hidden');
        const nav = getNavEl();
        if (nav) nav.classList.add('nav-hidden');
      };

      const showNavbar = () => {
        if (!isNavHidden) return;
        isNavHidden = false;
        document.body.classList.remove('riak-nav-hidden');
        const slot = document.getElementById('navbar-slot');
        if (slot) slot.classList.remove('nav-hidden');
        const nav = getNavEl();
        if (nav) nav.classList.remove('nav-hidden');
      };

      // Expose globally so RiakEngine can invoke hide/show seamlessly
      window.RiakNavbar = {
        hide: hideNavbar,
        show: showNavbar,
        isHidden: () => isNavHidden
      };

      // Reappear when mouse bumped to the top edge (clientY <= 50)
      window.addEventListener('mousemove', (e) => {
        if (e.clientY <= 50) {
          showNavbar();
        }
      }, { passive: true });

      // Reappear on scroll up (wheel deltaY < -4)
      window.addEventListener('wheel', (e) => {
        if (e.deltaY < -4) {
          showNavbar();
        }
      }, { passive: true });

      // Reappear on touch near top edge
      window.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0] && e.touches[0].clientY <= 50) {
          showNavbar();
        }
      }, { passive: true });
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
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    window.RiakUI = new RiakUIController();
    window.RiakUI.init();
  });
})(window);
