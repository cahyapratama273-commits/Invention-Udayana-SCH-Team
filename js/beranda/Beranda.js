/**
 * Beranda.js — Logika Halaman Beranda
 * 
 * Script ini bertanggung jawab untuk mengatur tampilan halaman Beranda secara dinamis:
 * 1. Menampilkan animasi starfield (bintang-bintang) di latar belakang secara hemat CPU.
 * 2. Mengambil hasil kuis (kondisi mental) dari localStorage.
 * 3. Menampilkan pesan sapaan yang sesuai dengan kondisi user seketika (instant render).
 * 4. Memuat data artikel dari JSON dan menampilkan artikel yang relevan secara asinkron tanpa memblokir thread utama.
 */
(function () {
  'use strict';

  // ─── STARFIELD ANIMATION ───────────────────────────────────────────
  (function initStarfield() {
    const canvas = document.getElementById("starfield-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let stars = [];
    let animId = null;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createStars(count) {
      stars = [];
      const w = canvas.width;
      const h = canvas.height;
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.2 + 0.2,
          alpha: Math.random() * 0.5 + 0.1,
          speed: Math.random() * 0.015 + 0.005,
          dir: Math.random() > 0.5 ? 1 : -1,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const len = stars.length;
      for (let i = 0; i < len; i++) {
        const s = stars[i];
        s.alpha += s.speed * s.dir;
        if (s.alpha > 0.6 || s.alpha < 0.05) s.dir *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    }

    resize();
    createStars(120);
    draw();
    
    window.addEventListener("resize", () => { 
      resize(); 
      createStars(120); 
    }, { passive: true });
  })();

  // ─── KONDISI CONFIG ────────────────────────────────────────────────
  const KONDISI_CONFIG = {
    baik: {
      label: "Untukmu yang lagi baik",
      title: "Rekomendasi buat jaga mood baikmu tetap nyala",
      aksenWarna: "#2DD4A8",
      judulDefault: "Senang melihatmu baik-baik saja! 🌤️",
      pesanDefault: "Yuk jaga ritme baik ini biar terus menyala hari ini.",
    },
    cemas: {
      label: "Untukmu yang lagi cemas / lelah",
      title: "Bacaan buat bantu redain pikiranmu pelan-pelan",
      aksenWarna: "#818CF8",
      judulDefault: "Pelan-pelan aja, kita bantu redain 🌊",
      pesanDefault: "Pikiran boleh rame, tapi kita coba tenangin dulu.",
    },
    berat: {
      label: "Untukmu yang lagi merasa berat",
      title: "Mulai dari sini dulu, satu langkah kecil",
      aksenWarna: "#F472B6",
      judulDefault: "Kamu nggak sendirian ngadepin ini 🤍",
      pesanDefault: "Kita jalanin pelan-pelan, satu langkah dalam satu waktu.",
    },
  };

  /**
   * Mengambil kondisi mental dari localStorage.
   */
  function getKondisiUser() {
    const kondisi = localStorage.getItem("userMentalKondisi");
    return KONDISI_CONFIG[kondisi] ? kondisi : "baik";
  }

  let hasAnimatedSapaan = false;

  /**
   * Animasi slide-in halus untuk Kartu Sapaan tanpa memicu forced layout reflow.
   */
  function triggerSapaanAnimation() {
    if (hasAnimatedSapaan) return;
    const wrapper = document.getElementById("sapaan-wrapper");
    if (!wrapper) return;

    hasAnimatedSapaan = true;

    requestAnimationFrame(() => {
      wrapper.classList.remove("opacity-0", "-translate-x-10");
      wrapper.classList.add("opacity-100", "translate-x-0");
    });
  }

  /**
   * Menampilkan pesan sapaan sesuai hasil asesmen emosi pengguna.
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

    if (judulEl) judulEl.textContent = savedTitle   || cfg.judulDefault;
    if (pesanEl) pesanEl.textContent = savedMessage || cfg.pesanDefault;
    if (cardEl) {
      cardEl.style.borderLeft = `4px solid ${cfg.aksenWarna}`;
    }

    triggerSapaanAnimation();
  }

  let __cachedArtikelData = null;

  /**
   * Mengambil data dari `artikel.json` dan menyaring artikel yang relevan secara cepat.
   */
  async function renderArtikelRekomendasi() {
    const kondisi = getKondisiUser();
    const cfg = KONDISI_CONFIG[kondisi];

    const labelEl = document.getElementById("rekomendasi-label");
    const titleEl = document.getElementById("rekomendasi-title");
    const gridEl  = document.getElementById("artikel-grid");
    
    if (labelEl) labelEl.textContent = cfg.label;
    if (titleEl) titleEl.textContent = cfg.title;
    if (!gridEl) return;

    try {
      if (!__cachedArtikelData) {
        const res = await fetch("/data/artikel.json");
        if (res.ok) {
          __cachedArtikelData = await res.json();
        } else {
          throw new Error("Gagal load artikel.json");
        }
      }

      const artikelRelevan = __cachedArtikelData.filter((a) => a.kondisi === kondisi);
      const artikelDitampilkan = artikelRelevan.slice(0, 5);
      
      if (typeof renderArtikelCard === 'function') {
        gridEl.innerHTML = artikelDitampilkan.map(renderArtikelCard).join("");
      }
      
      if (window.AOS && typeof window.AOS.refresh === 'function') {
        window.AOS.refresh();
      }
    } catch (err) {
      console.warn("Gagal memuat rekomendasi artikel:", err);
      gridEl.innerHTML = `<p style="color:#8A93A8;" class="text-sm col-span-full">Belum bisa memuat rekomendasi artikel. Coba refresh halaman ya.</p>`;
    }
  }

  // Eksekusi render sapaan seketika
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      renderSapaan();
      Promise.all([
        typeof loadNavigasi === 'function' ? loadNavigasi() : Promise.resolve(),
        renderArtikelRekomendasi()
      ]);
    });
  } else {
    renderSapaan();
    Promise.all([
      typeof loadNavigasi === 'function' ? loadNavigasi() : Promise.resolve(),
      renderArtikelRekomendasi()
    ]);
  }
})();
