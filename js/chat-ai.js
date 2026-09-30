/**
 * js/chat-ai.js — Logika Antarmuka Chat AI (Teman Cerita AI) pada Halaman Konsultasi
 * 
 * Script ini mengendalikan antarmuka percakapan AI layar penuh di halaman Konsultasi:
 * 1. Menggunakan Pure Vanilla JavaScript (tanpa dependensi jQuery).
 * 2. Terhubung langsung dengan TeduhChatService sebagai single source of truth riwayat.
 * 3. Menangani pengiriman pesan, animasi indikator mengetik, dan tombol Reset Sesi.
 * 4. Mendukung pemilihan topik cepat (Quick Suggestion Prompts).
 */

(function () {
  'use strict';

  function initKonsultasiChat() {
    const container = document.getElementById("ai-messages-container") || document.getElementById("chat-container");
    const input = document.getElementById("ai-chat-input") || document.getElementById("chat-input");
    const sendBtn = document.getElementById("ai-send-btn") || document.getElementById("chat-send-btn");
    const form = document.getElementById("ai-chat-form");
    const clearBtn = document.getElementById("ai-clear-btn");
    const quickPromptsContainer = document.getElementById("ai-quick-prompts");

    if (!container) return;

    /**
     * Sanitasi teks untuk mencegah injeksi HTML jahat (XSS)
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
     * Menggulir (scroll) area pesan otomatis ke posisi paling bawah
     */
    function scrollToBottom() {
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }

    /**
     * Merender seluruh gelembung percakapan dari riwayat bersama
     */
    function renderHistory(history) {
      container.innerHTML = "";
      (history || []).forEach(msg => {
        const isUser = msg.role === "user";
        const wrapper = document.createElement("div");
        wrapper.className = `flex items-start gap-3 w-[90%] md:w-5/6 ${isUser ? "self-end flex-row-reverse" : ""}`;

        if (isUser) {
          wrapper.innerHTML = `
            <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold bg-slate-700 text-white shadow-sm">KM</div>
            <div class="p-4 rounded-2xl rounded-tr-none text-sm shadow-md" style="background:#2DD4A8; color:#0D1220;">
              ${escapeHtml(msg.content)}
            </div>
          `;
        } else {
          wrapper.innerHTML = `
            <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold shadow-md" style="background:#2DD4A8; color:#0D1220;">
              <i class="ph ph-sparkle text-sm"></i>
            </div>
            <div class="p-4 rounded-2xl rounded-tl-none text-sm leading-relaxed border border-white/10 shadow-md" style="background:#1A2138; color:#F5F5F5;">
              ${escapeHtml(msg.content)}
            </div>
          `;
        }

        container.appendChild(wrapper);
      });
      scrollToBottom();
    }

    /**
     * Menampilkan animasi indikator "AI sedang mengetik..."
     */
    function showTypingIndicator() {
      removeTypingIndicator();
      const typingEl = document.createElement("div");
      typingEl.id = "ai-typing-indicator";
      typingEl.className = "flex items-start gap-3 w-[90%] md:w-5/6";
      typingEl.innerHTML = `
        <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold" style="background:#2DD4A8; color:#0D1220;">
          <i class="ph ph-sparkle text-sm"></i>
        </div>
        <div class="p-4 rounded-2xl rounded-tl-none text-sm text-gray-400 italic flex items-center gap-1.5 border border-white/5" style="background:#1A2138;">
          <span>Teman Cerita AI sedang mengetik</span>
          <span class="inline-flex gap-1">
            <span class="animate-bounce">.</span>
            <span class="animate-bounce" style="animation-delay:0.2s">.</span>
            <span class="animate-bounce" style="animation-delay:0.4s">.</span>
          </span>
        </div>
      `;
      container.appendChild(typingEl);
      scrollToBottom();
    }

    /**
     * Menghapus indikator mengetik
     */
    function removeTypingIndicator() {
      const existing = document.getElementById("ai-typing-indicator");
      if (existing) existing.remove();
    }

    // Pastikan service chat utama sudah dimuat
    if (!window.TeduhChatService) {
      window.addEventListener('bt-chat-service-ready', initKonsultasiChat, { once: true });
      return;
    }

    // Berlangganan data riwayat bersama
    window.TeduhChatService.subscribe(renderHistory);

    /**
     * Handler pengiriman pesan user
     */
    async function handleSend() {
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;

      input.value = "";
      showTypingIndicator();
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.style.opacity = "0.5";
      }

      try {
        await window.TeduhChatService.sendMessage(text);
      } catch (err) {
        console.error('[TeduhChat] Gagal mengirim pesan:', err);
      } finally {
        removeTypingIndicator();
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.style.opacity = "1";
        }
        input.focus();
      }
    }

    // Event listener kirim pesan melalui form atau tombol
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        handleSend();
      });
    } else if (sendBtn) {
      sendBtn.addEventListener("click", handleSend);
    }

    if (input) {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      });
    }

    // Tombol Reset Sesi dengan konfirmasi dialog
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (window.TeduhChatService) {
          window.TeduhChatService.clearHistory(true);
        }
      });
    }

    // Tombol saran cepat (Quick Prompts)
    document.addEventListener("click", (e) => {
      const promptBtn = e.target.closest(".quick-prompt-btn") || e.target.closest(".quick-chip");
      if (promptBtn && input) {
        let topicText = promptBtn.getAttribute("data-topic") || promptBtn.textContent.trim();
        topicText = topicText.replace(/^["']|["']$/g, '');
        input.value = topicText;
        handleSend();
      }
    });
  }

  // Inisialisasi saat dokumen siap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initKonsultasiChat);
  } else {
    initKonsultasiChat();
  }

  window.initKonsultasiChat = initKonsultasiChat;

})();
