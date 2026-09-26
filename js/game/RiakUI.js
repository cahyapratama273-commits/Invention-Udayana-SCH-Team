/**
 * RiakUI.js — Pengontrol Antarmuka (UI Controller) untuk Ruang Sensorik BerTeduh
 * 
 * Modul ini mengatur:
 * 1. Pengalih Tema: Air (Riak Gelombang Air) | Angkasa (Debu Bintang Galaksi) | Menulis (Goresan Kertas & Pensil).
 * 2. Pemilih Warna (Color Picker): Sinkronisasi warna real-time pada kontrol desktop dan mobile.
 * 3. Kontrol Audio & Bisu (Mute Toggle): Pengaturan efek suara riak air dan gesekan pensil.
 * 4. Tombol Menu Terapung Mobile (Draggable FAB):
 *    - Tombol terapung di perangkat mobile yang dapat digeser (drag) dengan bebas.
 *    - Membedakan antara ketukan bersih (Tap untuk toggle popover) dan geseran (Drag memindahkan tombol).
 *    - Menyimpan posisi tombol di sessionStorage agar posisinya tetap sama saat navigasi.
 *    - Menjaga koordinat tombol selalu berada di dalam batas layar yang aman (clamping).
 * 5. Fitur Zoom (Zoom In / Zoom Out):
 *    - Mendukung Ctrl+Scroll di desktop dan gestur Pinch-to-Zoom di perangkat sentuh (skala 25% hingga 100%).
 *    - Menyediakan tombol reset zoom saat tampilan diperkecil (< 100%).
 * 6. Sembunyi Otomatis Navbar (Auto-hide Navbar) saat user sedang fokus berinteraksi di kanvas.
 */
