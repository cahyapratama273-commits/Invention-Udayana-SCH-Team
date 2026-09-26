/**
 * main.js (Halaman Konsultasi) — Logika Layanan Konsultasi & Chat AI BerTeduh
 * 
 * Script ini mengatur:
 * 1. Pemuatan Navbar dinamis melalui fungsi loadNavigasi().
 * 2. Sistem perpindahan Tab Layanan (Psikologi Klinis vs Teman Cerita AI).
 * 3. Pengambilan data profil konsultan dari file JSON (data/konsultan.json) dan merendernya ke grid.
 * 4. Modal Popup Detail Konsultan lengkap dengan spesialisasi, rating, dan tombol WhatsApp.
 * 5. Pengendalian otomatis balon chat overlay (disembunyikan saat tab AI aktif agar tidak tumpang tindih).
 */

(function () {
  // Variabel penampung daftar konsultan yang dimuat dari file JSON
  let listKonsultan = [];

  // ─── INISIALISASI SAAT HALAMAN SELESAI DIMUAT ───
  document.addEventListener("DOMContentLoaded", async () => {
    // 1. Muat komponen navbar
    if (typeof loadNavigasi === "function") {
      await loadNavigasi();
    }
    
    // 2. Inisialisasi logika tab, modal, dan data konsultan
    initTabs();
    initModalEvents();
    await loadKonsultan();
  });

  // ─── 1. PENGALIH TAB LAYANAN (Psikologi Klinis vs Chat AI) ───
  function initTabs() {
    const btnKlinis = document.getElementById("tab-klinis-btn");
    const btnAi = document.getElementById("tab-ai-btn");
    const viewKonsultan = document.getElementById("konsultan-view");
    const viewAi = document.getElementById("chat-ai-view");
    const badgeKlinis = document.getElementById("badge-klinis");
    const badgeAi = document.getElementById("badge-ai");

    if (!btnKlinis || !btnAi) return;

    /**
     * Mengaktifkan tampilan tab yang dipilih dan menyesuaikan styling visual
     */
    function activateTab(tab) {
      if (tab === "klinis") {
        // Style Tab Klinis (Sedang Aktif)
        btnKlinis.style.background = "#1A2138";
        btnKlinis.style.borderColor = "#2DD4A8";
        btnKlinis.style.boxShadow = "0 0 25px rgba(45,212,168,0.15)";
        btnKlinis.setAttribute("aria-selected", "true");
        if (badgeKlinis) badgeKlinis.classList.remove("hidden");

        // Style Tab AI (Tidak Aktif)
        btnAi.style.background = "#151B2E";
        btnAi.style.borderColor = "rgba(255,255,255,0.08)";
        btnAi.style.boxShadow = "none";
        btnAi.setAttribute("aria-selected", "false");
        if (badgeAi) badgeAi.classList.add("hidden");

        // Tampilkan view konsultan, sembunyikan view chat AI
        if (viewKonsultan) viewKonsultan.classList.remove("hidden");
        if (viewAi) viewAi.classList.add("hidden");

        // Munculkan kembali tombol floating chat bubble di pojok layar
        if (window.TeduhChatOverlay && typeof window.TeduhChatOverlay.show === 'function') {
          window.TeduhChatOverlay.show();
        }
        window.dispatchEvent(new CustomEvent('bt-konsultasi-tab', { detail: { tab: 'klinis' } }));

      } else if (tab === "ai") {
        // Style Tab AI (Sedang Aktif)
        btnAi.style.background = "#1A2138";
        btnAi.style.borderColor = "#2DD4A8";
        btnAi.style.boxShadow = "0 0 25px rgba(45,212,168,0.15)";
        btnAi.setAttribute("aria-selected", "true");
        if (badgeAi) badgeAi.classList.remove("hidden");

        // Style Tab Klinis (Tidak Aktif)
        btnKlinis.style.background = "#151B2E";
        btnKlinis.style.borderColor = "rgba(255,255,255,0.08)";
        btnKlinis.style.boxShadow = "none";
        btnKlinis.setAttribute("aria-selected", "false");
        if (badgeKlinis) badgeKlinis.classList.add("hidden");

        // Tampilkan view chat AI, sembunyikan view konsultan
        if (viewKonsultan) viewKonsultan.classList.add("hidden");
        if (viewAi) viewAi.classList.remove("hidden");

        // Sembunyikan floating chat bubble karena user sudah berada di layar penuh Chat AI
        if (window.TeduhChatOverlay && typeof window.TeduhChatOverlay.hide === 'function') {
          window.TeduhChatOverlay.hide();
        }
        window.dispatchEvent(new CustomEvent('bt-konsultasi-tab', { detail: { tab: 'ai' } }));
      }
    }

    // Event listener klik tab
    btnKlinis.addEventListener("click", () => activateTab("klinis"));
    btnAi.addEventListener("click", () => activateTab("ai"));

    // Aksesibilitas keyboard (Space dan Enter)
    [btnKlinis, btnAi].forEach(btn => {
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          btn.click();
        }
      });
    });

    /**
     * Memeriksa apakah URL memiliki anchor hash (misal: #chat-ai-view atau #tab-ai)
     * agar saat user membuka link tertentu dari halaman lain langsung menuju tab yang tepat
     */
    function handleHashRouting() {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes("ai")) {
        activateTab("ai");
        setTimeout(() => {
          const target = document.getElementById("chat-ai-view");
          if (target) {
            const navOffset = 84;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navOffset;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
          }
        }, 250);
      } else if (hash.includes("konsultan") || hash.includes("klinis")) {
        activateTab("klinis");
        setTimeout(() => {
          const target = document.getElementById("konsultan-view");
          if (target) {
            const navOffset = 84;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navOffset;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
          }
        }, 250);
      }
    }

    handleHashRouting();
    window.addEventListener("hashchange", handleHashRouting);
  }

  // ─── 2. MENGAMBIL DAN MERENDER DAFTAR KONSULTAN ───
  async function loadKonsultan() {
    const grid = document.getElementById("konsultan-grid");
    if (!grid) return;

    try {
      // Ambil data konsultan dari file JSON lokal
      const res = await fetch("/data/konsultan.json");
      if (!res.ok) throw new Error("Gagal mengambil data konsultan (Status " + res.status + ")");
      listKonsultan = await res.json();

      renderKonsultanGrid(listKonsultan);
    } catch (err) {
      console.error("Error saat memuat daftar konsultan:", err);
      grid.innerHTML = `
        <div class="col-span-full text-center py-12 text-[#8A93A8]">
          <p class="mb-2">Belum dapat memuat daftar konsultan saat ini.</p>
          <button onclick="location.reload()" class="text-xs text-[#2DD4A8] underline">Coba Segarkan Halaman</button>
        </div>
      `;
    }
  }

  /**
   * Merender daftar konsultan menjadi kartu-kartu interaktif di dalam grid
   */
  function renderKonsultanGrid(konsultanList) {
    const grid = document.getElementById("konsultan-grid");
    if (!grid) return;

    grid.innerHTML = konsultanList.map((k) => `
      <article class="konsultan-card group relative rounded-2xl overflow-hidden border ${k.isFeatured ? 'border-[#2DD4A8] shadow-[0_0_20px_rgba(45,212,168,0.15)]' : 'border-white/10'} hover:border-[#2DD4A8] transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-1 cursor-pointer aspect-[3/4] flex flex-col justify-end p-3.5 sm:p-4 shadow-lg hover:shadow-xl hover:shadow-[#2DD4A8]/10"
               data-id="${k.id}"
               tabindex="0"
               role="button"
               aria-label="Lihat profil ${k.nama}"
               style="background:#151B2E;">
        <!-- Foto Profil Konsultan -->
        <img src="${k.gambar}" alt="${k.nama}" loading="lazy"
             class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
             onerror="this.onerror=null; this.src='${k.fallback_gambar || "/assets/Images/artikel/hutan21.webp"}';" />
        
        <!-- Lapisan Gradasi Gelap agar Teks Selalu Terbaca Jelas -->
        <div class="absolute inset-0 bg-gradient-to-t from-[#0D1220] via-[#0D1220]/65 to-transparent"></div>

        <!-- Tag Lencana Terverifikasi Tim BerTeduh -->
        <div class="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-md bg-black/60 border border-white/20 text-white shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-[#2DD4A8]"></span>
            Tim BerTeduh
          </span>
        </div>

        <!-- Detail Informasi Konsultan -->
        <div class="relative z-10 flex flex-col gap-0.5">
          <div class="flex items-center gap-1.5 flex-wrap">
            <h4 class="text-sm sm:text-base font-bold text-white leading-snug group-hover:text-[#2DD4A8] transition-colors" style="font-family:'Playfair Display',serif;">${k.nama}</h4>
            <span class="text-[#2DD4A8] text-xs font-bold" title="Terverifikasi">✓</span>
          </div>
          <p class="text-[11px] sm:text-xs text-[#2DD4A8] font-medium line-clamp-1">${k.gelar}</p>
          <p class="text-[10px] sm:text-[11px] text-[#8A93A8] line-clamp-1 mb-1">🏥 ${k.instansi}</p>
          
          <div class="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
            <span class="text-amber-400 font-semibold flex items-center gap-1">
              ★ ${k.rating} <span class="text-[#8A93A8] font-normal text-[10px]">(${k.review_count} sesi)</span>
            </span>
            <span class="text-[#2DD4A8] font-semibold flex items-center gap-1 text-[11px] group-hover:translate-x-1 transition-transform">
              Lihat Profil &rarr;
            </span>
          </div>
        </div>
      </article>
    `).join("");

    // Pasang event listener pada setiap kartu konsultan untuk membuka popup modal
    grid.querySelectorAll(".konsultan-card").forEach((card) => {
      const handleOpen = () => {
        const id = card.getAttribute("data-id");
        const selected = listKonsultan.find((item) => item.id === id);
        if (selected) {
          openKonsultanModal(selected);
        }
      };
      card.addEventListener("click", handleOpen);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      });
    });

    if (window.AOS && typeof window.AOS.refresh === "function") {
      window.AOS.refresh();
    }
  }

  // ─── 3. OVERLAY MODAL DETAIL PROFIL KONSULTAN ───
  function openKonsultanModal(k) {
    const modal = document.getElementById("konsultan-modal");
    const slot = document.getElementById("modal-content-slot");
    if (!modal || !slot) return;

    slot.innerHTML = `
      <!-- Header Profil Konsultan -->
      <div class="flex items-start gap-4 mb-6 pt-1 pr-8">
        <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-white/20 shadow-md">
          <img src="${k.gambar}" alt="${k.nama}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='${k.fallback_gambar || "/assets/Images/artikel/hutan21.webp"}';">
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <h3 class="text-xl sm:text-2xl font-bold text-white leading-tight" style="font-family:'Playfair Display',serif;">${k.nama}</h3>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2DD4A8]/15 text-[#2DD4A8] border border-[#2DD4A8]/30">✓ Verified</span>
          </div>
          <p class="text-xs sm:text-sm text-[#2DD4A8] font-medium mb-1">${k.gelar}</p>
          <p class="text-xs text-[#8A93A8] flex items-center gap-1.5">
            <span>Asal:</span> ${k.instansi}
          </p>
        </div>
      </div>

      <!-- Ringkasan Statistik Singkat -->
      <div class="grid grid-cols-2 gap-3 mb-6">
        <div class="p-3.5 rounded-xl border border-white/10" style="background:rgba(255,255,255,0.03);">
          <p class="text-[11px] text-[#8A93A8] mb-1">Rating Pasien</p>
          <p class="text-sm sm:text-base font-bold text-white flex items-center gap-1">
            <span class="text-amber-400">★</span> ${k.rating} <span class="text-xs font-normal text-[#8A93A8]">/ 5.0</span>
          </p>
          <p class="text-[10px] text-[#8A93A8] mt-0.5">${k.review_count} sesi konseling selesai</p>
        </div>
        <div class="p-3.5 rounded-xl border border-white/10" style="background:rgba(255,255,255,0.03);">
          <p class="text-[11px] text-[#8A93A8] mb-1">Pengalaman Praktik</p>
          <p class="text-sm sm:text-base font-bold text-white flex items-center gap-1">
            <span>👨‍⚕️</span> ${k.pengalaman}
          </p>
          <p class="text-[10px] text-[#2DD4A8] mt-0.5 font-medium">Aktif Berpraktik</p>
        </div>
      </div>

      <!-- Bidang Spesialisasi Psikologi -->
      <div class="mb-6">
        <p class="text-xs font-bold text-[#8A93A8] uppercase tracking-wider mb-2.5">Bidang Psychology &amp; Spesialisasi</p>
        <div class="flex flex-wrap gap-2">
          ${(k.bidang || []).map(b => `<span class="px-3 py-1 rounded-full text-xs font-medium border border-white/10 text-white/90 bg-white/5">✨ ${b}</span>`).join('')}
        </div>
      </div>

      <!-- Deskripsi Pendek Konsultan -->
      <div class="mb-8">
        <p class="text-xs font-bold text-[#8A93A8] uppercase tracking-wider mb-2">Tentang Konsultan</p>
        <p class="text-sm leading-relaxed text-[#8A93A8]">${k.deskripsi}</p>
      </div>

      <!-- Tombol Aksi Langsung ke WhatsApp -->
      <div class="pt-4 border-t border-white/10">
        <a href="${k.kontak_wa}" target="_blank" rel="noopener noreferrer"
           class="w-full py-3.5 px-6 rounded-full text-center text-sm font-bold transition hover:bg-[#25b892] shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01]"
           style="background:#2DD4A8; color:#0D1220;">
          <span>Konsultasi Sekarang</span>
          <span class="text-base">&rarr;</span>
        </a>
      </div>
    `;

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Kunci scroll latar belakang saat modal aktif
  }

  /**
   * Menutup modal profil konsultan dan mengembalikan scroll layar
   */
  function closeKonsultanModal() {
    const modal = document.getElementById("konsultan-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    document.body.style.overflow = ""; // Aktifkan kembali scroll layar
  }

  /**
   * Mengatur event penutup modal (klik tombol X, klik backdrop gelap, atau tekan tombol Escape)
   */
  function initModalEvents() {
    const modal = document.getElementById("konsultan-modal");
    const closeBtn = document.getElementById("modal-close-btn");
    const modalCard = document.getElementById("modal-card");

    if (closeBtn) {
      closeBtn.addEventListener("click", closeKonsultanModal);
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (modalCard && !modalCard.contains(e.target)) {
          closeKonsultanModal();
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeKonsultanModal();
      }
    });
  }

})();
