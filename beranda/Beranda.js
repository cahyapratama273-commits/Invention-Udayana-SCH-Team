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

  /**
   * Mengubah tampilan sapaan (Greeting Card) sesuai hasil kuis
   */
  function renderSapaan() {
    const kondisi = getKondisiUser();
    const cfg = KONDISI_CONFIG[kondisi];

    // Ambil teks yang sudah diset oleh kuesioner, fallback ke default dari KONDISI_CONFIG
    const savedTitle   = localStorage.getItem("userMentalTitle");
    const savedMessage = localStorage.getItem("userMentalMessage");

    const judulEl = document.getElementById("element-judul-beranda");
    const pesanEl = document.getElementById("element-pesan-beranda");
    const cardEl  = document.getElementById("sapaan-card");

    // Suntikkan teks ke HTML
    if (judulEl) judulEl.textContent = savedTitle   || cfg.judulDefault;
    if (pesanEl) pesanEl.textContent = savedMessage || cfg.pesanDefault;
    // Sesuaikan warna garis batas (border-left) sesuai kondisi
    if (cardEl)  cardEl.style.borderLeftColor = cfg.aksenWarna;
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
      // Fetch file JSON
      const res = await fetch("../data/artikel.json");
      const semuaArtikel = await res.json();
      
      // Saring artikel: Hanya ambil artikel yang field "kondisi"-nya cocok
      const artikelRelevan = semuaArtikel.filter((a) => a.kondisi === kondisi);
      
      // Render artikel ke dalam grid HTML menggunakan map() dan string template
      gridEl.innerHTML = artikelRelevan.map(renderKartuArtikel).join("");
    } catch (err) {
      console.error("Gagal memuat artikel:", err);
      // Fallback pesan jika gagal fetch data
      gridEl.innerHTML = `<p style="color:#8A93A8;" class="text-sm col-span-full">Belum bisa memuat rekomendasi artikel. Coba refresh halaman ya.</p>`;
    }
  }

  /**
   * Template HTML untuk satu komponen kartu artikel
   * @param {Object} artikel - Data objek sebuah artikel
   * @returns {string} - String HTML untuk dirender
   */
  function renderKartuArtikel(artikel) {
    return `
      <a href="/blog/?id=${artikel.id}" class="tile rounded-2xl overflow-hidden flex flex-col group" style="text-decoration:none; transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
        <div class="overflow-hidden" style="height:160px; background:#1A2138;">
          <!-- Fallback onerror ditambahkan agar jika gambar rusak/tidak ketemu, akan muncul placeholder teks -->
          <img src="${artikel.gambar}" alt="${artikel.judul}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.5s;"
               onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"
               onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\'height:100%;display:flex;align-items:center;justify-content:center;color:#5A6478;font-size:12px;\'>[Ilustrasi]</div>';" />
        </div>
        <div class="p-5 flex flex-col gap-2 flex-1">
          <span class="text-[11px] font-bold uppercase tracking-widest" style="color:#2DD4A8;">${artikel.kategori}</span>
          <h3 class="font-semibold text-base leading-snug" style="color:#F5F5F5; font-family:'Playfair Display',serif;">${artikel.judul}</h3>
          <p class="text-sm flex-1" style="color:#8A93A8;">${artikel.ringkasan}</p>
          <span class="text-xs mt-2" style="color:#5A6478;">${artikel.waktu_baca}</span>
        </div>
      </a>
    `;
  }

  // ─── INITIALIZATION BOOTSTRAP ───────────────────────────────────────────
  // Menjalankan semua fungsi secara berurutan saat script di-load
  (async function initBeranda() {
    // 1. Muat komponen navigasi (dari NavRender.js)
    await loadNavigasi();
    // 2. Render teks sapaan beranda
    renderSapaan();
    // 3. Fetch dan render artikel
    await renderArtikelRekomendasi();
  })();
})();
