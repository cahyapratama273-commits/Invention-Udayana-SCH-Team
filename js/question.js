(function () {
  const questionFiles = [
    "component/questions/q1.html",
    "component/questions/q2.html",
    "component/questions/q3.html",
    "component/questions/q4.html",
    "component/questions/q5.html",
    "component/questions/q6.html",
    "component/questions/q7.html",
  ];

  const SCORE_VALUE = { hijau: 0, kuning: 1, merah: 2 };
  const MAX_SCORE = questionFiles.length * SCORE_VALUE.merah; //  nyesuain jumlah soal

  let currentQuestionIndex = 0;
  let userScores = [];
  let isLoading = false; // guard anti double-click

  function init() {
    currentQuestionIndex = 0;
    userScores = [];
    isLoading = false;
    updateProgress();
    loadQuestionComponent(currentQuestionIndex);
  }

  function loadQuestionComponent(index) {
    if (index >= questionFiles.length) {
      hitungHasilEmosi();
      return;
    }
    isLoading = true;
    const $slot = $("#quiz-slot");
    $slot.css("opacity", 0);

    setTimeout(() => {
      $slot.load(questionFiles[index], function (response, status) {
        isLoading = false;
        if (status === "error") {
          $slot.html("<p class='text-red-500 text-sm'>Gagal memuat pertanyaan. Coba refresh halaman ya.</p>");
          return;
        }
        $slot.css("opacity", 1);
        updateProgress();
        updateBackButton();
      });
    }, 150);
  }

  function updateProgress() {
    const percent = Math.min((currentQuestionIndex / questionFiles.length) * 100, 100);
    $("#quiz-progress-fill").css("width", percent + "%");
    $("#quiz-progress-label").text(`${Math.min(currentQuestionIndex + 1, questionFiles.length)} / ${questionFiles.length}`);
  }

  function updateBackButton() {
    const $back = $("#quiz-back-btn");
    if (currentQuestionIndex === 0) {
      $back.addClass("invisible");
    } else {
      $back.removeClass("invisible");
    }
  }

  // --- Event: pilih opsi jawaban ---
  $(document).off("click.firstCheck", ".option-btn");
  $(document).on("click.firstCheck", ".option-btn", function () {
    if (isLoading) return;
    const chosenScore = $(this).data("score");
    userScores[currentQuestionIndex] = chosenScore;
    currentQuestionIndex++;
    loadQuestionComponent(currentQuestionIndex);
  });

  // --- Event: tombol kembali ---
  $(document).off("click.firstCheck", "#quiz-back-btn");
  $(document).on("click.firstCheck", "#quiz-back-btn", function () {
    if (isLoading || currentQuestionIndex === 0) return;
    currentQuestionIndex--;
    loadQuestionComponent(currentQuestionIndex);
  });

  function hitungHasilEmosi() {
    const totalScore = userScores.reduce((sum, kategori) => sum + (SCORE_VALUE[kategori] ?? 0), 0);
    const merahCount = userScores.filter((s) => s === "merah").length;

    const beratThreshold = MAX_SCORE * 0.55;
    const cemasThreshold = MAX_SCORE * 0.25;

    let kondisi = "baik";
    if (totalScore >= beratThreshold || merahCount >= 3) {
      kondisi = "berat";
    } else if (totalScore >= cemasThreshold || merahCount >= 1) {
      kondisi = "cemas";
    }

    const KONDISI_COPY = {
      berat: {
        title: "Hei, kamu hebat sudah bertahan sejauh ini.",
        message: "Aku tahu hari-hari ini terasa sangat berat dan melelahkan bagimu. Tarik napas dalam-dalam, kamu tidak sendirian di sini.",
      },
      cemas: {
        title: "Pikiranmu sedang penuh ya?",
        message: "Tidak apa-apa merasa lelah atau cemas. Mari istirahat sejenak dan lepaskan penatmu di dengan BerTeduh.",
      },
      baik: {
        title: "Senang melihatmu baik-baik saja!",
        message: "Energinya bagus sekali hari ini. Mari jaga suasana hati yang positif ini dengan BerTeduh.",
      },
    };

    const copy = KONDISI_COPY[kondisi];

    localStorage.setItem("userMentalKondisi", kondisi);
    localStorage.setItem("userMentalTitle", copy.title);
    localStorage.setItem("userMentalMessage", copy.message);
    localStorage.setItem("userMentalCheckedAt", new Date().toISOString());

    // Direct ke beranda
    window.location.href = "./Beranda/index.html";
  }

  init();
})();
