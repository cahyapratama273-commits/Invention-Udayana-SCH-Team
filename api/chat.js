/**
 * api/chat.js — Vercel / Node Serverless Function for BerTeduh AI Chat
 * Gemini-only endpoint with API key rotation & empathetic fallback
 */

const API_KEYS = (() => {
  const keys = [];
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("YOUR_API_KEY")) {
    keys.push(process.env.GEMINI_API_KEY);
  }
  for (let i = 1; i <= 20; i++) {
    const val = process.env[`GEMINI_API_KEY_${i}`];
    if (val && !val.startsWith("YOUR_API_KEY") && !keys.includes(val)) {
      keys.push(val);
    }
  }
  return keys;
})();

let currentKeyIndex = 0;

const SYSTEM_PROMPT = `Kamu adalah asisten virtual bernama 'AI BerTeduh'.
Kamu adalah teman ngobrol yang hangat, berempati, dan pengertian terkait kesehatan mental.
Tugasmu:
1. Menjadi pendengar yang baik untuk keluh kesah pengguna.
2. Memberikan saran ringan (seperti relaksasi, napas dalam) jika mereka cemas.
3. Selalu ingatkan bahwa kamu adalah AI dan BUKAN pengganti psikolog profesional. Sarankan psikolog jika depresi berat.
4. Gunakan bahasa Indonesia yang santai, ramah, dan empatik. Gunakan panggilan 'kamu' kepada pengguna.`;

async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { messages, message, history } = body;

    let contents = [];
    const sourceList = Array.isArray(messages) ? messages : (Array.isArray(history) ? history : []);

    if (sourceList.length > 0) {
      contents = sourceList.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: String(m.content || m.text || '') }]
      }));
    } else if (message) {
      contents = [{ role: 'user', parts: [{ text: String(message) }] }];
    }

    if (contents.length === 0) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    const GEMINI_MODELS = [
      "gemini-flash-lite-latest",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest",
      "gemini-3.8-flash"
    ];

    // Attempt Gemini call with available API keys & models
    if (API_KEYS.length > 0) {
      for (const model of GEMINI_MODELS) {
        for (let i = 0; i < API_KEYS.length; i++) {
          const keyIndex = (currentKeyIndex + i) % API_KEYS.length;
          const apiKey = API_KEYS[keyIndex];

          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const payload = {
              system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
              contents: contents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
              }
            };

            const response = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (!response.ok) {
              if (response.status === 429) {
                // Rate limited, rotate to next key
                currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
                continue;
              }
              if (response.status === 503 || response.status === 404) {
                // Model overload or unavailable, switch to next model immediately
                break;
              }
              const errJson = await response.json().catch(() => ({}));
              throw new Error(errJson.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (reply) {
              return res.status(200).json({
                reply: reply,
                content: reply,
                role: 'model',
                timestamp: Date.now()
              });
            }
          } catch (err) {
            console.warn(`[GEMINI API] Model ${model} Key #${keyIndex + 1} error:`, err.message);
          }
        }
      }
    }

    // Empathetic fallback response if no keys or all keys exhausted
    const fallbackResponses = [
      "Terima kasih sudah berbagi ceritamu. Napas pelan-pelan ya. Apa yang kamu rasakan itu valid dan wajar. Jika kamu butuh ruang bicara yang lebih mendalam, konsultan BerTeduh selalu siap membantumu di halaman Konsultasi.",
      "Aku mendengarkanmu. Terkadang hari-hari terasa berat, dan nggak apa-apa untuk istirahat sejenak. Ada hal spesifik yang ingin kamu urai sekarang?",
      "Terima kasih sudah berani mengungkapkan apa yang ada di kepalamu. Kamu sudah melangkah sejauh ini, dan itu luar biasa. Mau coba latihan napas sejenak bersama BerTeduh?"
    ];
    const chosenFallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    return res.status(200).json({
      reply: chosenFallback,
      content: chosenFallback,
      role: 'model',
      timestamp: Date.now(),
      fallback: true
    });

  } catch (error) {
    console.error('Serverless Chat Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = handler;
module.exports.default = handler;
