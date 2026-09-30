/**
 * js/chat-service.js — Layanan Chat AI Terpadu (Teman Cerita AI) BerTeduh
 * 
 * Modul ini merupakan satu-satunya sumber kebenaran (Single Source of Truth)
 * percakapan AI di BerTeduh:
 * 1. Menggunakan satu CHAT_ENDPOINT:
 *    - Pada localhost / 127.0.0.1 mengarah ke local test server (http://localhost:8888/chat).
 *    - Pada environment production mengarah ke /.netlify/functions/chat.
 * 2. Seluruh permintaan chat AI dikirim melalui CHAT_ENDPOINT (Serverless Function).
 *    Tidak ada pemanggilan langsung ke API Gemini dari browser client.
 * 3. Menyimpan dan menyinkronkan seluruh riwayat obrolan di localStorage ('bt_ai_chat_history')
 *    secara real-time antar-tab dan antar-komponen (Chat Overlay & Halaman Konsultasi).
 * 4. Menyediakan fungsi reset sesi dengan dialog konfirmasi aman.
 * 5. Menyediakan pesan fallback empatik (CALM_FALLBACK) saat layanan tidak tersedia (offline/error).
 */

(function () {
  'use strict';

  // Kunci penyimpanan riwayat obrolan bersama di localStorage browser
  const STORAGE_KEY = 'bt_ai_chat_history';

  // Pesan sapaan pertama kali dari Teman Cerita AI
  const INITIAL_MESSAGE = "Halo! Aku Teman Cerita AI dari BerTeduh. Ada yang lagi mengganggu pikiranmu hari ini? Ceritakan santai aja ya, aku siap dengerin.";

  // Pesan fallback empatik saat layanan tidak tersedia (tenang, tanpa error teknis)
  const CALM_FALLBACK = "Terima kasih sudah bercerita. Napas pelan-pelan ya. Apa yang kamu rasakan itu valid dan wajar. Jika kamu butuh ruang bicara yang lebih mendalam, psikolog dan konselor BerTeduh selalu siap membantumu di halaman Konsultasi.";

  // Deteksi lingkungan localhost / 127.0.0.1
  const isLocal = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');

  // Single CHAT_ENDPOINT constant per spesifikasi (selalu melalui server/function)
  const CHAT_ENDPOINT = isLocal ? 'http://localhost:8888/chat' : '/.netlify/functions/chat';

  // Koleksi subscriber yang mendengarkan perubahan riwayat obrolan secara reaktif
  const subscribers = new Set();

  /**
   * Mengambil riwayat percakapan dari media penyimpanan lokal browser (localStorage):
   * - Jika riwayat sebelumnya sudah ada, data diparse dan dikembalikan dalam bentuk array pesan.
   * - Jika pengguna baru pertama kali berkunjung atau riwayat kosong, fungsi ini otomatis
   *   membuat pesan pembuka sapaan hangat dari "Teman Cerita AI" sebagai titik awal percakapan.
   * 
   * @returns {Array<Object>} Koleksi pesan percakapan [{ role, content, timestamp }]
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
   * Menyimpan pembaruan riwayat percakapan ke localStorage browser:
   * Menjaga agar riwayat chat tidak hilang saat halaman di-refresh, sekaligus
   * memicu pembaruan ke seluruh komponen antarmuka yang sedang aktif (notifySubscribers).
   * 
   * @param {Array<Object>} history - Daftar objek pesan percakapan terbaru
   * @param {boolean} [notify=true] - Menentukan apakah komponen UI perlu diberitahu seketika
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
   * Menyiarkan (broadcast) riwayat obrolan terbaru ke seluruh komponen UI yang terdaftar
   * (seperti balon chat terapung di pojok layar dan tampilan layar penuh di halaman Konsultasi).
   * Juga menembakkan CustomEvent 'bt-ai-chat-updated' agar komponen independen lain dapat merespons.
   * 
   * @param {Array<Object>|null} [history=null] - Data riwayat pesan terkini (opsional)
   */
  function notifySubscribers(history = null) {
    const data = history || getHistory();
    subscribers.forEach(cb => {
      try { cb(data); } catch (e) { console.error('[TeduhChat] Kesalahan pada callback subscriber:', e); }
    });
    try {
      window.dispatchEvent(new CustomEvent('bt-ai-chat-updated', { detail: data }));
    } catch (e) {}
  }

  /**
   * Mendaftarkan fungsi pengamat (listener/subscriber) untuk menerima pembaruan chat secara real-time.
   * Mengembalikan fungsi pembatal (unsubscriber) untuk membersihkan listener saat komponen ditutup.
   * 
   * @param {Function} callback - Fungsi penanganan yang menerima array riwayat pesan
   * @returns {Function} Fungsi cleanup untuk mencabut pendaftaran
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
   * Menghapus seluruh percakapan yang tersimpan dan memulai lembaran baru:
   * Dapat memunculkan kotak dialog konfirmasi terlebih dahulu agar pengguna tidak
   * sengaja kehilangan catatan curahan hatinya yang berharga.
   * 
   * @param {boolean} [askConfirmation=false] - Meminta persetujuan pengguna via dialog window.confirm
   * @returns {Array<Object>|null} Riwayat baru berisi sapaan awal, atau null jika dibatalkan
   */
  function clearHistory(askConfirmation = false) {
    if (askConfirmation) {
      const ok = window.confirm("Mulai sesi baru dan hapus percakapan saat ini?");
      if (!ok) return null;
    }

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
   * Mengirim pesan dari pengguna, menyimpannya ke riwayat lokal, dan meneruskannya ke AI:
   * 1. Menyimpan pesan teks pengguna ke localStorage seketika demi responsivitas UI instan.
   * 2. Menghubungi endpoint serverless (Netlify Function) yang aman tanpa mengekspos API Key ke publik.
   * 3. Jika koneksi offline atau server sibuk, fungsi ini dengan anggun memberikan pesan penenang (CALM_FALLBACK)
   *    alih-alih menampilkan pesan galat teknis yang membingungkan bagi pengguna yang sedang rapuh.
   * 4. Menyimpan jawaban AI ke riwayat dan memperbarui seluruh tampilan antarmuka.
   * 
   * @param {string} text - Teks curahan hati atau pertanyaan dari pengguna
   * @returns {Promise<string|null>} Balasan teks dari Teman Cerita AI
   */
  async function sendMessage(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;

    // 1. Simpan pesan user ke riwayat bersama
    const currentHistory = getHistory();
    const userMsg = {
      role: "user",
      content: trimmed,
      timestamp: Date.now()
    };

    currentHistory.push(userMsg);
    saveHistory(currentHistory, true);

    let botReply = "";

    // 2. Coba panggil CHAT_ENDPOINT (Serverless Function / Local proxy)
    try {
      const apiRes = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentHistory })
      }).catch(() => null);

      if (apiRes && apiRes.ok) {
        const json = await apiRes.json();
        botReply = json.reply || json.content || "";
      }
    } catch (err) {
      console.warn('[TeduhChat] CHAT_ENDPOINT belum merespons:', err);
    }

    // 3. Fallback jika offline / server error / kuota habis — tampilkan pesan tenang empatik
    if (!botReply) {
      botReply = CALM_FALLBACK;
    }

    // 4. Simpan balasan AI ke riwayat bersama
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

  // Sinkronisasi otomatis antar-tab browser via event storage
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      try {
        const newHistory = JSON.parse(e.newValue || '[]');
        notifySubscribers(newHistory);
      } catch (err) {}
    }
  });

  // Ekspor singleton service ke window
  window.TeduhChatService = {
    getHistory,
    saveHistory,
    clearHistory,
    subscribe,
    sendMessage,
    notifySubscribers,
    CHAT_ENDPOINT,
    CALM_FALLBACK
  };

  try {
    window.dispatchEvent(new Event('bt-chat-service-ready'));
  } catch (e) {}

})();