(function (window) {
  'use strict';

  // Daftar warna standar default untuk masing-masing tema
  const THEME_DEFAULTS = {
    air: '#38BDF8',     // Biru air segar
    angkasa: '#C084FC', // Ungu kosmik galaksi
    menulis: '#1C1917'  // Hitam grafit pensil sketsa
  };

  class RiakUIController {
    constructor() {
      // ─── STATE DAN PREFERENSI TERSIMPAN ───
      this.currentTheme = localStorage.getItem('riak_tema') || 'air';

      const savedColor = localStorage.getItem('riak_warna');
      this.hasCustomColor = savedColor !== null;
      
      // Tentukan warna aktif berdasarkan tema
      if (this.currentTheme === 'menulis') {
        const savedMenulisColor = localStorage.getItem('riak_warna_menulis');
        this.currentColor = savedMenulisColor || '#1C1917';
      } else {
        this.currentColor = savedColor || THEME_DEFAULTS[this.currentTheme] || '#38BDF8';
      }

      this.isMuted = localStorage.getItem('riak_muted') === 'true';
      this.hintDismissed = localStorage.getItem('riak_hint_dismissed') === 'true';

      // State tombol terapung (FAB) mobile
      this.fabEl = null;
      this.fabContainer = null;
      this.popoverEl = null;
      this.isPopoverOpen = false;

      // Alat aktif pada mode menulis ('pencil' | 'eraser')
      this.currentMenulisTool = 'pencil';

      // Level skala zoom kanvas (0.25 sampai 1.00)
      const savedZoom = sessionStorage.getItem('riak_zoom_level');
      this.zoomLevel = savedZoom ? Math.min(1.0, Math.max(0.25, parseFloat(savedZoom))) : 1.0;
    }

    /**
     * Inisialisasi awal UI dan komponen mesin sensorik
     */
    async init() {
      // Muat navbar secara dinamis jika tersedia
      if (typeof loadNavigasi === 'function') {
        try { await loadNavigasi(); } catch(e) {
          console.error('Gagal memuat navbar:', e);
        }
      }

      const canvasEl = document.getElementById('riak-canvas');
      const wrapperEl = document.getElementById('riak-experience-wrapper');

      if (!canvasEl || !wrapperEl) return;

      // Inisialisasi Mesin Simulasi Visual (RiakEngine) dan Audio (RiakAudio)
      if (window.RiakEngine) {
        window.RiakEngine.init(canvasEl);
        window.RiakEngine.setTheme(this.currentTheme);
        window.RiakEngine.setColor(this.currentColor);

        // Hapus teks petunjuk interaksi saat user pertama kali menyentuh kanvas
        window.RiakEngine.onFirstInteraction = () => {
          this.dismissHint();
        };
      }

      if (window.RiakAudio) {
        window.RiakAudio.setTheme(this.currentTheme);
        window.RiakAudio.setMuted(this.isMuted);
      }

      // Terapkan tema visual awal pada wrapper
      this.updateThemeBackground();

      // Pasang seluruh kontrol interaksi
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

    /**
     * Memperbarui kelas CSS latar belakang sesuai tema yang aktif
     */
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

    /**
     * Menghubungkan tombol pilihan tema (Air, Angkasa, Menulis) di desktop dan mobile
     */
    bindThemeToggle() {
      // Tombol desktop
      const btnAir = document.getElementById('riak-theme-air-btn');
      const btnAngkasa = document.getElementById('riak-theme-angkasa-btn');
      const btnMenulis = document.getElementById('riak-theme-menulis-btn');

      // Tombol popover mobile
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

    /**
     * Mengatur tema baru dan memperbarui preferensi di localStorage
     */
    setTheme(theme) {
      this.currentTheme = theme;
      localStorage.setItem('riak_tema', theme);

      // Jika berpindah ke mode menulis, gunakan warna pensil grafit default
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

    /**
     * Menghubungkan tombol alat menulis (Pensil, Penghapus, dan Bersihkan Kanvas)
     */
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

    /**
     * Membersihkan seluruh tulisan di kanvas
     */
    clearMenulisCanvas() {
      if (window.RiakEngine && typeof window.RiakEngine.clearMenulisCanvas === 'function') {
        window.RiakEngine.clearMenulisCanvas();
      }
    }

    /**
     * Mengatur alat aktif pada mode menulis (Pensil atau Penghapus)
     */
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

    /**
     * Mengatur visibilitas toolbar menulis (hanya muncul saat tema Menulis aktif)
     */
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

    /**
     * Menghubungkan input pemilihan warna (Color Picker)
     */
    bindColorPicker() {
      const desktopInput = document.getElementById('riak-color-input');
      const desktopPreview = document.getElementById('riak-color-preview');
      const mobileInput = document.getElementById('riak-mobile-color-input');
      const mobilePreview = document.getElementById('riak-mobile-color-preview');

      // Sinkronisasi nilai warna ke elemen input dan preview
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

    /**
     * Mengatur warna simulasi dan menyimpannya di localStorage
     */
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

    /**
     * Menghubungkan tombol bisukan audio (Mute Sound)
     */
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

    /**
     * Menghubungkan kontrol Zoom (Perbesar, Perkecil, Reset Zoom, Ctrl+Scroll, dan Pinch Gesture)
     */
    bindZoomControls() {
      // Tombol desktop
      const btnOut = document.getElementById('riak-zoom-out-btn');
      const btnIn = document.getElementById('riak-zoom-in-btn');
      const btnReset = document.getElementById('riak-zoom-reset-btn');

      // Tombol popover mobile
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
        // Zoom via scroll wheel mouse desktop (hanya aktif jika tombol Ctrl / Cmd ditekan)
        wrapper.addEventListener('wheel', (e) => {
          const controlsPill = document.getElementById('riak-desktop-controls');
          const fabContainer = document.getElementById('riak-mobile-fab-container');

          if ((controlsPill && controlsPill.contains(e.target)) ||
              (fabContainer && fabContainer.contains(e.target))) {
            return;
          }

          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.0015;
            this.setZoom(this.zoomLevel + delta, true);
          }
        }, { passive: false });

        // Gestur cubit zoom pada layar sentuh (Pinch-to-Zoom 2 jari)
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

    /**
     * Mengatur nilai zoom dengan pembatasan batas minimal (0.25) dan maksimal (1.00)
     */
    setZoom(targetZoom, animate = true) {
      const clamped = Math.min(1.0, Math.max(0.25, targetZoom));
      const rounded = Math.round(clamped * 100) / 100;

      this.zoomLevel = rounded;
      sessionStorage.setItem('riak_zoom_level', rounded.toString());
      this.applyZoom(rounded, animate);
    }

    /**
     * Menerapkan transformasi CSS Scale pada kanvas dan memperbarui label persen
     */
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

      // Tampilkan tombol Reset hanya jika sedang di-zoom out (< 100%)
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

      // Redupkan tombol Zoom In jika sudah mencapai batas maksimal (100%)
      const desktopIn = document.getElementById('riak-zoom-in-btn');
      const mobileIn = document.getElementById('riak-mobile-zoom-in-btn');
      const atMax = zoom >= 0.99;
      if (desktopIn) desktopIn.classList.toggle('opacity-40', atMax);
      if (mobileIn) mobileIn.classList.toggle('opacity-40', atMax);

      // Redupkan tombol Zoom Out jika sudah mencapai batas minimal (25%)
      const desktopOut = document.getElementById('riak-zoom-out-btn');
      const mobileOut = document.getElementById('riak-mobile-zoom-out-btn');
      const atMin = zoom <= 0.26;
      if (desktopOut) desktopOut.classList.toggle('opacity-40', atMin);
      if (mobileOut) mobileOut.classList.toggle('opacity-40', atMin);
    }

    /**
     * Menginisialisasi Tombol Terapung (FAB) dan Popover Menu untuk Mobile
     */
    initMobileFab() {
      this.fabContainer = document.getElementById('riak-mobile-fab-container');
      this.fabEl = document.getElementById('riak-mobile-fab-btn');
      this.popoverEl = document.getElementById('riak-mobile-popover');
      const closeBtn = document.getElementById('riak-mobile-popover-close');

      if (!this.fabContainer || !this.fabEl || !this.popoverEl) return;

      // Batasan area aman gerak tombol di layar
      const getBounds = () => {
        const fabWidth = this.fabEl.offsetWidth || 50;
        const fabHeight = this.fabEl.offsetHeight || 50;
        return {
          minX: 12,
          maxX: Math.max(12, window.innerWidth - fabWidth - 12),
          minY: 70, // Jarak aman dari navbar atas
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

      // Pulihkan posisi terakhir tombol dari sessionStorage
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
        // Posisi default: pojok kanan bawah
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

      // Penanganan gesture sentuh: membedakan KLIK vs DRAG
      let isPointerDown = false;
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initLeft = 0;
      let initTop = 0;
      const DRAG_THRESHOLD = 9; // Batas minimal pergerakan pixel untuk dianggap sebagai drag

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
          // Sembunyikan popover jika user mulai menggeser tombol
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
          // Gerakan adalah DRAG: Simpan koordinat baru ke sessionStorage
          const currX = parseFloat(this.fabContainer.style.left) || initLeft;
          const currY = parseFloat(this.fabContainer.style.top) || initTop;
          sessionStorage.setItem('riak_fab_pos', JSON.stringify({ x: currX, y: currY }));
        } else {
          // Gerakan adalah TAP: Buka / tutup popover menu
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

      // Tutup popover jika mengklik di luar area menu
      document.addEventListener('pointerdown', (e) => {
        if (this.isPopoverOpen && !this.fabContainer.contains(e.target)) {
          this.closePopover();
        }
      });
    }

    /**
     * Menyesuaikan posisi kemunculan popover menu mobile agar selalu terlihat rapi
     */
    positionPopover() {
      if (!this.popoverEl || !this.fabContainer) return;

      const rect = this.fabContainer.getBoundingClientRect();
      const popoverWidth = 260;
      const popoverHeight = 220;

      // Penempatan Vertikal: buka ke atas jika tombol berada di bagian bawah layar
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < popoverHeight + 20 && rect.top > popoverHeight + 20) {
        this.popoverEl.style.bottom = '58px';
        this.popoverEl.style.top = 'auto';
      } else {
        this.popoverEl.style.top = '58px';
        this.popoverEl.style.bottom = 'auto';
      }

      // Penempatan Horizontal: ratakan ke kanan jika berada di dekat tepi kanan layar
      if (rect.left + popoverWidth > window.innerWidth - 16) {
        this.popoverEl.style.right = '0px';
        this.popoverEl.style.left = 'auto';
      } else {
        this.popoverEl.style.left = '0px';
        this.popoverEl.style.right = 'auto';
      }
    }

    /**
     * Toggle buka/tutup popover mobile
     */
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

    /**
     * Logika Auto-Hide Navbar agar pengalaman sensorik lebih imersif
     */
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

      // Ekspor helper navbar ke objek global window
      window.RiakNavbar = {
        hide: hideNavbar,
        show: showNavbar,
        isHidden: () => isNavHidden
      };

      // Munculkan kembali navbar jika mouse digerakkan ke tepi paling atas (clientY <= 50)
      window.addEventListener('mousemove', (e) => {
        if (e.clientY <= 50) {
          showNavbar();
        }
      }, { passive: true });

      // Munculkan kembali navbar saat user scroll ke atas (wheel deltaY < -4)
      window.addEventListener('wheel', (e) => {
        if (e.deltaY < -4) {
          showNavbar();
        }
      }, { passive: true });

      // Munculkan kembali navbar saat sentuhan terdeteksi di dekat tepi atas
      window.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0] && e.touches[0].clientY <= 50) {
          showNavbar();
        }
      }, { passive: true });
    }

    /**
     * Mengatur teks petunjuk interaksi awal (Hint Overlay)
     */
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

  // Inisialisasi controller saat dokumen HTML siap
  document.addEventListener('DOMContentLoaded', () => {
    window.RiakUI = new RiakUIController();
    window.RiakUI.init();
  });
})(window);
