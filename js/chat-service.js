/**
 * js/chat-service.js — Layanan Chat AI Terpadu BerTeduh
 * 
 * Modul ini merupakan inti (backend/service layer) percakapan AI di BerTeduh:
 * 1. Mendukung eksekusi di Localhost (VS Code Live Server) tanpa backend dengan rotasi API Key Gemini langsung via client-side.
 * 2. Mendukung eksekusi di Vercel Hosting Production via Serverless Function (/api/chat).
 * 3. Mendukung eksekusi di Netlify Hosting Fallback via Netlify Function (/.netlify/functions/chat).
 * 4. Menyimpan dan menyinkronkan seluruh riwayat obrolan di localStorage ('bt_ai_chat_history') 
 *    secara real-time antar-tab dan antar-komponen (Chat Overlay & Halaman Konsultasi).
 */

(function () {
  'use strict';

  // Kunci penyimpanan riwayat obrolan di localStorage browser
  const STORAGE_KEY = 'bt_ai_chat_history';

  // Pesan sapaan pertama kali dari Teman AI
  const INITIAL_MESSAGE = "Halo! Aku asisten virtual BerTeduh. Ada yang lagi mengganggu pikiranmu hari ini? Ceritakan santai aja ya, aku siap dengerin.";

  // Instruksi kepribadian dan batasan etika AI BerTeduh
  const SYSTEM_PROMPT = `Kamu adalah "Teman AI BerTeduh" — pendamping percakapan ringan di
website BerTeduh, sebuah ruang kesehatan mental untuk remaja/pelajar Indonesia. BerTeduh
berperan sebagai JEMBATAN menuju sumber bantuan yang tepat, bukan pengganti tenaga
profesional.

FITUR-FITUR BERTEDUH YANG BISA KAMU SEBUT/SARANKAN SAAT RELEVAN:
- Cek Emosi: kuesioner singkat yang mengelompokkan kondisi pengguna jadi "baik", "cemas",
  atau "berat".
- Relaksasi: latihan pernapasan ritmis (4-7-8, box breathing, dsb) dan panduan gerakan
  yoga sederhana.
- Blog (Ruang Baca): artikel yang direkomendasikan sesuai kondisi emosi pengguna.
- Konsultasi Psikolog: jembatan ke psikolog profesional.

ATURAN UTAMA:
- Kamu BUKAN psikolog atau tenaga medis. Jangan pernah mendiagnosis kondisi apa pun.
- Gaya bicara: hangat, santai, seperti teman dekat yang nggak menghakimi (pakai "kamu", "nggak", dst).
- Fokus memvalidasi perasaan dulu — jangan buru-buru menyodorkan solusi.
- Kalau ada indikasi krisis (ingin mengakhiri hidup / menyakiti diri): SEGERA arahkan ke
  LISA Helpline atau layanan darurat.
- Jawaban singkat dan padat (2-4 kalimat), bukan esai panjang.`;

  // Daftar model Gemini yang digunakan dengan sistem rotasi otomatis jika model sibuk
  const GEMINI_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.8-flash"
  ];
  
  // Endpoint serverless function untuk hosting production
  const VERCEL_ENDPOINT = '/api/chat';
  const NETLIFY_ENDPOINT = '/.netlify/functions/chat';

  // Set observer / subscriber UI yang mendengarkan perubahan data chat
  const subscribers = new Set();
  let cachedEnvKeys = null;     // Cache API keys agar tidak membaca berulang-ulang
  let currentKeyIndex = 0;      // Indeks kunci API aktif untuk rotasi saat kuota limit tercapai

  // Deteksi lingkungan localhost: jika di localhost, pastikan env.js dimuat secara otomatis
  const isLocalHost = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');
  if (isLocalHost && (!window.__ENV || !window.__ENV.GEMINI_API_KEYS)) {
    if (!document.querySelector('script[src*="env.js"]')) {
      const s = document.createElement('script');
      s.src = '/env.js';
      s.async = false;
      document.head.appendChild(s);
    }
  }

  /**
   * Mengambil riwayat percakapan dari localStorage browser
   */
  function getHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[TeduhChat] Gagal membaca riwayat dari localStorage:', e);
    }

    // Jika belum ada riwayat, buat pesan sapaan default awal
    const defaultHistory = [
      {
        role: "model",
        content: INITIAL_MESSAGE,
        timestamp: Date.now()
      }
    ];
    saveHistory(defaultHistory, false);
    return defaultHistory;
  }

  /**
   * Menyimpan riwayat percakapan ke localStorage dan memberitahu seluruh subscriber UI
   */
  function saveHistory(history, notify = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('[TeduhChat] Gagal menyimpan riwayat ke localStorage:', e);
    }
    if (notify) {
      notifySubscribers(history);
    }
  }

  /**
   * Mengirim notifikasi pembaruan percakapan ke semua komponen UI (overlay & layar penuh)
   */
  function notifySubscribers(history = null) {
    const data = history || getHistory();
    subscribers.forEach(cb => {
      try { cb(data); } catch (e) { console.error('[TeduhChat] Error pada subscriber callback:', e); }
    });
    try {
      window.dispatchEvent(new CustomEvent('bt-ai-chat-updated', { detail: data }));
    } catch (e) {}
  }

  /**
   * Mendaftarkan fungsi callback listener untuk memantau perubahan isi percakapan
   */
  function subscribe(callback) {
    if (typeof callback === 'function') {
      subscribers.add(callback);
      callback(getHistory()); // Langsung kirimkan data riwayat saat ini
      return () => subscribers.delete(callback); // Return fungsi untuk unsubscribe
    }
    return () => {};
  }

  /**
   * Menghapus riwayat percakapan dan memulai kembali dari pesan sapaan awal
   */
  function clearHistory() {
    const fresh = [
      {
        role: "model",
        content: INITIAL_MESSAGE,
        timestamp: Date.now()
      }
    ];
    saveHistory(fresh, true);
    return fresh;
  }

  /**
   * Mengambil daftar API Keys Gemini yang tersedia untuk lingkungan pengujian lokal (VS Code Live Server)
   */
  async function getLocalEnvKeys() {
    if (cachedEnvKeys && cachedEnvKeys.length > 0) return cachedEnvKeys;
    const keys = [];

    // 1. Cek objek window.__ENV dari file env.js
    if (window.__ENV && Array.isArray(window.__ENV.GEMINI_API_KEYS)) {
      window.__ENV.GEMINI_API_KEYS.forEach(k => {
        if (k && typeof k === 'string' && !k.startsWith('YOUR_') && !keys.includes(k.trim())) {
          keys.push(k.trim());
        }
      });
    }

    // 2. Cek apakah ada key yang disimpan di localStorage
    for (let i = 1; i <= 20; i++) {
      const k = localStorage.getItem(`GEMINI_API_KEY_${i}`);
      if (k && !keys.includes(k.trim())) keys.push(k.trim());
    }
    const single = localStorage.getItem('GEMINI_API_KEY');
    if (single && !keys.includes(single.trim())) keys.push(single.trim());

    // 3. Fallback jika script env.js masih dalam proses pemuatan di background
    if (keys.length === 0 && isLocalHost) {
      await new Promise(r => setTimeout(r, 120));
      if (window.__ENV && Array.isArray(window.__ENV.GEMINI_API_KEYS)) {
        window.__ENV.GEMINI_API_KEYS.forEach(k => {
          if (k && typeof k === 'string' && !k.startsWith('YOUR_') && !keys.includes(k.trim())) {
            keys.push(k.trim());
          }
        });
      }
    }

    cachedEnvKeys = keys;
    return keys;
  }

  /**
   * Melakukan pemanggilan langsung ke Google Gemini API secara client-side dengan rotasi kunci & model
   */
  async function callDirectGemini(history) {
    const keys = await getLocalEnvKeys();
    if (keys.length === 0) {
      return "Halo! Kunci API Gemini belum terbaca di env.js lokal. Pastikan file env.js sudah ada dengan GEMINI_API_KEYS agar AI bisa langsung menjawab di localhost.";
    }

    // Format riwayat chat sesuai skema API Gemini
    const contents = history.map(item => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.content }]
    }));

    let lastErr = null;
    // Loop mencoba setiap model Gemini yang tersedia
    for (const model of GEMINI_MODELS) {
      // Loop rotasi seluruh kunci API jika terjadi batas kuota (Rate Limit)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[(currentKeyIndex + i) % keys.length];
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
              contents: contents,
              generationConfig: { temperature: 0.8, maxOutputTokens: 300 }
            })
          });

          if (response.ok) {
            currentKeyIndex = (currentKeyIndex + i) % keys.length; // Simpan index key yang sukses
            const data = await response.json();
            const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (reply) return reply;
          } else {
            lastErr = new Error(`Gemini ${model} status ${response.status}`);
            // Jika model sedang overload (503) atau tidak ditemukan (404), langsung beralih ke model berikutnya
            if (response.status === 503 || response.status === 404) {
              break;
            }
          }
        } catch (e) {
          lastErr = e;
        }
      }
    }

    console.warn('[TeduhChat] Error rotasi Gemini langsung:', lastErr);
    return "Terima kasih sudah bercerita. Napas pelan-pelan ya. Apa yang kamu rasakan itu valid dan wajar. Jika kamu butuh ruang bicara yang lebih mendalam, konsultan berlisensi BerTeduh selalu siap membantumu di halaman Konsultasi.";
  }

  /**
   * Mengirim pesan user, menyimpan riwayat, dan mengambil respons AI
   */
  async function sendMessage(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;

    // 1. Tambahkan pesan user ke riwayat obrolan
    const currentHistory = getHistory();
    const userMsg = {
      role: "user",
      content: trimmed,
      timestamp: Date.now()
    };

    currentHistory.push(userMsg);
    saveHistory(currentHistory, true);

    let botReply = "";

    // Deteksi apakah sedang berjalan di Live Server lokal (port 5500, 5501, 5502, atau protocol file)
    const isLiveServer = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') &&
                         (window.location.port === '5500' || window.location.port === '5501' || window.location.port === '5502' || !window.location.port || window.location.protocol === 'file:');

    if (!isLiveServer) {
      // 2. Jalur Utama Hosting: Panggil Vercel Serverless Function (/api/chat)
      try {
        let apiRes = await fetch(VERCEL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: currentHistory })
        }).catch(() => null);

        // Fallback jika di-deploy di Netlify Hosting
        if (!apiRes || !apiRes.ok) {
          const netlifyRes = await fetch(NETLIFY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: currentHistory })
          }).catch(() => null);

          if (netlifyRes && netlifyRes.ok) {
            apiRes = netlifyRes;
          }
        }

        if (apiRes && apiRes.ok) {
          const json = await apiRes.json();
          botReply = json.reply || json.content || "";
        }
      } catch (err) {
        console.warn('[TeduhChat] Gagal memanggil serverless backend:', err);
      }
    }

    // 3. Jika di Live Server lokal ATAU jika serverless function belum tersedia:
    if (!botReply) {
      botReply = await callDirectGemini(currentHistory);
    }

    // 4. Fallback jika kuota habis / offline
    if (!botReply) {
      botReply = "Terima kasih sudah bercerita. Napas pelan-pelan ya. Apa yang kamu rasakan itu valid dan wajar. Jika kamu butuh ruang bicara yang lebih mendalam, konsultan berlisensi BerTeduh selalu siap membantumu di halaman Konsultasi.";
    }

    // 5. Simpan respons AI ke riwayat obrolan
    const modelMsg = {
      role: "model",
      content: botReply,
      timestamp: Date.now()
    };

    const updatedHistory = getHistory();
    updatedHistory.push(modelMsg);
    saveHistory(updatedHistory, true);

    return botReply;
  }

  // Sinkronisasi otomatis antar-tab browser menggunakan event 'storage'
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      try {
        const newHistory = JSON.parse(e.newValue || '[]');
        notifySubscribers(newHistory);
      } catch (err) {}
    }
  });

  // Ekspor service API singleton ke objek global window
  window.TeduhChatService = {
    getHistory,
    saveHistory,
    clearHistory,
    subscribe,
    sendMessage,
    notifySubscribers
  };

  // Kirim event pemberitahuan bahwa layanan chat sudah siap dipakai
  try {
    window.dispatchEvent(new Event('bt-chat-service-ready'));
  } catch (e) {}

})();
