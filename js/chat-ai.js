/**
 * js/chat-ai.js — View Pengontrol Chat AI pada Halaman Konsultasi
 * Terintegrasi penuh dengan TeduhChatService dan localStorage 'bt_ai_chat_history'
 */

(function () {
  'use strict';

  function initKonsultasiChat() {
    const $chatContainer = $("#chat-container");
    const $chatInput = $("#chat-input");
    const $sendBtn = $("#chat-send-btn");

    if (!$chatContainer.length) return;

    function scrollToBottom() {
      if ($chatContainer.length && $chatContainer[0]) {
        $chatContainer.scrollTop($chatContainer[0].scrollHeight);
      }
    }

    /**
     * Render seluruh percakapan dari riwayat terpadu
     */
    function renderHistory(history) {
      $chatContainer.empty();
      (history || []).forEach(msg => {
        let bubbleHtml = "";
        if (msg.role === "user") {
          bubbleHtml = `
            <div class="flex items-start gap-3 w-[90%] md:w-5/6 self-end flex-row-reverse">
              <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold bg-gray-600 text-white">KM</div>
              <div class="p-4 rounded-2xl rounded-tr-none text-sm shadow-md" style="background:#2DD4A8; color:#0D1220;">
                ${escapeHtml(msg.content)}
              </div>
            </div>
          `;
        } else {
          bubbleHtml = `
            <div class="flex items-start gap-3 w-[90%] md:w-5/6">
              <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold shadow-md" style="background:#2DD4A8; color:#0D1220;">AI</div>
              <div class="p-4 rounded-2xl rounded-tl-none text-sm leading-relaxed border border-white/5 shadow-md" style="background:rgba(255,255,255,0.05); color:#F5F5F5;">
                ${escapeHtml(msg.content)}
              </div>
            </div>
          `;
        }
        $chatContainer.append(bubbleHtml);
      });
      scrollToBottom();
    }

    function addTypingIndicator() {
      removeTypingIndicator();
      const typingHtml = `
        <div id="typing-indicator" class="flex items-start gap-3 w-[90%] md:w-5/6">
          <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold" style="background:#2DD4A8; color:#0D1220;">AI</div>
          <div class="p-4 rounded-2xl rounded-tl-none text-sm text-gray-400 italic flex items-center gap-1.5" style="background:rgba(255,255,255,0.05);">
            <span>Mengetik pesan</span>
            <span class="inline-flex gap-1">
              <span class="animate-bounce">.</span>
              <span class="animate-bounce" style="animation-delay:0.2s">.</span>
              <span class="animate-bounce" style="animation-delay:0.4s">.</span>
            </span>
          </div>
        </div>
      `;
      $chatContainer.append(typingHtml);
      scrollToBottom();
    }

    function removeTypingIndicator() {
      $("#typing-indicator").remove();
    }

    function escapeHtml(text) {
      if (!text) return "";
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // Pastikan service tersedia
    if (!window.TeduhChatService) {
      console.warn('[TeduhChat] TeduhChatService belum terload. Menunggu...');
      window.addEventListener('bt-chat-service-ready', initKonsultasiChat, { once: true });
      return;
    }

    // Berlangganan perubahan riwayat (sinkronisasi dua arah otomatis)
    window.TeduhChatService.subscribe(renderHistory);

    /**
     * Handler pengiriman pesan
     */
    async function handleSend() {
      const text = $chatInput.val().trim();
      if (!text) return;

      $chatInput.val("");
      addTypingIndicator();
      $sendBtn.prop("disabled", true).css("opacity", "0.5");

      try {
        await window.TeduhChatService.sendMessage(text);
      } catch (err) {
        console.error('[TeduhChat] Send error:', err);
      } finally {
        removeTypingIndicator();
        $sendBtn.prop("disabled", false).css("opacity", "1");
        $chatInput.focus();
      }
    }

    // Event Listeners
    $sendBtn.off("click").on("click", handleSend);
    $chatInput.off("keypress").on("keypress", function (e) {
      if (e.which === 13) {
        handleSend();
      }
    });

    // Handler untuk Quick-Select Topics (Chip buttons)
    $(document).off("click", ".quick-chip").on("click", ".quick-chip", function () {
      const topicText = $(this).attr("data-topic") || $(this).text().trim();
      $chatInput.val(topicText);
      handleSend();
    });
  }

  // Inisialisasi saat DOM dan jQuery siap
  if (typeof jQuery !== 'undefined') {
    $(document).ready(initKonsultasiChat);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      if (typeof jQuery !== 'undefined') {
        initKonsultasiChat();
      }
    });
  }

  window.initKonsultasiChat = initKonsultasiChat;

})();
