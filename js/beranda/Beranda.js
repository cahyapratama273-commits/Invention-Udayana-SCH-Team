/**
 * Beranda.js — Logika Halaman Beranda
 * 
 * Script ini bertanggung jawab untuk mengatur tampilan halaman Beranda secara dinamis.
 * Hal utama yang dilakukan:
 * 1. Menampilkan animasi starfield (bintang-bintang) di latar belakang.
 * 2. Mengambil hasil kuis (kondisi mental) dari localStorage.
 * 3. Menampilkan pesan sapaan yang sesuai dengan kondisi user.
 * 4. Memuat data artikel dari JSON dan menampilkan artikel yang relevan dengan kondisi user.
 */
(function () {
  // ─── STARFIELD ANIMATION ───────────────────────────────────────────
  // Membuat efek bintang berkedip di background menggunakan elemen <canvas>
  (function initStarfield() {
    const canvas = document.getElementById("starfield-canvas");
    if (!canvas) return; // Jika tidak ada canvas, hentikan proses
    const ctx = canvas.getContext("2d");
    let stars = [];

    // Menyesuaikan ukuran canvas dengan ukuran layar (window)
    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    // Membuat array data bintang secara acak
    function createStars(count) {
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,                // Posisi X acak
          y: Math.random() * canvas.height,               // Posisi Y acak
          r: Math.random() * 1.2 + 0.2,                   // Radius / ukuran bintang
          alpha: Math.random() * 0.5 + 0.1,               // Transparansi awal
          speed: Math.random() * 0.015 + 0.005,           // Kecepatan kedip
          dir: Math.random() > 0.5 ? 1 : -1,              // Arah kedip (terang/redup)
        });
      }
    }

    // Fungsi loop untuk menggambar frame animasi
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Bersihkan frame sebelumnya
      stars.forEach((s) => {
        s.alpha += s.speed * s.dir; // Ubah transparansi (kedip)
        if (s.alpha > 0.6 || s.alpha < 0.05) s.dir *= -1; // Balikkan arah jika melewati batas
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`; // Gambar bintang dengan warna putih transparan
        ctx.fill();
      });
      requestAnimationFrame(draw); // Ulangi fungsi draw di frame berikutnya (looping 60fps)
    }

    resize();
    createStars(160); // Buat 160 bintang
    draw();
    
    // Pastikan ukuran canvas diperbarui jika user me-resize browser
    window.addEventListener("resize", () => { resize(); createStars(160); });
  })();

  // ─── KONDISI CONFIG ────────────────────────────────────────────────
  // Konfigurasi visual dan teks default untuk masing-masing kondisi hasil kuis
  const KONDISI_CONFIG = {
    baik: {
      label: "Untukmu yang lagi baik",
      title: "Rekomendasi buat jaga mood baikmu tetap nyala",
      aksenWarna: "#2DD4A8",   // emerald mint
      judulDefault: "Senang melihatmu baik-baik saja! 🌤️",
      pesanDefault: "Yuk jaga ritme baik ini biar terus menyala hari ini.",
    },
    cemas: {
      label: "Untukmu yang lagi cemas / lelah",
      title: "Bacaan buat bantu redain pikiranmu pelan-pelan",
      aksenWarna: "#818CF8",   // indigo muted
      judulDefault: "Pelan-pelan aja, kita bantu redain 🌊",
      pesanDefault: "Pikiran boleh rame, tapi kita coba tenangin dulu.",
    },
    berat: {
      label: "Untukmu yang lagi merasa berat",
      title: "Mulai dari sini dulu, satu langkah kecil",
      aksenWarna: "#F472B6",   // pink/magenta aksen sekunder
      judulDefault: "Kamu nggak sendirian ngadepin ini 🤍",
      pesanDefault: "Kita jalanin pelan-pelan, satu langkah dalam satu waktu.",
    },
  };


  /**
   * Mengambil kondisi (baik/cemas/berat) dari localStorage.
   * Jika kosong atau tidak valid, default ke "baik".
   */
  function getKondisiUser() {
    const kondisi = localStorage.getItem("userMentalKondisi");
    return KONDISI_CONFIG[kondisi] ? kondisi : "baik";
  }

  let hasAnimatedSapaan = false;

  /**
   * Memicu animasi slide-in dari kiri untuk Kartu Sapaan setelah teks dinamis disuntikkan.
   * Menggunakan requestAnimationFrame + setTimeout singkat (40ms) untuk menjamin browser
   * merender frame awal (opacity-0, -translate-x-10) terlebih dahulu sebelum mengaktifkan
   * kelas transisi ke state akhir (opacity-100, translate-x-0).
   */
  function triggerSapaanAnimation() {
    if (hasAnimatedSapaan) return;
    const wrapper = document.getElementById("sapaan-wrapper");
    if (!wrapper) return;

    hasAnimatedSapaan = true;

    // Pastikan state awal terpasang
    wrapper.classList.add("fade-left", "opacity-0", "-translate-x-10");
    wrapper.classList.remove("opacity-100", "translate-x-0");

    // Force style reflow agar browser mendaftarkan frame awal
    void wrapper.offsetWidth;

    const playTransition = () => {
      console.log("[Kartu Sapaan] Animating card slide-in from left");
      wrapper.classList.remove("opacity-0", "-translate-x-10");
      wrapper.classList.add("opacity-100", "translate-x-0");
    };

    if (window.requestAnimationFrame) {
      requestAnimationFrame(() => {
        setTimeout(playTransition, 40);
      });
    } else {
      setTimeout(playTransition, 40);
    }
  }

  /**
   * Mengubah tampilan sapaan (Greeting Card) sesuai hasil kuis dan status penyelesaian
   * (full, partial, atau abandoned).
   */
  function renderSapaan() {
    const completionPath = localStorage.getItem("userMentalCompletionPath") || "full";
    const kondisi = getKondisiUser();
    const cfg = KONDISI_CONFIG[kondisi];

    const savedTitle   = localStorage.getItem("userMentalTitle");
    const savedMessage = localStorage.getItem("userMentalMessage");

    const judulEl = document.getElementById("element-judul-beranda");
    const pesanEl = document.getElementById("element-pesan-beranda");
    const cardEl  = document.getElementById("sapaan-card");

    if (completionPath === "abandoned") {
      const fallbackTitle = "Pintu BerTeduh Selalu Terbuka Untukmu 🌿";
      const fallbackMessage = "Kamu belum sempat menyelesaikan cek emosi — nggak apa-apa, kamu bisa coba lagi kapan pun. Luangkan waktumu sejenak di sini.";
      if (judulEl) judulEl.textContent = savedTitle || fallbackTitle;
      if (pesanEl) pesanEl.textContent = savedMessage || fallbackMessage;
      if (cardEl) {
        cardEl.style.borderLeft = "4px solid #2DD4A8";
      }
      triggerSapaanAnimation();
      return;
    }

    // Suntikkan teks ke HTML (baik untuk full maupun partial)
    if (judulEl) judulEl.textContent = savedTitle   || cfg.judulDefault;
    if (pesanEl) pesanEl.textContent = savedMessage || cfg.pesanDefault;
    // Sesuaikan warna garis batas (border-left) sesuai kondisi
    if (cardEl) {
      cardEl.style.borderLeft = `4px solid ${cfg.aksenWarna}`;
    }

    // Picu animasi slide-in setelah teks dan border selesai disuntikkan
    triggerSapaanAnimation();
  }

  /**
   * Mengambil data dari `artikel.json` dan menyaring (filter) artikel
   * yang relevan dengan kondisi pengguna saat ini.
   */
  async function renderArtikelRekomendasi() {
    const kondisi = getKondisiUser();
    const cfg = KONDISI_CONFIG[kondisi];

    const labelEl = document.getElementById("rekomendasi-label");
    const titleEl = document.getElementById("rekomendasi-title");
    const gridEl  = document.getElementById("artikel-grid");
    
    // Update teks judul rekomendasi sesuai kondisi
    if (labelEl) labelEl.textContent = cfg.label;
    if (titleEl) titleEl.textContent = cfg.title;
    if (!gridEl) return;

    try {
      // Fetch file JSON dengan fallback path
      let semuaArtikel = [];
      const paths = ["/data/artikel.json", "../../data/artikel.json", "data/artikel.json"];
      for (const p of paths) {
        try {
          const res = await fetch(p);
          if (res.ok) {
            semuaArtikel = await res.json();
            break;
          }
        } catch (e) {}
      }

      // Saring artikel: Hanya ambil artikel yang field "kondisi"-nya cocok
      const artikelRelevan = semuaArtikel.filter((a) => a.kondisi === kondisi);
      
      // Batasi maksimal 5 card yang dirender di beranda
      const artikelDitampilkan = artikelRelevan.slice(0, 5);
      
      // Render artikel ke dalam grid HTML menggunakan map() dan string template
      gridEl.innerHTML = artikelDitampilkan.map(renderArtikelCard).join("");
      if (window.AOS) window.AOS.refresh();
    } catch (err) {
      console.error("Gagal memuat artikel:", err);
      // Fallback pesan jika gagal fetch data
      gridEl.innerHTML = `<p style="color:#8A93A8;" class="text-sm col-span-full">Belum bisa memuat rekomendasi artikel. Coba refresh halaman ya.</p>`;
    }
  }

  
  // ─── INITIALIZATION BOOTSTRAP ───────────────────────────────────────────
  // Jalankan renderSapaan secara sinkron secepat mungkin agar teks kartu sapaan
  // langsung terisi sebelum animasi AOS dimulai dan tanpa menunggu network fetch navigasi
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderSapaan);
  } else {
    renderSapaan();
  }

  // Menjalankan semua fungsi secara berurutan saat script di-load
  (async function initBeranda() {
    renderSapaan();
    // 1. Muat komponen navigasi (dari NavRender.js)
    await loadNavigasi();
    // 2. Fetch dan render artikel
    await renderArtikelRekomendasi();
  })();
})();
