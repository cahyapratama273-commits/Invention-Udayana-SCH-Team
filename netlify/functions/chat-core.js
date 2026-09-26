// Shared Gemini chat logic — used by both netlify/functions/chat.js
// (production) and dev/local-server.js (local testing). Keeping this
// in one file means the local test and the deployed function always
// behave identically.

const SYSTEM_PROMPT = `Kamu adalah "Teman AI BerTeduh" — pendamping percakapan ringan di
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
  ceritakan. Sarankan fitur BerTeduh di atas hanya kalau memang pas dengan konteksnya,
  bukan di setiap balasan.
- Kalau pengguna menunjukkan tanda krisis (menyebut ingin mengakhiri hidup, menyakiti
  diri sendiri, atau dalam bahaya): SEGERA respons dengan nada tenang, validasi
  perasaannya, dan arahkan ke bantuan profesional/darurat (sebutkan LISA Helpline atau
  layanan darurat setempat). Jangan coba "menangani" krisis itu sendiri lewat obrolan,
  dan jangan cuma menyuruh mereka pakai fitur Relaksasi/Blog untuk situasi seperti ini.
- Kalau pertanyaan di luar topik kesehatan mental/kesejahteraan, boleh dijawab singkat
  tapi arahkan kembali ke tujuan BerTeduh dengan sopan.
- Jawaban singkat dan padat (2-4 kalimat), bukan esai panjang.`;

const GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash"
];

function getKeys(env, prefix, max = 20) {
  const keys = [];
  if (env[prefix]) keys.push(env[prefix]);
  for (let i = 1; i <= max; i++) {
    const val = env[`${prefix}_${i}`];
    if (val && !keys.includes(val)) keys.push(val);
  }
  return keys;
}

async function callGemini(apiKey, messages) {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

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
      if (res.status === 503 || res.status === 404) {
        continue; // switch to next model
      }
    } catch (e) {}
  }
  throw new Error("Semua model Gemini sedang sibuk.");
}

// Core handler: given env vars and a messages array, returns
// { reply } on success or throws with a .allFailed flag if every
// key was tried and none worked.
async function handleChat(env, messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    const err = new Error("messages must be a non-empty array");
    err.status = 400;
    throw err;
  }

  const geminiKeys = getKeys(env, "GEMINI_API_KEY", 20);
  if (geminiKeys.length === 0) {
    const err = new Error("No GEMINI_API_KEY configured in environment");
    err.status = 500;
    throw err;
  }

  let lastError = null;
  for (const key of geminiKeys) {
    try {
      const reply = await callGemini(key, messages);
      return { reply, provider: "gemini" };
    } catch (e) {
      lastError = e;
      continue;
    }
  }

  const err = new Error(
    lastError ? lastError.message : "All Gemini keys failed"
  );
  err.status = 503;
  err.allFailed = true;
  throw err;
}

module.exports = { handleChat };