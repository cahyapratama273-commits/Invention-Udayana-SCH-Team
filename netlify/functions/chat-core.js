/**
 * netlify/functions/chat-core.js — Logika Inti Kecerdasan Buatan (Teman Cerita AI BerTeduh)
 * 
 * Modul ini merupakan mesin pemrosesan percakapan AI yang bertugas:
 * 1. Menjaga etika dan kepribadian AI melalui instruksi sistem (SYSTEM_PROMPT).
 * 2. Mengumpulkan seluruh Kunci API Gemini dari variabel lingkungan (process.env) secara fleksibel.
 * 3. Melakukan rotasi otomatis antar-kunci API dan antar-model jika terjadi pembatasan kuota (rate limit).
 * 4. Memastikan respon AI selalu aman, empatik, mendengarkan tanpa menghakimi, dan segera
 *    mengarahkan pengguna ke saluran darurat resmi (LISA Helpline) jika terdeteksi situasi krisis.
 */

// Instruksi kepribadian dan pedoman etika bagi Teman Cerita AI BerTeduh
const SYSTEM_PROMPT = `Kamu adalah "Teman Cerita AI" — pendamping percakapan ringan di
website BerTeduh, sebuah ruang kesehatan mental untuk remaja/pelajar Indonesia. BerTeduh
berperan sebagai JEMBATAN menuju sumber bantuan yang tepat, bukan pengganti tenaga
profesional.

FITUR-FITUR BERTEDUH YANG BISA KAMU SEBUT/SARANKAN SAAT RELEVAN:
- Cek Emosi: kuesioner singkat yang mengelompokkan kondisi pengguna jadi "baik", "cemas",
  atau "berat". Kalau pengguna belum cerita kondisinya, boleh tanya ringan atau arahkan
  ke fitur ini kalau mereka butuh gambaran lebih jelas soal keadaan mereka.
- Relaksasi: latihan pernapasan ritmis (4-7-8, box breathing, dsb) dan panduan gerakan
  yoga sederhana — sarankan ini kalau pengguna menyebut tegang, cemas, susah tidur, atau
  butuh menenangkan diri saat itu juga.
- Blog (Ruang Baca): artikel yang direkomendasikan sesuai kondisi emosi pengguna —
  sarankan ini kalau mereka ingin memahami lebih dalam soal apa yang mereka rasakan.
- Konsultasi Psikolog: jembatan ke psikolog profesional (bukan psikolog sungguhan yang
  merespons chat ini) — sarankan ini kalau pengguna menunjukkan tanda butuh pendampingan
  lebih serius/berkelanjutan, bukan cuma ngobrol sesaat.

ATURAN UTAMA:
- Kamu BUKAN psikolog atau tenaga medis. Jangan pernah mendiagnosis kondisi apa pun,
  dan jangan mengklaim punya kredensial, lisensi, atau kemampuan medis apa pun.
- Gaya bicara: hangat, santai, seperti teman dekat yang nggak menghakimi. Pakai bahasa
  Indonesia sehari-hari (boleh "kamu", "nggak", dst), bukan bahasa formal/klinis.
- Fokus membantu pengguna mengurai isi kepala dan memvalidasi perasaan dulu — jangan
  buru-buru menyodorkan fitur/solusi sebelum benar-benar mendengarkan apa yang mereka
  ceritakan. Sarankan fitur BerTeduh di atas kalau memang pas dengan konteksnya,
  bukan di setiap balasan.
- Kalau pengguna menunjukkan tanda krisis (menyebut ingin mengakhiri hidup, menyakiti
  diri sendiri, atau dalam bahaya): SEGERA respons dengan nada tenang, validasi
  perasaannya, dan arahkan ke bantuan profesional/darurat (sebutkan LISA Helpline atau
  layanan darurat setempat). Jangan coba "menangani" krisis itu sendiri lewat obrolan,
  dan jangan cuma menyuruh mereka pakai fitur Relaksasi/Blog untuk situasi seperti ini.
- Kalau pertanyaan di luar topik kesehatan mental/kesejahteraan, boleh dijawab singkat
  tapi arahkan kembali ke tujuan BerTeduh dengan sopan.
- Jawaban singkat dan padat (2-4 kalimat), bukan esai panjang.`;

// Daftar model resmi Google Gemini yang didukung dan dirotasi secara otomatis
const GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash"
];

/**
 * Mengambil dan merangkum seluruh Kunci API Gemini yang tersimpan di environment server.
 * Fungsi ini dirancang sangat toleran dan mendukung berbagai skema penamaan variabel:
 * - Pola Terstruktur: GEMINI_API_KEY_1 sampai GEMINI_API_KEY_20
 * - Pola Tunggal: GEMINI_API_KEY (mendukung satu string kunci maupun format daftar dipisah koma)
 * - Pola Alternatif: GEMINI_KEY_1 s/d 20 atau GEMINI_KEY
 * 
 * @param {Object} env - Objek process.env yang disediakan oleh runtime serverless
 * @returns {Array<string>} Daftar kunci API Gemini unik yang siap digunakan
 */
