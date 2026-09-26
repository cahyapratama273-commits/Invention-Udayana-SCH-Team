/**
 * question.js — Logika kuesioner awal aplikasi BerTeduh.
 * 
 * Menangani alur 11 pertanyaan, pelacakan pertanyaan yang dilewati,
 * layar interstitial untuk revisit pertanyaan, penilaian proporsional,
 * dan 3 jalur penyelesaian (Full, Partial, Abandoned).
 */
(function () {
  'use strict';

  // Array path file pertanyaan
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

  // Bobot nilai untuk setiap kategori jawaban
  // Hijau = positif/stabil (0), Kuning = waspada/cemas (1), Merah = berat/stres tinggi (2)
  const SCORE_VALUE = { hijau: 0, kuning: 1, merah: 2 };

  // State aplikasi kuesioner
  let currentQuestionIndex = 0;
  let userScores = {};            // Object mapping { [questionIndex]: 'hijau' | 'kuning' | 'merah' }
  let skippedQuestionIds = [];     // Array indeks pertanyaan yang dilewati user
  let isReviewMode = false;        // Status mode review pertanyaan yang sempat dilewati
  let reviewQueue = [];           // Antrean pertanyaan dalam mode review
  let reviewPointer = 0;          // Indeks saat ini di reviewQueue
  let isLoading = false;           // Mencegah double-click saat transisi

  /**
   * Menginisialisasi state kuesioner
   */
  function init() {
    currentQuestionIndex = 0;
    userScores = {};
    skippedQuestionIds = [];
    isReviewMode = false;
    reviewQueue = [];
    reviewPointer = 0;
    isLoading = false;

    $("#quiz-back-btn").removeClass("hidden");
    $("#quiz-skip-btn").removeClass("hidden");

    updateProgress();
    loadQuestionComponent(currentQuestionIndex);
  }

  /**
   * Memuat file HTML pertanyaan ke dalam kontainer `#quiz-slot`
   */
  function loadQuestionComponent(index) {
    isLoading = true;
    const $slot = $("#quiz-slot");
    
    // Pastikan tombol kontrol tampil
    $("#quiz-back-btn").removeClass("hidden");
    $("#quiz-skip-btn").removeClass("hidden");

    $slot.css("opacity", 0);

    setTimeout(() => {
      $slot.load(questionFiles[index], function (response, status) {
        isLoading = false;

        if (status === "error") {
          $slot.html("<p class='text-red-500 text-sm py-4'>Gagal memuat pertanyaan. Silakan refresh halaman.</p>");
          return;
        }

        $slot.css("opacity", 1);

        updateProgress();
        updateBackButton();

        // Restore jawaban yang sudah dipilih sebelumnya jika ada
        const prevScore = userScores[index];
        if (prevScore) {
          $slot.find(`.option-btn[data-score="${prevScore}"]`).addClass("is-selected");
        }
      });
    }, 150);
  }

  /**
   * Mengupdate bar progress dan label
   */
  function updateProgress() {
    if (isReviewMode) {
      const qIdx = reviewQueue[reviewPointer];
      const answeredTotal = Object.keys(userScores).length;
      const percent = Math.min((answeredTotal / questionFiles.length) * 100, 100);
      $("#quiz-progress-fill").css("width", percent + "%");
      $("#quiz-progress-label").text(`Jawab Ulang: Pertanyaan ${qIdx + 1} (${reviewPointer + 1}/${reviewQueue.length})`);
    } else {
      const percent = Math.min((currentQuestionIndex / questionFiles.length) * 100, 100);
      $("#quiz-progress-fill").css("width", percent + "%");
      $("#quiz-progress-label").text(`${Math.min(currentQuestionIndex + 1, questionFiles.length)} / ${questionFiles.length}`);
    }
  }

  /**
   * Menampilkan atau menyembunyikan tombol kembali
   */
  function updateBackButton() {
    const $back = $("#quiz-back-btn");
    if (!isReviewMode && currentQuestionIndex === 0) {
      $back.addClass("invisible");
    } else {
      $back.removeClass("invisible");
    }
  }

  /**
   * Memeriksa langkah berikutnya pada flow normal (pertanyaan 1..11)
   */
  function checkNextStep() {
    if (currentQuestionIndex < questionFiles.length) {
      loadQuestionComponent(currentQuestionIndex);
    } else {
      // Sampai di ujung 11 pertanyaan
      if (skippedQuestionIds.length > 0) {
        // Tampilkan layar interstitial tawaran jawab ulang
        showInterstitialScreen();
      } else {
        // Semua terjawab tanpa skip -> Selesai penuh
        hitungHasilEmosi("full");
      }
    }
  }

  /**
   * Memeriksa langkah berikutnya saat dalam mode review pertanyaan terlewati
   */
  function checkReviewStep() {
    if (reviewPointer < reviewQueue.length) {
      loadQuestionComponent(reviewQueue[reviewPointer]);
    } else {
      // Selesai memeriksa antrean review
      // Cek apakah masih ada yang belum terjawab
      const remainingSkipped = questionFiles.map((_, i) => i).filter(i => !userScores[i]);
      if (remainingSkipped.length === 0) {
        hitungHasilEmosi("full");
      } else {
        hitungHasilEmosi("partial");
      }
    }
  }

  /**
   * Menampilkan layar interstitial penawaran jawab ulang sebelum hasil akhir
   */
  function showInterstitialScreen() {
    isReviewMode = false;
    const $slot = $("#quiz-slot");

    // Sembunyikan tombol bawah saat layar tawaran aktif
    $("#quiz-back-btn").addClass("hidden");
    $("#quiz-skip-btn").addClass("hidden");

    $("#quiz-progress-fill").css("width", "100%");
    $("#quiz-progress-label").text(`Selesai`);

    const skippedCount = skippedQuestionIds.length;

    $slot.css("opacity", 0);
    setTimeout(() => {
      $slot.html(`
        <div id="quiz-interstitial" class="text-center py-6 px-2">
          <div class="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl shadow-lg" style="background:rgba(45,212,168,0.12); color:#2DD4A8; border:1px solid rgba(45,212,168,0.3);">
            <i class="ph-bold ph-chats-circle text-2xl"></i>
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
      `);
      $slot.css("opacity", 1);
    }, 150);
  }

  // --- Event Listener: Tombol Interstitial ---
  $(document).off("click.quizInterstitial", "#quiz-btn-answer-now");
  $(document).on("click.quizInterstitial", "#quiz-btn-answer-now", function () {
    isReviewMode = true;
    // Antrean pertanyaan yang dilewati secara berurutan
    reviewQueue = [...skippedQuestionIds].sort((a, b) => a - b);
    reviewPointer = 0;

    $("#quiz-back-btn").removeClass("hidden invisible");
    $("#quiz-skip-btn").removeClass("hidden");

    loadQuestionComponent(reviewQueue[0]);
  });

  $(document).off("click.quizInterstitial", "#quiz-btn-proceed-anyway");
  $(document).on("click.quizInterstitial", "#quiz-btn-proceed-anyway", function () {
    hitungHasilEmosi("partial");
  });

  // --- Event Listener: Tombol Exit / Close (X) ---
  $(document).off("click.firstCheck", "#quiz-close-btn");
  $(document).on("click.firstCheck", "#quiz-close-btn", function () {
    openExitModal();
  });

  $(document).off("click.firstCheck", "#cancel-exit-btn");
  $(document).on("click.firstCheck", "#cancel-exit-btn", function () {
    closeExitModal();
  });

  /**
   * Mengambil URL tujuan redirect dari parameter query atau sessionStorage
   * (misalnya jika pengguna datang dari link berparameter /relaksasi.html?id=2)
   */
  function getRedirectDestination() {
    try {
      const params = new URLSearchParams(window.location.search);
      const redirectParam = params.get("redirect");
      const storedUrl = sessionStorage.getItem("intendedRedirectUrl");
      const candidate = redirectParam || storedUrl;

      if (candidate && typeof candidate === "string") {
        const trimmed = candidate.trim();
        // Validasi keamanan: hanya path internal relatif (diawali satu slash '/')
        if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
          sessionStorage.removeItem("intendedRedirectUrl");
          return trimmed;
        }
      }
    } catch (e) {
      console.warn("Redirect parse error:", e);
    }
    return "/beranda.html";
  }

  // Abandon quiz entirely via modal
  $(document).off("click.firstCheck", "#confirm-exit-btn");
  $(document).on("click.firstCheck", "#confirm-exit-btn", function () {
    // Skenario 3: Abandoned entirely
    localStorage.setItem("userMentalCompletionPath", "abandoned");
    localStorage.removeItem("userMentalKondisi");
    localStorage.setItem("userMentalTitle", "Pintu BerTeduh Selalu Terbuka Untukmu 🌿");
    localStorage.setItem("userMentalMessage", "Kamu belum sempat menyelesaikan cek emosi — nggak apa-apa, kamu bisa coba lagi kapan pun. Luangkan waktumu sejenak di sini.");
    localStorage.setItem("userMentalCheckedAt", new Date().toISOString());

    const destination = getRedirectDestination();
    window.location.href = destination;
  });

  $(document).off("click.firstCheck", "#exit-modal");
  $(document).on("click.firstCheck", "#exit-modal", function (e) {
    if (e.target === this) {
      closeExitModal();
    }
  });

  function openExitModal() {
    const $modal = $("#exit-modal");
    $modal.removeClass("hidden");
    setTimeout(() => {
      $modal.removeClass("opacity-0 pointer-events-none");
      $modal.find("> div").removeClass("scale-95").addClass("scale-100");
    }, 10);
  }

  function closeExitModal() {
    const $modal = $("#exit-modal");
    $modal.addClass("opacity-0 pointer-events-none");
    $modal.find("> div").removeClass("scale-100").addClass("scale-95");
    setTimeout(() => {
      $modal.addClass("hidden");
    }, 300);
  }

  // --- Event Listener: Pilih Opsi Jawaban ---
  $(document).off("click.firstCheck", ".option-btn");
  $(document).on("click.firstCheck", ".option-btn", function () {
    if (isLoading) return;
    
    const chosenScore = $(this).data("score");

    $(".option-btn").removeClass("is-selected is-hovered");
    $(this).addClass("is-selected");

    isLoading = true;
    setTimeout(() => {
      if (isReviewMode) {
        const qIdx = reviewQueue[reviewPointer];
        userScores[qIdx] = chosenScore;
        // Hapus dari daftar skipped karena sudah dijawab
        skippedQuestionIds = skippedQuestionIds.filter(id => id !== qIdx);
        reviewPointer++;
        checkReviewStep();
      } else {
        userScores[currentQuestionIndex] = chosenScore;
        skippedQuestionIds = skippedQuestionIds.filter(id => id !== currentQuestionIndex);
        currentQuestionIndex++;
        checkNextStep();
      }
    }, 250);
  });

  // --- Event Listener: Tombol Skip ---
  $(document).off("click.firstCheck", "#quiz-skip-btn");
  $(document).on("click.firstCheck", "#quiz-skip-btn", function () {
    if (isLoading) return;

    if (isReviewMode) {
      // Tetap lewati pertanyaan dalam antrean review
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
  });

  // --- Event Listener: Tombol Kembali ---
  $(document).off("click.firstCheck", "#quiz-back-btn");
  $(document).on("click.firstCheck", "#quiz-back-btn", function () {
    if (isLoading) return;

    if (isReviewMode) {
      if (reviewPointer > 0) {
        reviewPointer--;
        loadQuestionComponent(reviewQueue[reviewPointer]);
      } else {
        // Kembali ke layar interstitial
        showInterstitialScreen();
      }
    } else {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestionComponent(currentQuestionIndex);
      }
    }
  });

  // --- Event Listener: Hover Animation ---
  $(document).off("mouseenter.optionHover", ".option-btn");
  $(document).on("mouseenter.optionHover", ".option-btn", function () {
    $(this).addClass("is-hovered");
  });

  $(document).off("mouseleave.optionHover", ".option-btn");
  $(document).on("mouseleave.optionHover", ".option-btn", function () {
    $(this).removeClass("is-hovered");
  });

  /**
   * Logika Utama Penilaian: Menghitung kondisi mental dan menentukan pesan sapaan
   * berdasarkan completionPath ('full' | 'partial').
   */
  function hitungHasilEmosi(completionPath = "full") {
    const validScores = Object.values(userScores).filter(s => s && SCORE_VALUE[s] !== undefined);
    const answeredCount = validScores.length;
    const totalScore = validScores.reduce((sum, k) => sum + (SCORE_VALUE[k] ?? 0), 0);
    const merahCount = validScores.filter(s => s === "merah").length;

    let kondisi = "baik";

    // Jika terlalu sedikit dijawab (< 5 dari 11), fallback ke kategori netral/umum
    if (answeredCount < 5) {
      kondisi = "baik";
    } else {
      const averageScore = totalScore / answeredCount; // Skala 0.0 - 2.0
      const merahRatio = merahCount / answeredCount;

      if (averageScore >= 1.15 || merahRatio >= 0.35) {
        kondisi = "berat";
      } else if (averageScore >= 0.55 || merahRatio >= 0.15) {
        kondisi = "cemas";
      } else {
        kondisi = "baik";
      }
    }

    // Variasi pesan untuk Skenario 1 (Full - 11 pertanyaan dijawab lengkap)
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

    // Variasi pesan untuk Skenario 2 (Partial - Ada yang dilewati, nada lebih lembut)
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
      // Pilih varian partial secara acak
      const variants = KONDISI_COPY_PARTIAL[kondisi] || KONDISI_COPY_PARTIAL.baik;
      const pick = variants[Math.floor(Math.random() * variants.length)];
      selectedTitle = pick.title;
      selectedMessage = pick.message;
    }

    // Simpan ke localStorage
    localStorage.setItem("userMentalCompletionPath", completionPath);
    localStorage.setItem("userMentalKondisi", kondisi);
    localStorage.setItem("userMentalTitle", selectedTitle);
    localStorage.setItem("userMentalMessage", selectedMessage);
    localStorage.setItem("userMentalCheckedAt", new Date().toISOString());

    // Arahkan ke halaman tujuan semula (dengan parameternya) atau default ke Beranda
    const destination = getRedirectDestination();
    window.location.href = destination;
  }

  // Jalankan kuis saat script dimuat
  init();
})();
