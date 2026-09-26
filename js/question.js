/**
 * question.js — Logika Kuesioner Awal (Cek Emosi) BerTeduh
 * 
 * Script ini mengatur seluruh jalannya tes mental awal bagi pengguna:
 * 1. Menampilkan 11 pertanyaan interaktif satu per satu secara berurutan.
 * 2. Mencatat pilihan jawaban (Hijau = Stabil, Kuning = Cemas, Merah = Berat).
 * 3. Mendukung fitur "Lewati Pertanyaan" (Skip) dan menampilkan halaman jeda khusus (interstitial)
 *    jika ada pertanyaan yang sempat dilewati sebelum kalkulasi akhir.
 * 4. Menghitung skor proporsional dan menentukan kategori kondisi emosi (Baik, Cemas, atau Berat).
 * 5. Meneruskan user kembali ke halaman tujuan semula (lengkap dengan parameter URL jika ada).
 * 
 * Ditulis menggunakan Vanilla JS modern dengan in-memory caching untuk kecepatan navigasi instan.
 */
(function () {
  'use strict';

  // Daftar file komponen HTML untuk masing-masing pertanyaan (1 sampai 11)
  const questionFiles = [
    "/component/questions/q1.html",
    "/component/questions/q2.html",
    "/component/questions/q3.html",
    "/component/questions/q4.html",
    "/component/questions/q5.html",
    "/component/questions/q6.html",
    "/component/questions/q7.html",
    "/component/questions/q8.html",
    "/component/questions/q9.html",
    "/component/questions/q10.html",
    "/component/questions/q11.html",
  ];

  // Cache in-memory untuk template pertanyaan agar transisi instan tanpa loading lag
  const questionCache = {};

  // Nilai bobot untuk kalkulasi emosi:
  const SCORE_VALUE = { hijau: 0, kuning: 1, merah: 2 };

  // ─── STATE KUESIONER ───
  let currentQuestionIndex = 0;
  let userScores = {};
  let skippedQuestionIds = [];
  let isReviewMode = false;
  let reviewQueue = [];
  let reviewPointer = 0;
  let isLoading = false;

  const getSlot = () => document.getElementById("quiz-slot");
  const getBackBtn = () => document.getElementById("quiz-back-btn");
  const getSkipBtn = () => document.getElementById("quiz-skip-btn");
  const getProgressFill = () => document.getElementById("quiz-progress-fill");
  const getProgressLabel = () => document.getElementById("quiz-progress-label");
  const getExitModal = () => document.getElementById("exit-modal");

  /**
   * Fungsi untuk memulai / mereset seluruh data kuesioner ke awal
   */
  function init() {
    currentQuestionIndex = 0;
    userScores = {};
    skippedQuestionIds = [];
    isReviewMode = false;
    reviewQueue = [];
    reviewPointer = 0;
    isLoading = false;

    const backBtn = getBackBtn();
    const skipBtn = getSkipBtn();
    if (backBtn) backBtn.classList.remove("hidden");
    if (skipBtn) skipBtn.classList.remove("hidden");

    updateProgress();
    loadQuestionComponent(currentQuestionIndex);
    preloadQuestions();
  }

  /**
   * Mengunduh sisa pertanyaan di latar belakang saat browser idle
   */
  function preloadQuestions() {
    questionFiles.forEach(async (url, idx) => {
      if (!questionCache[idx]) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            questionCache[idx] = await res.text();
          }
        } catch (e) {}
      }
    });
  }

  /**
   * Fungsi untuk memuat file HTML pertanyaan ke dalam kontainer `#quiz-slot`
   */
  async function loadQuestionComponent(index) {
    isLoading = true;
    const slot = getSlot();
    const backBtn = getBackBtn();
    const skipBtn = getSkipBtn();

    if (backBtn) backBtn.classList.remove("hidden");
    if (skipBtn) skipBtn.classList.remove("hidden");

    if (slot) {
      slot.style.opacity = "0";
      slot.style.transition = "opacity 150ms ease";
    }

    try {
      let html = questionCache[index];
      if (!html) {
        const res = await fetch(questionFiles[index]);
        if (!res.ok) throw new Error("Gagal mengambil pertanyaan");
        html = await res.text();
        questionCache[index] = html;
      }

      setTimeout(() => {
        if (!slot) return;
        slot.innerHTML = html;
        isLoading = false;
        slot.style.opacity = "1";

        updateProgress();
        updateBackButton();

        const prevScore = userScores[index];
        if (prevScore) {
          const prevBtn = slot.querySelector(`.option-btn[data-score="${prevScore}"]`);
          if (prevBtn) prevBtn.classList.add("is-selected");
        }
      }, 100);
    } catch (err) {
      isLoading = false;
      if (slot) {
        slot.innerHTML = "<p class='text-red-500 text-sm py-4'>Gagal memuat pertanyaan. Silakan segarkan halaman.</p>";
        slot.style.opacity = "1";
      }
    }
  }

  /**
   * Fungsi untuk memperbarui tampilan garis indikator progres kuis
   */
  function updateProgress() {
    const fill = getProgressFill();
    const label = getProgressLabel();

    if (isReviewMode) {
      const qIdx = reviewQueue[reviewPointer];
      const answeredTotal = Object.keys(userScores).length;
      const percent = Math.min((answeredTotal / questionFiles.length) * 100, 100);
      if (fill) fill.style.width = percent + "%";
      if (label) label.textContent = `Jawab Ulang: Pertanyaan ${qIdx + 1} (${reviewPointer + 1}/${reviewQueue.length})`;
    } else {
      const percent = Math.min((currentQuestionIndex / questionFiles.length) * 100, 100);
      if (fill) fill.style.width = percent + "%";
      if (label) label.textContent = `${Math.min(currentQuestionIndex + 1, questionFiles.length)} / ${questionFiles.length}`;
    }
  }

  /**
   * Mengatur visibilitas tombol kembali
   */
  function updateBackButton() {
    const back = getBackBtn();
    if (!back) return;
    if (!isReviewMode && currentQuestionIndex === 0) {
      back.classList.add("invisible");
    } else {
      back.classList.remove("invisible");
    }
  }

  /**
   * Menentukan alur setelah menjawab/melewati di alur normal
   */
  function checkNextStep() {
    if (currentQuestionIndex < questionFiles.length) {
      loadQuestionComponent(currentQuestionIndex);
    } else {
      if (skippedQuestionIds.length > 0) {
        showInterstitialScreen();
      } else {
        hitungHasilEmosi("full");
      }
    }
  }

  /**
   * Menentukan alur navigasi saat berada di dalam mode review pertanyaan terlewati
   */
  function checkReviewStep() {
    if (reviewPointer < reviewQueue.length) {
      loadQuestionComponent(reviewQueue[reviewPointer]);
    } else {
      const remainingSkipped = questionFiles.map((_, i) => i).filter(i => !userScores[i]);
      if (remainingSkipped.length === 0) {
        hitungHasilEmosi("full");
      } else {
        hitungHasilEmosi("partial");
      }
    }
  }

  /**
   * Menampilkan layar penawaran lembut (interstitial) jika user sempat melewati pertanyaan
   */
  function showInterstitialScreen() {
    isReviewMode = false;
    const slot = getSlot();
    const backBtn = getBackBtn();
    const skipBtn = getSkipBtn();
    const fill = getProgressFill();
    const label = getProgressLabel();

    if (backBtn) backBtn.classList.add("hidden");
    if (skipBtn) skipBtn.classList.add("hidden");
    if (fill) fill.style.width = "100%";
    if (label) label.textContent = "Selesai";

    const skippedCount = skippedQuestionIds.length;

    if (slot) {
      slot.style.opacity = "0";
      setTimeout(() => {
        slot.innerHTML = `
          <div id="quiz-interstitial" class="text-center py-6 px-2">
            <div class="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl shadow-lg" style="background:rgba(45,212,168,0.12); color:#2DD4A8; border:1px solid rgba(45,212,168,0.3);">
              <i class="ph ph-chat-circle-dots text-2xl"></i>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold mb-2.5 text-white" style="font-family:'Playfair Display',serif;">
              Kamu melewati beberapa pertanyaan tadi.
            </h2>
            <p class="text-xs sm:text-sm text-[#8A93A8] max-w-md mx-auto mb-7 leading-relaxed">
              Ada ${skippedCount} pertanyaan yang sempat kamu lewati. Mau jawab dulu sebelum lihat hasilnya, atau lanjut aja?
            </p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm mx-auto">
              <button id="quiz-btn-answer-now" type="button" class="w-full py-3 px-6 rounded-full text-xs sm:text-sm font-bold transition text-[#0D1220] bg-[#2DD4A8] hover:bg-[#25B892] shadow-lg shadow-[#2DD4A8]/20 cursor-pointer">
                Jawab sekarang
              </button>
              <button id="quiz-btn-proceed-anyway" type="button" class="w-full py-3 px-6 rounded-full text-xs sm:text-sm font-semibold transition border border-white/20 hover:border-white/40 text-[#8A93A8] hover:text-white bg-transparent hover:bg-white/5 cursor-pointer">
                Lanjutkan tanpa menjawab
              </button>
            </div>
          </div>
        `;
        slot.style.opacity = "1";
      }, 100);
    }
  }

  /**
   * Mengambil URL tujuan redirect
   */
  function getRedirectDestination() {
    try {
      const params = new URLSearchParams(window.location.search);
      const redirectParam = params.get("redirect");
      const storedUrl = sessionStorage.getItem("intendedRedirectUrl");
      const candidate = redirectParam || storedUrl;

      if (candidate && typeof candidate === "string") {
        const trimmed = candidate.trim();
        if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
          sessionStorage.removeItem("intendedRedirectUrl");
          return trimmed;
        }
      }
    } catch (e) {
      console.warn("Peringatan parse redirect URL:", e);
    }
    return "/beranda.html";
  }

  function openExitModal() {
    const modal = getExitModal();
    if (!modal) return;
    modal.classList.remove("hidden");
    requestAnimationFrame(() => {
      modal.classList.remove("opacity-0", "pointer-events-none");
      const dialog = modal.querySelector("div");
      if (dialog) {
        dialog.classList.remove("scale-95");
        dialog.classList.add("scale-100");
      }
    });
  }

  function closeExitModal() {
    const modal = getExitModal();
    if (!modal) return;
    modal.classList.add("opacity-0", "pointer-events-none");
    const dialog = modal.querySelector("div");
    if (dialog) {
      dialog.classList.remove("scale-100");
      dialog.classList.add("scale-95");
    }
    setTimeout(() => {
      modal.classList.add("hidden");
    }, 250);
  }

  /**
   * ─── EVENT DELEGATION GLOBAL (Vanilla JS) ───
   */
  document.addEventListener("click", (e) => {
    // 1. Tombol Jawab Sekarang di Interstitial
    if (e.target.closest("#quiz-btn-answer-now")) {
      isReviewMode = true;
      reviewQueue = [...skippedQuestionIds].sort((a, b) => a - b);
      reviewPointer = 0;
      const backBtn = getBackBtn();
      const skipBtn = getSkipBtn();
      if (backBtn) backBtn.classList.remove("hidden", "invisible");
      if (skipBtn) skipBtn.classList.remove("hidden");
      loadQuestionComponent(reviewQueue[0]);
      return;
    }

    // 2. Tombol Lanjutkan Tanpa Menjawab
    if (e.target.closest("#quiz-btn-proceed-anyway")) {
      hitungHasilEmosi("partial");
      return;
    }

    // 3. Tombol Exit Close
    if (e.target.closest("#quiz-close-btn")) {
      openExitModal();
      return;
    }

    // 4. Tombol Batal Exit
    if (e.target.closest("#cancel-exit-btn")) {
      closeExitModal();
      return;
    }

    // 5. Tombol Konfirmasi Exit
    if (e.target.closest("#confirm-exit-btn")) {
      localStorage.setItem("userMentalCompletionPath", "abandoned");
      localStorage.removeItem("userMentalKondisi");
      localStorage.setItem("userMentalTitle", "Pintu BerTeduh Selalu Terbuka Untukmu 🌿");
      localStorage.setItem("userMentalMessage", "Kamu belum sempat menyelesaikan cek emosi — nggak apa-apa, kamu bisa coba lagi kapan pun. Luangkan waktumu sejenak di sini.");
      localStorage.setItem("userMentalCheckedAt", new Date().toISOString());

      const destination = getRedirectDestination();
      window.location.href = destination;
      return;
    }

    // 6. Backdrop Modal Exit
    if (e.target.id === "exit-modal") {
      closeExitModal();
      return;
    }

    // 7. Tombol Pilihan Jawaban (.option-btn)
    const optionBtn = e.target.closest(".option-btn");
    if (optionBtn) {
      if (isLoading) return;
      const chosenScore = optionBtn.getAttribute("data-score");

      document.querySelectorAll(".option-btn").forEach(b => b.classList.remove("is-selected"));
      optionBtn.classList.add("is-selected");

      isLoading = true;
      setTimeout(() => {
        if (isReviewMode) {
          const qIdx = reviewQueue[reviewPointer];
          userScores[qIdx] = chosenScore;
          skippedQuestionIds = skippedQuestionIds.filter(id => id !== qIdx);
          reviewPointer++;
          checkReviewStep();
        } else {
          userScores[currentQuestionIndex] = chosenScore;
          skippedQuestionIds = skippedQuestionIds.filter(id => id !== currentQuestionIndex);
          currentQuestionIndex++;
          checkNextStep();
        }
      }, 200);
      return;
    }

    // 8. Tombol Skip
    if (e.target.closest("#quiz-skip-btn")) {
      if (isLoading) return;
      if (isReviewMode) {
        reviewPointer++;
        checkReviewStep();
      } else {
        if (!skippedQuestionIds.includes(currentQuestionIndex)) {
          skippedQuestionIds.push(currentQuestionIndex);
        }
        delete userScores[currentQuestionIndex];
        currentQuestionIndex++;
        checkNextStep();
      }
      return;
    }

    // 9. Tombol Back
    if (e.target.closest("#quiz-back-btn")) {
      if (isLoading) return;
      if (isReviewMode) {
        if (reviewPointer > 0) {
          reviewPointer--;
          loadQuestionComponent(reviewQueue[reviewPointer]);
        } else {
          showInterstitialScreen();
        }
      } else {
        if (currentQuestionIndex > 0) {
          currentQuestionIndex--;
          loadQuestionComponent(currentQuestionIndex);
        }
      }
      return;
    }
  });

  /**
   * ─── KALKULASI UTAMA HASIL EMOSI ───
   */
  function hitungHasilEmosi(completionPath = "full") {
    const validScores = Object.values(userScores).filter(s => s && SCORE_VALUE[s] !== undefined);
    const answeredCount = validScores.length;
    const totalScore = validScores.reduce((sum, k) => sum + (SCORE_VALUE[k] ?? 0), 0);
    const merahCount = validScores.filter(s => s === "merah").length;

    let kondisi = "baik";

    if (answeredCount < 5) {
      kondisi = "baik";
    } else {
      const averageScore = totalScore / answeredCount;
      const merahRatio = merahCount / answeredCount;

      if (averageScore >= 1.15 || merahRatio >= 0.35) {
        kondisi = "berat";
      } else if (averageScore >= 0.55 || merahRatio >= 0.15) {
        kondisi = "cemas";
      } else {
        kondisi = "baik";
      }
    }

    const KONDISI_COPY_FULL = {
      berat: {
        title: "Hei, kamu hebat sudah bertahan sejauh ini 🤍",
        message: "Aku tahu hari-hari ini terasa sangat berat bagimu. Tarik napas perlahan, kamu tidak sendirian di sini.",
      },
      cemas: {
        title: "Pikiranmu sedang terasa penuh ya? 🌊",
        message: "Tidak apa-apa merasa lelah atau cemas. Mari istirahat sejenak dan lepaskan beban pikiranmu bersama BerTeduh.",
      },
      baik: {
        title: "Senang melihatmu baik-baik saja! 🌤️",
        message: "Energinya bagus sekali hari ini. Mari jaga suasana hati yang positif ini bersama BerTeduh.",
      },
    };

    const KONDISI_COPY_PARTIAL = {
      baik: [
        {
          title: "Tampaknya harimu cukup bersahabat 🌤️",
          message: "Dari jawaban yang kamu bagikan, kondisimu terlihat cukup stabil. Semoga ketenangan ini terus menemanimu."
        },
        {
          title: "Melihat secercah ketenangan hari ini ✨",
          message: "Meskipun baru sebagian yang kamu ceritakan, energimu terasa positif. Tetap jaga ritme baik ini ya."
        },
        {
          title: "Ada ruang tenang yang terpancar 🍃",
          message: "Dari beberapa hal yang kamu tandai, suasana hatimu relatif tenang. Terus rawat hal-hal baik di sekitarmu."
        }
      ],
      cemas: [
        {
          title: "Sepertinya ada sedikit ganjalan di kepalamu 🌊",
          message: "Dari beberapa hal yang kamu bagikan, ada riak cemas yang terasa. Luangkan waktu sejenak untuk bernapas lega di sini."
        },
        {
          title: "Pelan-pelan ya, tak perlu buru-buru 🍃",
          message: "Ada kesan lelah dari jawabanmu tadi. Berikan dirimu ruang untuk jeda dan beristirahat sejenak."
        },
        {
          title: "Tarik napas perlahan sejenak ⛅",
          message: "Pikiran mungkin sedang terasa ramai. Tidak apa-apa, kamu bisa menenangkan ritmemu bersama BerTeduh."
        }
      ],
      berat: [
        {
          title: "Terasa ada beban yang sedang kamu pikul 🤍",
          message: "Meskipun hanya sebagian yang kamu sampaikan, kami menangkap rasa lelah yang cukup dalam. Jangan ragu beristirahat sejenak."
        },
        {
          title: "Terima kasih sudah mau berbagi ceritamu 🫂",
          message: "Tampaknya hari-harimu sedang tidak mudah. Tarik napas perlahan, kamu selalu punya ruang aman di sini."
        },
        {
          title: "Langkah kecilmu hari ini sangat berarti 🕊️",
          message: "Ada beban yang mungkin sedang kamu hadapi. Ingat, kamu boleh rehat dan tidak harus memikul semuanya sekaligus."
        }
      ]
    };

    let selectedTitle = "";
    let selectedMessage = "";

    if (completionPath === "full") {
      const copy = KONDISI_COPY_FULL[kondisi];
      selectedTitle = copy.title;
      selectedMessage = copy.message;
    } else {
      const variants = KONDISI_COPY_PARTIAL[kondisi] || KONDISI_COPY_PARTIAL.baik;
      const pick = variants[Math.floor(Math.random() * variants.length)];
      selectedTitle = pick.title;
      selectedMessage = pick.message;
    }

    localStorage.setItem("userMentalCompletionPath", completionPath);
    localStorage.setItem("userMentalKondisi", kondisi);
    localStorage.setItem("userMentalTitle", selectedTitle);
    localStorage.setItem("userMentalMessage", selectedMessage);
    localStorage.setItem("userMentalCheckedAt", new Date().toISOString());

    const destination = getRedirectDestination();
    window.location.href = destination;
  }

  // Mulai kuis saat siap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