function getKeys(env) {
  const keys = [];

  // Skema 1: Pola multi-kunci bernomor (GEMINI_API_KEY_1 s/d GEMINI_API_KEY_20)
  for (let i = 1; i <= 20; i++) {
    const val = env[`GEMINI_API_KEY_${i}`];
    if (val && typeof val === 'string' && val.trim() && !keys.includes(val.trim())) {
      keys.push(val.trim());
    }
  }

  // Skema 2: Pola kunci tunggal (GEMINI_API_KEY), mendukung pemisahan koma jika dimasukkan banyak
  if (env.GEMINI_API_KEY && typeof env.GEMINI_API_KEY === 'string' && env.GEMINI_API_KEY.trim()) {
    const raw = env.GEMINI_API_KEY.trim();
    if (raw.includes(',')) {
      raw.split(',').forEach((item) => {
        const cleaned = item.trim();
        if (cleaned && !keys.includes(cleaned)) keys.push(cleaned);
      });
    } else if (!keys.includes(raw)) {
      keys.push(raw);
    }
  }

  // Skema 3: Format alternatif GEMINI_KEY_1 s/d GEMINI_KEY_20
  for (let i = 1; i <= 20; i++) {
    const val = env[`GEMINI_KEY_${i}`];
    if (val && typeof val === 'string' && val.trim() && !keys.includes(val.trim())) {
      keys.push(val.trim());
    }
  }

  // Skema 4: Format alternatif GEMINI_KEY
  if (env.GEMINI_KEY && typeof env.GEMINI_KEY === 'string' && env.GEMINI_KEY.trim()) {
    const raw = env.GEMINI_KEY.trim();
    if (!keys.includes(raw)) keys.push(raw);
  }

  return keys;
}

/**
 * Mengirim permintaan percakapan ke Google Generative Language API menggunakan satu kunci API.
 * Jika model pertama sedang sibuk (HTTP 503) atau dibatasi (HTTP 429), fungsi ini otomatis
 * mencoba model berikutnya dalam daftar GEMINI_MODELS sebelum menyerah.
 * 
 * @param {string} apiKey - Kunci API Gemini yang sedang aktif diuji
 * @param {Array<Object>} messages - Riwayat pesan percakapan antara pengguna dan AI
 * @returns {Promise<string>} Teks balasan hangat yang dihasilkan oleh AI
 */
async function callGemini(apiKey, messages) {
  // Format ulang riwayat obrolan agar sesuai dengan struktur spesifikasi REST API Google
  const contents = messages.map((m) => ({
    role: (m.role === "assistant" || m.role === "model") ? "model" : "user",
    parts: [{ text: String(m.content || m.text || "") }],
  }));

  // Iterasi melalui daftar model Gemini yang tersedia
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.8, maxOutputTokens: 300 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
      // Jika model sedang sibuk, kuota habis, atau tidak ditemukan, coba model berikutnya
      if (res.status === 503 || res.status === 404 || res.status === 429) {
        continue;
      }
    } catch (e) {
      // Tangkap galat jaringan individual dan lanjutkan ke percobaan model berikutnya
    }
  }
  throw new Error("Semua model Gemini yang dicoba sedang sibuk atau tidak merespons.");
}

/**
 * Fungsi pengendali utama (orchestrator) untuk percakapan AI:
 * 1. Memvalidasi bahwa array pesan tidak kosong.
 * 2. Mengumpulkan seluruh kunci API yang tersedia dari environment server.
 * 3. Merotasi setiap kunci API satu per satu: jika Kunci 1 kuotanya habis/gagal,
 *    sistem seketika berpindah ke Kunci 2, Kunci 3, dst secara mulus tanpa membuat pengguna menunggu lama.
 * 
 * @param {Object} env - Objek process.env runtime
 * @param {Array<Object>} messages - Riwayat percakapan pengguna
 * @returns {Promise<Object>} Objek hasil { reply, provider: "gemini" }
 */
async function handleChat(env, messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    const err = new Error("Data pesan harus berupa array yang tidak kosong.");
    err.status = 400;
    throw err;
  }

  const geminiKeys = getKeys(env);
  if (geminiKeys.length === 0) {
    const matchingEnvVars = Object.keys(env).filter(k => 
      /gemini|key|token|ai|google/i.test(k)
    );
    const allCustomVars = Object.keys(env).filter(k => 
      !k.startsWith('npm_') && !k.startsWith('NETLIFY_') && !k.startsWith('NODE_') && !['PATH', 'PWD', 'HOME', 'LANG', 'SHLVL', 'AWS_REGION', 'AWS_LAMBDA_FUNCTION_NAME', 'AWS_EXECUTION_ENV', 'LAMBDA_TASK_ROOT', 'AWS_LAMBDA_RUNTIME_API'].includes(k)
    );
    const err = new Error(
      `Tidak ditemukan GEMINI_API_KEY di environment server. Variabel lingkungan terdeteksi: [${[...new Set([...matchingEnvVars, ...allCustomVars])].join(', ')}]. Pastikan di Netlify Dashboard -> Site configuration -> Environment variables, Scope mencakup 'Functions' dan context 'Production'.`
    );
    err.status = 500;
    throw err;
  }

  let lastError = null;
  // Rotasi melalui seluruh kunci API yang tersedia
  for (const key of geminiKeys) {
    try {
      const reply = await callGemini(key, messages);
      return { reply, provider: "gemini" };
    } catch (e) {
      lastError = e;
      continue; // Kunci ini gagal atau limit, coba kunci berikutnya
    }
  }

  // Jika seluruh kunci telah dicoba dan semuanya gagal
  const err = new Error(
    lastError ? lastError.message : "Semua kunci Gemini yang tersedia mengalami kegagalan."
  );
  err.status = 503;
  err.allFailed = true;
  throw err;
}

module.exports = { handleChat };