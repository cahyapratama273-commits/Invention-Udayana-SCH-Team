$(document).ready(function() {
  // API Key GEMINI 
  const apiKeys = [
    "YOUR_API_KEY_1", // API akan otomatis swap ke key berikutnya jika sudah mencapai limit
    "YOUR_API_KEY_2", 
    "YOUR_API_KEY_3", 
    "YOUR_API_KEY_4", 
    "YOUR_API_KEY_5"
  ].filter(key => key && !key.startsWith("YOUR_API_KEY"));

  let currentKeyIndex = 0;
  
  // History chat internal, jadi system prompt tidak dikirim di awal, diset ke payload
  let chatHistory = [];

  const $chatContainer = $("#chat-container");
  const $chatInput = $("#chat-input");
  const $sendBtn = $("#chat-send-btn");

  // Inisialisasi sapaan awal
  $chatContainer.empty();
  const initialMessage = "Halo! Saya asisten virtual BerTeduh. Ada yang sedang mengganggu pikiranmu hari ini? Ceritakan saja perlahan-lahan.";
  
  // Tampilkan bubble awal
  addBubble("model", initialMessage);
  // Simpan ke history agar Gemini tau konteksnya
  chatHistory.push({ role: "model", parts: [{ text: initialMessage }] });

  /**
   * Menggulir chat ke paling bawah
   */
  function scrollToBottom() {
    $chatContainer.scrollTop($chatContainer[0].scrollHeight);
  }

  /**
   * Menambahkan bubble ke UI
   */
  function addBubble(role, text) {
    let bubbleHtml = "";
    if (role === "user") {
      bubbleHtml = `
        <div class="flex items-start gap-3 w-[90%] md:w-5/6 self-end flex-row-reverse">
          <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold bg-gray-600 text-white">KM</div>
          <div class="p-4 rounded-2xl rounded-tr-none text-sm" style="background:#2DD4A8; color:#0D1220;">
            ${text}
          </div>
        </div>
      `;
    } else {
      bubbleHtml = `
        <div class="flex items-start gap-3 w-[90%] md:w-5/6">
          <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold" style="background:#2DD4A8; color:#0D1220;">AI</div>
          <div class="p-4 rounded-2xl rounded-tl-none text-sm leading-relaxed" style="background:rgba(255,255,255,0.05); color:#F5F5F5;">
            ${text}
          </div>
        </div>
      `;
    }
    $chatContainer.append(bubbleHtml);
    scrollToBottom();
  }

  /**
   * Menambahkan efek "AI sedang mengetik..."
   */
  function addTypingIndicator() {
    const typingHtml = `
      <div id="typing-indicator" class="flex items-start gap-3 w-[90%] md:w-5/6">
        <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold" style="background:#2DD4A8; color:#0D1220;">AI</div>
        <div class="p-4 rounded-2xl rounded-tl-none text-sm text-gray-400 italic" style="background:rgba(255,255,255,0.05);">
          Mengetik pesan...
        </div>
      </div>
    `;
    $chatContainer.append(typingHtml);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    $("#typing-indicator").remove();
  }

  /**
   * Logika memutar (swap) API Key jika kena limit (error 429)
   */
  function rotateApiKey() {
    if (apiKeys.length > 1) {
      const oldIndex = currentKeyIndex;
      currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
      console.warn(`[WARNING] API Key #${oldIndex + 1} Limit. Swapping ke API Key #${currentKeyIndex + 1}`);
      return true;
    }
    return false;
  }

  /**
   * Memanggil API Gemini (terstruktur dan mendukung retry otomatis)
   */
  async function fetchGeminiResponse(retryCount = 0) {
    if (apiKeys.length === 0) {
      return "Silakan konfigurasi API Key terlebih dahulu di file js/chat-ai.js";
    }

    const apiKey = apiKeys[currentKeyIndex];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `Anda adalah asisten virtual bernama 'AI BerTeduh'.
Anda adalah teman ngobrol yang profesional, hangat, berempati, dan pengertian terkait kesehatan mental.
Tugas Anda:
1. Menjadi pendengar yang baik untuk keluh kesah pengguna.
2. Memberikan saran ringan (seperti relaksasi, napas dalam) jika mereka cemas.
3. Selalu ingatkan bahwa Anda adalah AI dan BUKAN pengganti psikolog profesional. Sarankan psikolog jika depresi berat.
4. Gunakan bahasa Indonesia yang santai tapi sopan (seperti mengobrol dengan teman bijak).`;

    const payload = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: chatHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("RATE_LIMIT");
        }
        throw new Error(data.error?.message || "API Error");
      }

      return data.candidates[0].content.parts[0].text;

    } catch (error) {
      if (error.message === "RATE_LIMIT" && retryCount < apiKeys.length - 1) {
        rotateApiKey();
        return fetchGeminiResponse(retryCount + 1); // Rekursif ke API key selanjutnya
      }
      console.error("Gemini API Error:", error);
      return "Maaf, sistem AI sedang sibuk atau mengalami gangguan jaringan. Silakan coba sesaat lagi.";
    }
  }

  /**
   * Event handler saat user menekan kirim
   */
  async function handleSend() {
    const text = $chatInput.val().trim();
    if (!text) return;

    // 1. Tampilkan di UI & simpan di history
    $chatInput.val("");
    addBubble("user", text);
    
    chatHistory.push({ role: "user", parts: [{ text: text }] });

    // 2. Munculkan loading
    addTypingIndicator();
    $sendBtn.prop("disabled", true).css("opacity", "0.5");

    // 3. Panggil API
    const botReply = await fetchGeminiResponse();

    // 4. Hapus loading, tampilkan balasan & simpan di history
    removeTypingIndicator();
    $sendBtn.prop("disabled", false).css("opacity", "1");
    
    addBubble("model", botReply);
    chatHistory.push({ role: "model", parts: [{ text: botReply }] });
  }

  // Event Listeners
  $sendBtn.on("click", handleSend);
  $chatInput.on("keypress", function(e) {
    if (e.which === 13) {
      handleSend();
    }
  });

});
