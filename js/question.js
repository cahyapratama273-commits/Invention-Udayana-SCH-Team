/**
 * question.js — Logika utama kuesioner awal aplikasi BerTeduh.
 * 
 * File ini menangani flow 7 pertanyaan yang akan menentukan "kondisi" user 
 * (baik, cemas, atau berat). Kondisi ini kemudian digunakan untuk menyesuaikan 
 * ucapan dan rekomendasi artikel di halaman Beranda.
 */
(function () {
  // Array berisi path ke komponen HTML untuk masing-masing pertanyaan
  const questionFiles = [
    "/component/questions/q1.html",
    "/component/questions/q2.html",
    "/component/questions/q3.html",
    "/component/questions/q4.html",
    "/component/questions/q5.html",
    "/component/questions/q6.html",
    "/component/questions/q7.html",
  ];

  // Bobot nilai untuk setiap kategori jawaban
  // Hijau = positif/aman, Kuning = netral/cemas ringan, Merah = negatif/berat
  const SCORE_VALUE = { hijau: 0, kuning: 1, merah: 2 };
  
  // Menampung skor maksimal (jika semua jawaban adalah merah)
  const MAX_SCORE = questionFiles.length * SCORE_VALUE.merah; 

  // State aplikasi kuesioner
  let currentQuestionIndex = 0; // Indeks pertanyaan yang sedang aktif
  let userScores = [];          // Menyimpan riwayat jawaban user ['hijau', 'merah', dsb]
  let isLoading = false;        // Flag untuk mengantisipasi double click saat proses transisi load halaman

  /**
   * Menginisialisasi state kuesioner dan memuat pertanyaan pertama
   */
  function init() {
    currentQuestionIndex = 0;
    userScores = [];
    isLoading = false;
    updateProgress();
    loadQuestionComponent(currentQuestionIndex);
  }

  /**
   * Memuat file HTML pertanyaan ke dalam kontainer `#quiz-slot` menggunakan jQuery load().
   * @param {number} index - Indeks pertanyaan di dalam array `questionFiles`
   */
  function loadQuestionComponent(index) {
    // Jika index melebihi jumlah pertanyaan, berarti kuis selesai -> hitung hasil
    if (index >= questionFiles.length) {
      hitungHasilEmosi();
      return;
    }
    
    isLoading = true;
    const $slot = $("#quiz-slot");
    
    // Efek fade out sebelum mengganti konten
    $slot.css("opacity", 0);

    // Timeout sedikit agar efek fade out terlihat halus
    setTimeout(() => {
      // Fetch konten file HTML pertanyaan
      $slot.load(questionFiles[index], function (response, status) {
        isLoading = false;
        
        // Handling error jika file HTML gagal dimuat
        if (status === "error") {
          $slot.html("<p class='text-red-500 text-sm'>Gagal memuat pertanyaan. Coba refresh halaman ya.</p>");
          return;
        }
        
        // Efek fade in setelah konten berhasil disuntikkan
        $slot.css("opacity", 1);
        
        updateProgress();
        updateBackButton();
      });
    }, 150);
  }

  /**
   * Mengupdate bar progress (lebar bar hijau) dan teks label (misal: "1 / 7")
   */
  function updateProgress() {
    // Kalkulasi persentase, maksimal 100%
    const percent = Math.min((currentQuestionIndex / questionFiles.length) * 100, 100);
    $("#quiz-progress-fill").css("width", percent + "%");
    
    // Update teks indikator langkah (e.g. 1 / 7)
    $("#quiz-progress-label").text(`${Math.min(currentQuestionIndex + 1, questionFiles.length)} / ${questionFiles.length}`);
  }

  /**
   * Menampilkan atau menyembunyikan tombol kembali.
   * Di pertanyaan pertama (index 0), tombol disembunyikan.
   */
  function updateBackButton() {
    const $back = $("#quiz-back-btn");
    if (currentQuestionIndex === 0) {
      $back.addClass("invisible");
    } else {
      $back.removeClass("invisible");
    }
  }

  // --- Event Listener: Pilih Opsi Jawaban ---
  // `.off()` digunakan untuk mencegah multiple binding jika script ini dijalankan ulang
  $(document).off("click.firstCheck", ".option-btn");
  $(document).on("click.firstCheck", ".option-btn", function () {
    if (isLoading) return; // Cegah double click saat transisi
    
    // Ambil data-score ("hijau", "kuning", "merah") dari atribut tombol
    const chosenScore = $(this).data("score");
    userScores[currentQuestionIndex] = chosenScore;
    
    // Lanjut ke pertanyaan berikutnya
    currentQuestionIndex++;
    loadQuestionComponent(currentQuestionIndex);
  });

  // --- Event Listener: Tombol Kembali ---
  $(document).off("click.firstCheck", "#quiz-back-btn");
  $(document).on("click.firstCheck", "#quiz-back-btn", function () {
    if (isLoading || currentQuestionIndex === 0) return;
    
    // Mundur 1 pertanyaan
    currentQuestionIndex--;
    loadQuestionComponent(currentQuestionIndex);
  });

  /**
   * Logika Utama: Menentukan kondisi pengguna berdasarkan riwayat jawaban,
   * menyimpan data ke localStorage, dan mengarahkan ke halaman Beranda.
   */
  function hitungHasilEmosi() {
    // 1. Hitung total skor angka (hijau=0, kuning=1, merah=2)
    const totalScore = userScores.reduce((sum, kategori) => sum + (SCORE_VALUE[kategori] ?? 0), 0);
    
    // 2. Hitung berapa kali user memilih opsi merah
    const merahCount = userScores.filter((s) => s === "merah").length;

    // 3. Tentukan ambang batas (threshold) kondisi
    const beratThreshold = MAX_SCORE * 0.55; // Ambang skor untuk kondisi 'berat'
    const cemasThreshold = MAX_SCORE * 0.25; // Ambang skor untuk kondisi 'cemas'

    let kondisi = "baik"; // Default kondisi jika skor rendah
    
    // Rule kondisi (skor total melebih ambang batas OR opsi merah terpilih sejumlah batas)
    if (totalScore >= beratThreshold || merahCount >= 3) {
      kondisi = "berat";
    } else if (totalScore >= cemasThreshold || merahCount >= 1) {
      kondisi = "cemas";
    }

    // 4. Konfigurasi pesan Sapaan (Greeting Card) sesuai kondisi
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

    // 5. Simpan seluruh hasil dan status ke localStorage
    // 'userMentalCheckedAt' berfungsi sebagai token otentikasi session-gate
    localStorage.setItem("userMentalKondisi", kondisi);
    localStorage.setItem("userMentalTitle", copy.title);
    localStorage.setItem("userMentalMessage", copy.message);
    localStorage.setItem("userMentalCheckedAt", new Date().toISOString());

    // 6. Selesai -> Arahkan user masuk ke aplikasi utama (Beranda)
    window.location.href = "/beranda.html";
  }

  // Mulai kuis saat script pertama kali jalan
  init();
})();
