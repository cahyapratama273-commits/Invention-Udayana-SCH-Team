/**
 * js/chat-overlay.js — Floating Draggable AI Chat Overlay BerTeduh
 * Terhubung langsung dengan TeduhChatService dan riwayat bersama (bt_ai_chat_history)
 */

(function () {
  'use strict';

  const STORAGE_POS_KEY = 'bt_chat_bubble_pos';
  const DRAG_THRESHOLD = 9; // piksel untuk membedakan TAP vs DRAG
  const IDLE_OPACITY = '0.45'; // agak transparan saat tidak disentuh/digerakkan
  const ACTIVE_OPACITY = '1.0';
  const IDLE_DELAY_MS = 2500; // waktu tunggu sebelum meredup (2.5 detik)

  let bubbleEl = null;
  let panelEl = null;
  let isPanelOpen = false;
  let isDragging = false;
  let hasPointerMoved = false;
  let isHovered = false;
  let isHiddenByPage = false;
  let idleTimer = null;
  let startPointerX = 0;
  let startPointerY = 0;
  let initialBtnX = 0;
  let initialBtnY = 0;
  let currentBtnX = 0;
  let currentBtnY = 0;
  let unsubscribeService = null;

  /**
   * Mengatur opacity tombol menjadi aktif (1.0) dan memulai ulang timer redup
   */
  function wakeBubble() {
    if (isHiddenByPage || !bubbleEl) return;
    bubbleEl.style.opacity = ACTIVE_OPACITY;
    scheduleIdleDim();
  }

  /**
   * Mengatur opacity tombol menjadi agak transparan saat idle (0.45)
   */
  function dimBubble() {
    if (isHiddenByPage || !bubbleEl || isPanelOpen || isDragging || isHovered) return;
    bubbleEl.style.opacity = IDLE_OPACITY;
  }

  /**
   * Menjadwalkan peredupan tombol jika tidak ada interaksi selama 2.5 detik
   */
  function scheduleIdleDim() {
    if (idleTimer) clearTimeout(idleTimer);
    if (isPanelOpen || isHovered || isDragging || isHiddenByPage) return;
    idleTimer = setTimeout(() => {
      dimBubble();
    }, IDLE_DELAY_MS);
  }

  /**
   * Sembunyikan overlay chat (misal saat berada di section AI halaman Konsultasi)
   */
  function hideBubble() {
    isHiddenByPage = true;
    if (idleTimer) clearTimeout(idleTimer);
    if (isPanelOpen) {
      closePanel();
    }
    if (bubbleEl) {
      bubbleEl.style.display = 'none';
      bubbleEl.style.opacity = '0';
    }
  }

  /**
   * Tampilkan kembali overlay chat
   */
  function showBubble() {
    isHiddenByPage = false;
    if (bubbleEl) {
      bubbleEl.style.display = 'flex';
      bubbleEl.style.opacity = ACTIVE_OPACITY;
      scheduleIdleDim();
    }
  }

  /**
   * Helper: Escape HTML
   */
  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Format jam percakapan (HH:MM)
   */
  function formatTime(timestamp) {
    if (!timestamp) return "";
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "";
    }
  }

  /**
   * Injeksi markup HTML untuk Floating Button & Panel Chat ke DOM
   */
  function injectOverlayDOM() {
    if (document.getElementById('bt-chat-overlay-root')) return;

    const root = document.createElement('div');
    root.id = 'bt-chat-overlay-root';
    root.innerHTML = `
      <!-- FLOATING DRAGGABLE CHAT BUTTON -->
      <div id="bt-chat-bubble"
           role="button"
           tabindex="0"
           aria-label="Buka Chat AI BerTeduh"
           title="Buka Chat AI BerTeduh"
           style="position:fixed; z-index:9990; width:54px; height:54px; border-radius:9999px; background:#2DD4A8; color:#0D1220; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 25px rgba(45,212,168,0.4), 0 4px 12px rgba(0,0,0,0.5); cursor:grab; user-select:none; touch-action:none; opacity:1; transition:box-shadow 0.2s ease, transform 0.15s ease, opacity 0.4s ease;">
        
        <!-- Speech Bubble Icon -->
        <svg class="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#0D1220" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>

        <!-- Pulsing online notification badge -->
        <span style="position:absolute; top:-2px; right:-2px; width:14px; height:14px; border-radius:9999px; background:#10B981; border:2px solid #0D1220; box-shadow:0 0 8px #10B981; pointer-events:none;"></span>
      </div>

      <!-- COMPACT OVERLAY CHAT PANEL -->
      <div id="bt-chat-panel"
           role="dialog"
           aria-label="Chat AI BerTeduh"
           class="hidden"
           style="position:fixed; z-index:9995; width:380px; max-width:calc(100vw - 28px); height:520px; max-height:calc(100vh - 110px); background:rgba(20,26,44,0.96); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.15); border-radius:24px; box-shadow:0 24px 60px rgba(0,0,0,0.65), 0 0 30px rgba(45,212,168,0.12); display:none; flex-direction:column; overflow:hidden; font-family:Inter,sans-serif; opacity:0; transform:scale(0.96); transition:opacity 220ms cubic-bezier(0.25, 0.1, 0.25, 1), transform 220ms cubic-bezier(0.25, 0.1, 0.25, 1);">
        
        <!-- Panel Header -->
        <div style="padding:14px 18px; border-bottom:1px solid rgba(255,255,255,0.1); background:rgba(26,33,56,0.8); display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <!-- Left: Identity -->
          <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1;">
            <div style="width:38px; height:38px; border-radius:12px; background:rgba(45,212,168,0.15); border:1px solid rgba(45,212,168,0.3); color:#2DD4A8; display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0;">
              🤖
            </div>
            <div style="min-width:0;">
              <div style="display:flex; align-items:center; gap:6px;">
                <h3 style="font-size:14px; font-weight:700; color:#F5F5F5; font-family:'Playfair Display',serif; margin:0; line-height:1.2;">AI BerTeduh</h3>
                <span style="display:inline-block; width:7px; height:7px; border-radius:9999px; background:#2DD4A8; flex-shrink:0;"></span>
              </div>
              <p style="font-size:11px; color:#8A93A8; margin:2px 0 0 0; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Teman Cerita Kapan Saja</p>
            </div>
          </div>

          <!-- Right: Action Buttons (Right-aligned) -->
          <div style="display:flex; align-items:center; gap:8px; flex-shrink:0; margin-left:auto;">
            <!-- Buka di Halaman Penuh Link -->
            <a href="/konsultasi.html#tab-ai"
               title="Buka di halaman konsultasi"
               aria-label="Buka di halaman konsultasi"
               style="width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#8A93A8; text-decoration:none; transition:all 0.2s; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08);"
               onmouseover="this.style.color='#2DD4A8'; this.style.borderColor='rgba(45,212,168,0.3)'; this.style.background='rgba(45,212,168,0.12)';"
               onmouseout="this.style.color='#8A93A8'; this.style.borderColor='rgba(255,255,255,0.08)'; this.style.background='rgba(255,255,255,0.06)';">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>

            <!-- Minimize / Close Button -->
            <button id="bt-chat-close-btn"
                    type="button"
                    title="Tutup Obrolan"
                    aria-label="Tutup Obrolan"
                    style="width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#8A93A8; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); cursor:pointer; transition:all 0.2s; padding:0;"
                    onmouseover="this.style.color='#FFFFFF'; this.style.borderColor='rgba(255,255,255,0.2)'; this.style.background='rgba(255,255,255,0.14)';"
                    onmouseout="this.style.color='#8A93A8'; this.style.borderColor='rgba(255,255,255,0.08)'; this.style.background='rgba(255,255,255,0.06)';">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Messages Container (Scrollable) -->
        <div id="bt-overlay-messages"
             style="flex:1; overflow-y:auto; padding:14px 16px; display:flex; flex-direction:column; gap:12px; scroll-behavior:smooth;">
          <!-- Dynamically populated from TeduhChatService -->
        </div>

        <!-- Quick Topic Chips -->
        <div style="padding:4px 14px 8px 14px; background:rgba(20,26,44,0.7); border-top:1px solid rgba(255,255,255,0.05);">
          <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none;" class="no-scrollbar">
            <button class="bt-quick-chip" data-topic="Aku merasa agak susah tidur akhir-akhir ini..." style="white-space:nowrap; font-size:11px; padding:4px 10px; border-radius:9999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#8A93A8; cursor:pointer; transition:all 0.2s;">Susah Tidur</button>
            <button class="bt-quick-chip" data-topic="Pikiranku rasanya cemas berlebih dan terus berputar..." style="white-space:nowrap; font-size:11px; padding:4px 10px; border-radius:9999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#8A93A8; cursor:pointer; transition:all 0.2s;">Cemas Berlebih</button>
            <button class="bt-quick-chip" data-topic="Aku lagi merasa sangat kewalahan dengan keadaan ini..." style="white-space:nowrap; font-size:11px; padding:4px 10px; border-radius:9999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#8A93A8; cursor:pointer; transition:all 0.2s;">Kewalahan</button>
            <button class="bt-quick-chip" data-topic="Aku merasa sendirian dan butuh teman cerita..." style="white-space:nowrap; font-size:11px; padding:4px 10px; border-radius:9999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#8A93A8; cursor:pointer; transition:all 0.2s;">Teman Cerita</button>
          </div>
        </div>

        <!-- Input Area -->
        <div style="padding:10px 14px 12px 14px; background:rgba(26,33,56,0.9); border-top:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; gap:8px;">
          <form id="bt-overlay-form" style="display:flex; align-items:center; gap:8px; margin:0; position:relative;">
            <input id="bt-overlay-input"
                   type="text"
                   placeholder="Ketik ceritamu di sini..."
                   autocomplete="off"
                   style="flex:1; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.15); border-radius:9999px; padding:10px 42px 10px 16px; font-size:13px; color:#FFFFFF; outline:none; transition:border-color 0.2s;"
                   onfocus="this.style.borderColor='#2DD4A8';"
                   onblur="this.style.borderColor='rgba(255,255,255,0.15)';" />
            
            <button id="bt-overlay-send"
                    type="submit"
                    aria-label="Kirim Pesan"
                    style="position:absolute; right:4px; top:50%; transform:translateY(-50%); width:32px; height:32px; border-radius:9999px; background:#2DD4A8; color:#0D1220; border:0; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:transform 0.15s, opacity 0.2s;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D1220" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>

          <!-- Disclaimer Text (Small, Persistent) -->
          <div style="display:flex; align-items:center; gap:6px; font-size:10.5px; color:#FBBF24; opacity:0.85; line-height:1.2; padding:0 4px;">
            <span style="font-size:11px;">💡</span>
            <span style="color:#CBD5E1;">AI ini teman cerita, bukan pengganti psikolog profesional.</span>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(root);
    bubbleEl = document.getElementById('bt-chat-bubble');
    panelEl = document.getElementById('bt-chat-panel');
  }

  /**
   * Mengatur batasan koordinat tombol (Clamping) sesuai breakpoint
   */
  function clampCoordinates(x, y) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const btnW = 54;
    const btnH = 54;
    const isDesktop = W >= 768;

    let clampedX = x;
    let clampedY = y;

    if (isDesktop) {
      // Desktop / Tablet (>= 768px):
      // - Margin tepi minimal 24px
      // - Dijaga di area tepi (hovering near the edges), tidak bebas ke 35% tengah layar
      const minX = 24;
      const maxX = W - btnW - 24;
      const minY = 80; // hindari navbar fixed
      const maxY = H - btnH - 24;

      clampedY = Math.max(minY, Math.min(maxY, y));

      const leftZoneEnd = W * 0.32;
      const rightZoneStart = W * 0.68 - btnW;

      if (x < W / 2) {
        // Area kiri
        clampedX = Math.max(minX, Math.min(leftZoneEnd, x));
      } else {
        // Area kanan
        clampedX = Math.max(rightZoneStart, Math.min(maxX, x));
      }
    } else {
      // Mobile (< 768px):
      // Kebebasan drag lebih tinggi termasuk area tengah layar agar nyaman diatur ibu jari
      const minX = 12;
      const maxX = W - btnW - 12;
      const minY = 70; // hindari navbar mobile
      const maxY = H - btnH - 16;

      clampedX = Math.max(minX, Math.min(maxX, x));
      clampedY = Math.max(minY, Math.min(maxY, y));
    }

    return { x: clampedX, y: clampedY };
  }

  /**
   * Menghitung posisi default tombol (Bottom-Right)
   */
  function getDefaultPosition() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const isDesktop = W >= 768;
    const rightMargin = isDesktop ? 28 : 16;
    const bottomMargin = isDesktop ? 28 : 20;

    return clampCoordinates(W - 54 - rightMargin, H - 54 - bottomMargin);
  }

  /**
   * Memulihkan posisi dari sessionStorage atau default
   */
  function restorePosition() {
    if (!bubbleEl) return;
    try {
      const saved = sessionStorage.getItem(STORAGE_POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const clamped = clampCoordinates(parsed.x, parsed.y);
          currentBtnX = clamped.x;
          currentBtnY = clamped.y;
          applyBubblePosition(clamped.x, clamped.y);
          return;
        }
      }
    } catch (e) {}

    const def = getDefaultPosition();
    currentBtnX = def.x;
    currentBtnY = def.y;
    applyBubblePosition(def.x, def.y);
  }

  function applyBubblePosition(x, y) {
    if (!bubbleEl) return;
    bubbleEl.style.left = `${x}px`;
    bubbleEl.style.top = `${y}px`;
  }

  /**
   * Menyesuaikan posisi popover chat panel agar menempel rapi pada tombol dan tidak overflow layar
   */
  function updatePanelPosition() {
    if (!panelEl || !bubbleEl) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const btnW = 54;
    const btnH = 54;

    const isRightSide = currentBtnX > W / 2;
    const isLowerSide = currentBtnY > H / 2;

    // Horizontal placement
    if (isRightSide) {
      const rightDist = Math.max(14, W - (currentBtnX + btnW));
      panelEl.style.right = `${rightDist}px`;
      panelEl.style.left = 'auto';
    } else {
      const leftDist = Math.max(14, currentBtnX);
      panelEl.style.left = `${leftDist}px`;
      panelEl.style.right = 'auto';
    }

    // Vertical placement
    if (isLowerSide) {
      // Buka ke arah atas
      const bottomDist = Math.max(14, H - currentBtnY + 8);
      panelEl.style.bottom = `${bottomDist}px`;
      panelEl.style.top = 'auto';
    } else {
      // Buka ke arah bawah
      const topDist = Math.max(76, currentBtnY + btnH + 8);
      panelEl.style.top = `${topDist}px`;
      panelEl.style.bottom = 'auto';
    }
  }

  /**
   * Render seluruh riwayat pesan ke dalam container panel overlay
   */
  function renderOverlayMessages(history) {
    const container = document.getElementById('bt-overlay-messages');
    if (!container) return;

    container.innerHTML = '';
    (history || []).forEach(msg => {
      const isUser = msg.role === 'user';
      const bubble = document.createElement('div');
      bubble.style.cssText = `
        display: flex;
        flex-direction: column;
        max-width: 86%;
        align-self: ${isUser ? 'flex-end' : 'flex-start'};
        margin-bottom: 2px;
      `;

      if (isUser) {
        bubble.innerHTML = `
          <div style="background:#2DD4A8; color:#0D1220; font-size:13px; line-height:1.45; padding:9px 13px; border-radius:16px 16px 2px 16px; box-shadow:0 4px 12px rgba(45,212,168,0.25); word-break:break-word;">
            ${escapeHtml(msg.content)}
          </div>
          <span style="font-size:9.5px; color:#5A6478; align-self:flex-end; margin-top:3px;">${formatTime(msg.timestamp)}</span>
        `;
      } else {
        bubble.innerHTML = `
          <div style="background:rgba(255,255,255,0.07); color:#F5F5F5; font-size:13px; line-height:1.5; padding:9px 13px; border-radius:16px 16px 16px 2px; border:1px solid rgba(255,255,255,0.08); box-shadow:0 4px 14px rgba(0,0,0,0.3); word-break:break-word;">
            ${escapeHtml(msg.content)}
          </div>
          <span style="font-size:9.5px; color:#5A6478; align-self:flex-start; margin-top:3px;">${formatTime(msg.timestamp)}</span>
        `;
      }

      container.appendChild(bubble);
    });

    // Auto scroll ke bawah
    container.scrollTop = container.scrollHeight;
  }

  /**
   * Menampilkan indikator mengetik
   */
  function showOverlayTyping() {
    hideOverlayTyping();
    const container = document.getElementById('bt-overlay-messages');
    if (!container) return;

    const typing = document.createElement('div');
    typing.id = 'bt-overlay-typing';
    typing.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      padding: 8px 12px;
      font-size: 11.5px;
      color: #8A93A8;
      align-self: flex-start;
      margin-bottom: 4px;
    `;
    typing.innerHTML = `
      <span>AI sedang mengetik</span>
      <span style="display:inline-flex; gap:2px; font-weight:bold;">
        <span style="animation: pulse 1s infinite;">•</span>
        <span style="animation: pulse 1s infinite 0.2s;">•</span>
        <span style="animation: pulse 1s infinite 0.4s;">•</span>
      </span>
    `;
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
  }

  function hideOverlayTyping() {
    const el = document.getElementById('bt-overlay-typing');
    if (el) el.remove();
  }

  /**
   * Buka panel chat
   */
  function openPanel() {
    if (!panelEl) return;
    isPanelOpen = true;
    if (idleTimer) clearTimeout(idleTimer);
    if (bubbleEl) bubbleEl.style.opacity = ACTIVE_OPACITY;
    updatePanelPosition();

    panelEl.classList.remove('hidden');
    panelEl.style.display = 'flex';
    // Gunakan requestAnimationFrame agar browser me-render display:flex sebelum transisi opacity
    requestAnimationFrame(() => {
      panelEl.style.opacity = '1';
      panelEl.style.transform = 'scale(1)';
    });

    // Berlangganan data history dari service
    if (window.TeduhChatService) {
      if (unsubscribeService) unsubscribeService();
      unsubscribeService = window.TeduhChatService.subscribe(renderOverlayMessages);
    }

    const input = document.getElementById('bt-overlay-input');
    if (input) {
      setTimeout(() => input.focus(), 250);
    }
  }

  /**
   * Tutup panel chat
   */
  function closePanel() {
    if (!panelEl) return;
    isPanelOpen = false;
    panelEl.style.opacity = '0';
    panelEl.style.transform = 'scale(0.96)';

    setTimeout(() => {
      if (!isPanelOpen) {
        panelEl.style.display = 'none';
        panelEl.classList.add('hidden');
      }
    }, 220);

    if (unsubscribeService) {
      unsubscribeService();
      unsubscribeService = null;
    }

    scheduleIdleDim();
  }

  /**
   * Toggle panel
   */
  function togglePanel() {
    if (isPanelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  /**
   * Pasang Drag & Tap Handler dengan Pointer Events
   */
  function initDragHandlers() {
    if (!bubbleEl) return;

    // Hover (mouse enter / leave)
    bubbleEl.addEventListener('mouseenter', () => {
      isHovered = true;
      if (bubbleEl) bubbleEl.style.opacity = ACTIVE_OPACITY;
      if (idleTimer) clearTimeout(idleTimer);
    });

    bubbleEl.addEventListener('mouseleave', () => {
      isHovered = false;
      scheduleIdleDim();
    });

    function onPointerMove(e) {
      if (!isDragging) return;

      const dx = e.clientX - startPointerX;
      const dy = e.clientY - startPointerY;
      const dist = Math.hypot(dx, dy);

      if (dist > DRAG_THRESHOLD) {
        hasPointerMoved = true;
        wakeBubble();
        const targetX = initialBtnX + dx;
        const targetY = initialBtnY + dy;
        const clamped = clampCoordinates(targetX, targetY);

        currentBtnX = clamped.x;
        currentBtnY = clamped.y;
        applyBubblePosition(clamped.x, clamped.y);

        if (isPanelOpen) {
          updatePanelPosition();
        }
      }
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      bubbleEl.removeEventListener('pointerup', onPointerUp);
      bubbleEl.removeEventListener('pointercancel', onPointerUp);

      try {
        if (bubbleEl.releasePointerCapture && e.pointerId !== undefined) {
          bubbleEl.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}

      bubbleEl.style.cursor = 'grab';
      bubbleEl.style.transition = 'box-shadow 0.2s ease, transform 0.15s ease, opacity 0.4s ease';
      isHovered = false;
      scheduleIdleDim();

      if (hasPointerMoved) {
        // Gerakan DRAG: simpan posisi baru ke sessionStorage
        try {
          sessionStorage.setItem(STORAGE_POS_KEY, JSON.stringify({
            x: currentBtnX,
            y: currentBtnY
          }));
        } catch (err) {}
      } else {
        // Gerakan TAP (dibawah threshold): toggle buka/tutup chat panel
        togglePanel();
      }
    }

    bubbleEl.addEventListener('pointerdown', (e) => {
      // Hanya terima primary click / tap
      if (e.button !== 0) return;

      isDragging = true;
      hasPointerMoved = false;
      wakeBubble();
      startPointerX = e.clientX;
      startPointerY = e.clientY;
      initialBtnX = currentBtnX;
      initialBtnY = currentBtnY;

      try {
        if (bubbleEl.setPointerCapture && e.pointerId !== undefined) {
          bubbleEl.setPointerCapture(e.pointerId);
        }
      } catch (err) {}
      bubbleEl.style.cursor = 'grabbing';
      bubbleEl.style.transition = 'none'; // hapus transisi saat dragging agar instan 60fps

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
      bubbleEl.addEventListener('pointerup', onPointerUp);
      bubbleEl.addEventListener('pointercancel', onPointerUp);
    });

    // Keyboard accessibility (Space / Enter)
    bubbleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePanel();
      }
    });
  }

  /**
   * Pasang Form Kirim Pesan & Event Panel
   */
  function initPanelEvents() {
    const form = document.getElementById('bt-overlay-form');
    const input = document.getElementById('bt-overlay-input');
    const sendBtn = document.getElementById('bt-overlay-send');
    const closeBtn = document.getElementById('bt-chat-close-btn');

    if (closeBtn) {
      closeBtn.addEventListener('click', closePanel);
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = (input ? input.value : '').trim();
        if (!text) return;

        input.value = '';
        showOverlayTyping();
        if (sendBtn) {
          sendBtn.disabled = true;
          sendBtn.style.opacity = '0.5';
        }

        try {
          if (window.TeduhChatService) {
            await window.TeduhChatService.sendMessage(text);
          }
        } catch (err) {
          console.error('[TeduhOverlay] Send error:', err);
        } finally {
          hideOverlayTyping();
          if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
          }
          if (input) input.focus();
        }
      });
    }

    // Quick chips click handler
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('.bt-quick-chip');
      if (chip && input && form) {
        const topic = chip.getAttribute('data-topic') || chip.textContent.trim();
        input.value = topic;
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });

    // Resize event: jaga posisi selalu dalam batas layar
    window.addEventListener('resize', () => {
      const clamped = clampCoordinates(currentBtnX, currentBtnY);
      currentBtnX = clamped.x;
      currentBtnY = clamped.y;
      applyBubblePosition(clamped.x, clamped.y);
      if (isPanelOpen) {
        updatePanelPosition();
      }
    });
  }

  /**
   * Memeriksa apakah halaman saat ini adalah halaman Konsultasi dengan section AI aktif
   */
  function checkKonsultasiPageStatus() {
    const isKonsultasiPage = window.location.pathname.includes('konsultasi') ||
                             (document.body && document.body.dataset.page === 'konsultasi');
    if (!isKonsultasiPage) return;

    const viewAi = document.getElementById('chat-ai-view');
    const isAiTabActive = (viewAi && !viewAi.classList.contains('hidden')) ||
                          window.location.hash.toLowerCase().includes('ai');

    if (isAiTabActive) {
      hideBubble();
    } else {
      showBubble();
    }
  }

  // Tangani event ganti tab dari halaman konsultasi
  window.addEventListener('bt-konsultasi-tab', (e) => {
    if (e.detail && e.detail.tab === 'ai') {
      hideBubble();
    } else {
      showBubble();
    }
  });

  window.addEventListener('hashchange', checkKonsultasiPageStatus);

  /**
   * Inisialisasi Utama
   */
  function init() {
    injectOverlayDOM();
    restorePosition();
    initDragHandlers();
    initPanelEvents();
    checkKonsultasiPageStatus();
    scheduleIdleDim();
    setTimeout(checkKonsultasiPageStatus, 250);
  }

  // Jalankan ketika DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TeduhChatOverlay = {
    hide: hideBubble,
    show: showBubble,
    open: openPanel,
    close: closePanel,
    toggle: togglePanel
  };
  window.initTeduhChatOverlay = init;

})();
