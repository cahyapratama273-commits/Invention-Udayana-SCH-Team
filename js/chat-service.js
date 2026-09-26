/**
 * js/chat-service.js — Layanan Chat AI Terpadu BerTeduh
 * Bekerja mulus di:
 * 1. Localhost (VS Code Live Server) via pemanggilan langsung client-side dengan rotasi key (env.js / localStorage) tanpa error 404/405.
 * 2. Vercel Hosting (Production) via Vercel Serverless Function (/api/chat).
 * 3. Netlify Hosting (Fallback) via Netlify Function (/.netlify/functions/chat).
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'bt_ai_chat_history';
  const INITIAL_MESSAGE = "Halo! Aku asisten virtual BerTeduh. Ada yang lagi mengganggu pikiranmu hari ini? Ceritakan santai aja ya, aku siap dengerin.";

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

  const GEMINI_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.8-flash"
  ];
  const VERCEL_ENDPOINT = '/api/chat';
  const NETLIFY_ENDPOINT = '/.netlify/functions/chat';

  const subscribers = new Set();
  let cachedEnvKeys = null;
  let currentKeyIndex = 0;

  // Di localhost, pastikan env.js dimuat jika belum ada
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
   * Mengambil riwayat percakapan dari localStorage.
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
      console.warn('[TeduhChat] Error reading history from localStorage:', e);
    }

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
   * Menyimpan riwayat percakapan ke localStorage dan memberitahu observer.
   */
  function saveHistory(history, notify = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('[TeduhChat] Error saving history to localStorage:', e);
    }
    if (notify) {
      notifySubscribers(history);
    }
  }

  /**
   * Memberitahu semua subscriber UI (overlay & konsultasi full view)
   */
  function notifySubscribers(history = null) {
    const data = history || getHistory();
    subscribers.forEach(cb => {
      try { cb(data); } catch (e) { console.error('[TeduhChat] Subscriber error:', e); }
    });
    try {
      window.dispatchEvent(new CustomEvent('bt-ai-chat-updated', { detail: data }));
    } catch (e) {}
  }

  /**
   * Berlangganan perubahan percakapan
   */
  function subscribe(callback) {
    if (typeof callback === 'function') {
      subscribers.add(callback);
      callback(getHistory());
      return () => subscribers.delete(callback);
    }
    return () => {};
  }

  /**
   * Reset riwayat percakapan
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
   * Membaca API Keys Gemini untuk pengujian lokal di VS Code Live Server.
   * Sumber: window.__ENV (dari file env.js) dan localStorage.
   * Catatan: Tidak memanggil fetch('/.env') agar tidak memicu error 404 di Live Server.
   */
  async function getLocalEnvKeys() {
    if (cachedEnvKeys && cachedEnvKeys.length > 0) return cachedEnvKeys;
    const keys = [];

    // 1. Cek window.__ENV (dari file env.js)
    if (window.__ENV && Array.isArray(window.__ENV.GEMINI_API_KEYS)) {
      window.__ENV.GEMINI_API_KEYS.forEach(k => {
        if (k && typeof k === 'string' && !k.startsWith('YOUR_') && !keys.includes(k.trim())) {
          keys.push(k.trim());
        }
      });
    }

    // 2. Cek localStorage
    for (let i = 1; i <= 20; i++) {
      const k = localStorage.getItem(`GEMINI_API_KEY_${i}`);
      if (k && !keys.includes(k.trim())) keys.push(k.trim());
    }
    const single = localStorage.getItem('GEMINI_API_KEY');
    if (single && !keys.includes(single.trim())) keys.push(single.trim());

    // 3. Fallback jika script env.js sedang loading
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
   * Panggilan langsung ke Gemini API (khusus ketika di Live Server lokal tanpa backend)
   */
  async function callDirectGemini(history) {
    const keys = await getLocalEnvKeys();
    if (keys.length === 0) {
      return "Halo! Kunci API Gemini belum terbaca di env.js lokal. Pastikan file env.js sudah ada dengan GEMINI_API_KEYS agar AI bisa langsung menjawab di localhost.";
    }

    const contents = history.map(item => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.content }]
    }));

    let lastErr = null;
    for (const model of GEMINI_MODELS) {
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
            currentKeyIndex = (currentKeyIndex + i) % keys.length;
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

    console.warn('[TeduhChat] Direct Gemini rotation error:', lastErr);
    return "Terima kasih sudah bercerita. Napas pelan-pelan ya. Apa yang kamu rasakan itu valid dan wajar. Jika kamu butuh ruang bicara yang lebih mendalam, konsultan berlisensi BerTeduh selalu siap membantumu di halaman Konsultasi.";
  }

  /**
   * Mengirim pesan user ke AI dan menyinkronkan riwayat percakapan.
   */
  async function sendMessage(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;

    const currentHistory = getHistory();
    const userMsg = {
      role: "user",
      content: trimmed,
      timestamp: Date.now()
    };

    currentHistory.push(userMsg);
    saveHistory(currentHistory, true);

    let botReply = "";

    // Deteksi lingkungan:
    // Live Server (port 5500/5501) adalah server statis murni yang menolak POST dengan 405.
    // Jika di Live Server, langsung gunakan pemanggilan Gemini client-side via env.js tanpa memicu 405/404.
    const isLiveServer = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') &&
                         (window.location.port === '5500' || window.location.port === '5501' || window.location.port === '5502' || !window.location.port || window.location.protocol === 'file:');

    if (!isLiveServer) {
      // 1. Prioritas Utama untuk Hosting: Vercel Serverless Function (/api/chat)
      try {
        let apiRes = await fetch(VERCEL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: currentHistory })
        }).catch(() => null);

        // Fallback jika di-deploy di Netlify
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
        console.warn('[TeduhChat] Serverless function error:', err);
      }
    }

    // 2. Jika di Live Server lokal ATAU jika serverless function belum tersedia:
    if (!botReply) {
      botReply = await callDirectGemini(currentHistory);
    }

    // 3. Fallback ramah jika kuota/API tidak tersedia
    if (!botReply) {
      botReply = "Terima kasih sudah bercerita. Napas pelan-pelan ya. Apa yang kamu rasakan itu valid dan wajar. Jika kamu butuh ruang bicara yang lebih mendalam, konsultan berlisensi BerTeduh selalu siap membantumu di halaman Konsultasi.";
    }

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

  // Sinkronisasi otomatis antar-tab via window 'storage' event
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      try {
        const newHistory = JSON.parse(e.newValue || '[]');
        notifySubscribers(newHistory);
      } catch (err) {}
    }
  });

  // Ekspor API singleton ke global window
  window.TeduhChatService = {
    getHistory,
    saveHistory,
    clearHistory,
    subscribe,
    sendMessage,
    notifySubscribers
  };

  // Beritahu listener bahwa service sudah siap
  try {
    window.dispatchEvent(new Event('bt-chat-service-ready'));
  } catch (e) {}

})();
