/**
 * netlify/functions/chat.js — Gerbang Serverless Function untuk Chat AI BerTeduh
 * 
 * Fungsi ini bertindak sebagai jembatan aman (proxy) antara aplikasi frontend browser
 * dengan Google Gemini API. Dengan menempatkan pemanggilan di fungsi serverless ini:
 * 1. Seluruh kunci rahasia API (GEMINI_API_KEY) tersimpan aman di server Netlify dan
 *    tidak pernah bocor atau terlihat oleh pengguna di browser.
 * 2. Menyediakan proteksi header CORS agar endpoint hanya dapat diakses dengan aman.
 * 3. Menangani validasi format data pesan yang dikirimkan pengguna.
 * 4. Merotasi kunci API secara otomatis jika salah satu kunci mengalami limit kuota.
 */

const { handleChat } = require("./chat-core");

// Konfigurasi header CORS agar aman dan kompatibel dengan browser modern
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

/**
 * Handler utama Netlify Function yang menerima dan memproses request chat
 * 
 * @param {Object} event - Objek event HTTP dari Netlify (berisi method, headers, body)
 * @returns {Promise<Object>} Respons HTTP berisi status code, headers, dan JSON body
 */
exports.handler = async (event) => {
  // 1. Tangani preflight request OPTIONS untuk protokol CORS browser
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ""
    };
  }

  // 2. Pastikan metode pengiriman pesan adalah POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Metode tidak diizinkan. Gunakan POST." })
    };
  }

  // 3. Uraikan (parse) data JSON yang dikirimkan oleh browser
  let messages;
  try {
    const parsed = JSON.parse(event.body || "{}");
    messages = parsed.messages;
  } catch (e) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Format data JSON tidak valid." })
    };
  }

  // 4. Proses pesan melalui logika terpadu handleChat
  try {
    const result = await handleChat(process.env, messages);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result)
    };
  } catch (e) {
    // Tangani galat server atau kehabisan kuota dengan pesan yang tetap santun
    return {
      statusCode: e.status || 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: e.allFailed
          ? "Teman Cerita AI saat ini sedang beristirahat sejenak karena kuota penuh. Coba lagi beberapa saat lagi ya."
          : "Terjadi kendala pada server saat memproses pesan.",
        detail: e.message,
      }),
    };
  }
};