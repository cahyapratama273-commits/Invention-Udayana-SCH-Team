/**
 * js/konsultasi/main.js — Logika Layanan Konsultasi & Direktori Konsultan BerTeduh
 * 
 * Script ini mengatur:
 * 1. Pemuatan Navbar dinamis melalui loadNavigasi().
 * 2. Sistem perpindahan Tab Layanan (Psikolog & Konselor vs Teman Cerita AI) serta deep-link routing.
 * 3. Pengambilan dan rendering data profil konsultan dari file JSON (data/konsultan.json) dengan inisial avatar.
 * 4. Filter kategori spesialisasi konsultan yang aktif dan responsif.
 * 5. Modal Popup Detail Konsultan yang jujur (berlabel demonstrasi tanpa lisensi/rating palsu).
 * 6. Pengendalian visibilitas floating chat bubble saat berada di tab Chat AI layar penuh.
 */

(function () {
  'use strict';

  // Variabel penampung daftar konsultan yang dimuat dari file JSON
  let listKonsultan = [];

  // Inisialisasi saat struktur dokumen selesai dimuat
  document.addEventListener("DOMContentLoaded", async () => {
    // 1. Muat komponen navigasi bersama
    if (typeof loadNavigasi === "function") {
      await loadNavigasi();
    }
    
    // 2. Inisialisasi tab, filter, modal, dan data konsultan
    initTabs();
    initFilters();
    initModalEvents();
    await loadKonsultan();
  });

  // ─── 1. PENGALIH TAB LAYANAN (Psikolog & Konselor vs Teman Cerita AI) ───
  function initTabs() {
    const btnKlinis = document.getElementById("tab-klinis-btn");
    const btnAi = document.getElementById("tab-ai-btn");
    const viewKonsultan = document.getElementById("konsultan-view");
    const viewAi = document.getElementById("chat-ai-view");

    if (!btnKlinis || !btnAi) return;

    /**
     * Mengaktifkan tampilan tab yang dipilih dan menyesuaikan styling visual
     * Hanya menggunakan border-color sebagai penanda aktif tanpa pergeseran margin/layout
     */
    function activateTab(tab) {
      if (tab === "klinis" || tab === "psikolog") {
        // Tab Psikolog & Konselor Aktif
        btnKlinis.style.background = "#1A2138";
        btnKlinis.style.borderColor = "#2DD4A8";
        btnKlinis.style.color = "#FFFFFF";
        btnKlinis.setAttribute("aria-selected", "true");

        // Tab AI Tidak Aktif
        btnAi.style.background = "#151B2E";
        btnAi.style.borderColor = "rgba(255,255,255,0.08)";
        btnAi.style.color = "#8A93A8";
        btnAi.setAttribute("aria-selected", "false");

        // Tampilkan view konsultan, sembunyikan view chat AI
        if (viewKonsultan) viewKonsultan.classList.remove("hidden");
        if (viewAi) viewAi.classList.add("hidden");

        // Munculkan kembali tombol floating bubble chat jika sebelumnya disembunyikan
        if (window.TeduhChatOverlay && typeof window.TeduhChatOverlay.show === 'function') {
          window.TeduhChatOverlay.show();
        }
        window.dispatchEvent(new CustomEvent('bt-konsultasi-tab', { detail: { tab: 'klinis' } }));

      } else if (tab === "ai" || tab === "chat-ai") {
        // Tab Teman Cerita AI Aktif
        btnAi.style.background = "#1A2138";
        btnAi.style.borderColor = "#2DD4A8";
        btnAi.style.color = "#FFFFFF";
        btnAi.setAttribute("aria-selected", "true");

        // Tab Psikolog Tidak Aktif
        btnKlinis.style.background = "#151B2E";
        btnKlinis.style.borderColor = "rgba(255,255,255,0.08)";
        btnKlinis.style.color = "#8A93A8";
        btnKlinis.setAttribute("aria-selected", "false");

        // Tampilkan view chat AI, sembunyikan view konsultan
        if (viewKonsultan) viewKonsultan.classList.add("hidden");
        if (viewAi) viewAi.classList.remove("hidden");

        // Sembunyikan floating chat bubble karena user sudah di layar penuh Chat AI
        if (window.TeduhChatOverlay && typeof window.TeduhChatOverlay.hide === 'function') {
          window.TeduhChatOverlay.hide();
        }
        window.dispatchEvent(new CustomEvent('bt-konsultasi-tab', { detail: { tab: 'ai' } }));
      }
    }

    // Event listener klik tab
    btnKlinis.addEventListener("click", () => activateTab("klinis"));
    btnAi.addEventListener("click", () => activateTab("ai"));

    // Aksesibilitas keyboard (Space & Enter)
    [btnKlinis, btnAi].forEach(btn => {
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          btn.click();
        }
      });
    });

    /**
     * Penanganan Deep Links URL hash (#psikolog atau #chat-ai)
     */
    function handleHashRouting() {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes("chat-ai") || hash.includes("ai")) {
        activateTab("ai");
        setTimeout(() => {
          const target = document.getElementById("chat-ai-view");
          if (target) {
            const navOffset = 84;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navOffset;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
          }
        }, 200);
      } else if (hash.includes("psikolog") || hash.includes("konsultan") || hash.includes("klinis")) {
        activateTab("klinis");
        setTimeout(() => {
          const target = document.getElementById("konsultan-view");
          if (target) {
            const navOffset = 84;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navOffset;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
          }
        }, 200);
      }
    }

    handleHashRouting();
    window.addEventListener("hashchange", handleHashRouting);
  }

  // ─── 2. FILTER KATEGORI KONSULTAN ───
  function initFilters() {
    const filterBtns = document.querySelectorAll("#filter-container .filter-btn");
    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        filterBtns.forEach(b => {
          b.classList.remove("active-filter");
          b.style.background = "rgba(255,255,255,0.05)";
          b.style.color = "#8A93A8";
          b.style.borderColor = "rgba(255,255,255,0.1)";
        });
        btn.classList.add("active-filter");
        btn.style.background = "#2DD4A8";
        btn.style.color = "#0D1220";
        btn.style.borderColor = "#2DD4A8";

        const filterValue = btn.getAttribute("data-filter");
        if (!filterValue || filterValue === "all") {
          renderKonsultanGrid(listKonsultan);
        } else {
          const filtered = listKonsultan.filter(k => {
            if (Array.isArray(k.kategori) && k.kategori.includes(filterValue)) return true;
            if (Array.isArray(k.bidang)) {
              return k.bidang.some(b => b.toLowerCase().includes(filterValue.toLowerCase()));
            }
            return false;
          });
          renderKonsultanGrid(filtered);
        }
      });
    });
  }

  // ─── 3. MENGAMBIL DAN MERENDER DAFTAR KONSULTAN ───
  async function loadKonsultan() {
    const grid = document.getElementById("konsultan-grid");
    if (!grid) return;

    try {
      const res = await fetch("/data/konsultan.json");
      if (!res.ok) throw new Error("Gagal mengambil data konsultan (Status " + res.status + ")");
      listKonsultan = await res.json();

      renderKonsultanGrid(listKonsultan);
    } catch (err) {
      console.error("Error saat memuat daftar konsultan:", err);
      grid.innerHTML = `
        <div class="col-span-full text-center py-12 text-[#8A93A8]">
          <p class="mb-2">Belum dapat memuat daftar konsultan saat ini.</p>
          <button onclick="location.reload()" class="text-xs text-[#2DD4A8] underline cursor-pointer">Coba Segarkan Halaman</button>
        </div>
      `;
    }
  }

  /**
   * Merender daftar konsultan menjadi kartu interaktif dengan avatar inisial
   */
  function renderKonsultanGrid(konsultanList) {
    const grid = document.getElementById("konsultan-grid");
    if (!grid) return;

    if (konsultanList.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-12 text-[#8A93A8]">
          <p class="text-sm">Tidak ada konsultan yang cocok dengan filter yang dipilih.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = konsultanList.map((k) => `
      <article class="konsultan-card group relative rounded-2xl bg-[#151B2E]/95 md:bg-white/10 backdrop-blur-md border border-white/20 hover:border-[#2DD4A8] transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-1 cursor-pointer flex flex-col justify-between p-4 sm:p-6 shadow-lg hover:shadow-xl hover:shadow-[#2DD4A8]/10"
               data-id="${k.id}"
               tabindex="0"
               role="button"
               aria-label="Lihat profil ${k.nama}">
        <div>
          <!-- Avatar Profil & Indikator Pengalaman -->
          <div class="flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden flex items-center justify-center font-bold text-base sm:text-xl shadow-md border border-white/20 shrink-0 relative"
                 style="background: ${k.avatar_gradient || 'linear-gradient(135deg, #0d9488, #2dd4a8)'}; color: ${k.avatar_color || '#042f2e'};">
              ${(k.foto || k.gambar) ? `
                <img src="${k.foto || k.gambar}" alt="${k.nama}" class="w-full h-full object-cover relative z-10 transition-transform duration-300 group-hover:scale-105" onerror="this.style.display='none';" />
                <span class="absolute inset-0 flex items-center justify-center z-0 font-bold text-base sm:text-xl">${k.inisial}</span>
              ` : `
                <span>${k.inisial}</span>
              `}
            </div>
            <span class="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] font-medium border border-white/10 text-[#8A93A8] bg-white/5 whitespace-nowrap">
              <i class="ph ph-briefcase text-[10px] sm:text-xs text-[#2DD4A8]"></i>
              ${k.pengalaman}
            </span>
          </div>

          <!-- Informasi Konsultan -->
          <h4 class="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-[#2DD4A8] transition-colors leading-snug" style="font-family:'Plus Jakarta Sans', sans-serif;">
            ${k.nama}
          </h4>
          <p class="text-[11px] sm:text-xs text-[#2DD4A8] font-medium mb-1.5 line-clamp-1">${k.gelar}</p>
          <p class="text-[11px] text-[#8A93A8] line-clamp-1 mb-3 sm:mb-4 flex items-center gap-1">
            <i class="ph ph-buildings text-[10px] sm:text-xs text-[#2DD4A8] shrink-0"></i>
            <span class="truncate">${k.instansi}</span>
          </p>

          <!-- Tag Bidang Spesialisasi -->
          <div class="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
            ${(k.bidang || []).slice(0, 3).map(b => `
              <span class="text-[9px] sm:text-[10px] px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full border border-white/10 bg-white/5 text-slate-300">
                ${b}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Aksi Bawah -->
        <div class="pt-3 border-t border-white/10 flex items-center justify-between text-xs mt-auto">
          <span class="text-[10px] sm:text-[11px] text-[#8A93A8] flex items-center gap-1">
            <i class="ph ph-shield-check text-[#2DD4A8] text-[10px] sm:text-xs"></i> ${k.jenis_kelamin || 'Terverifikasi'}
          </span>
          <span class="text-[#2DD4A8] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform text-[11px] sm:text-xs">
            Lihat Detail &rarr;
          </span>
        </div>
      </article>
    `).join("");

    // Event listener buka modal detail saat kartu diklik
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

  // ─── 4. OVERLAY MODAL DETAIL PROFIL KONSULTAN ───
  function openKonsultanModal(k) {
    const modal = document.getElementById("konsultan-modal");
    const slot = document.getElementById("modal-content-slot");
    if (!modal || !slot) return;

    // Sembunyikan floating chat bubble saat modal konsultan terbuka
    if (window.TeduhChatOverlay && typeof window.TeduhChatOverlay.hide === 'function') {
      window.TeduhChatOverlay.hide();
    }

    slot.innerHTML = `
      <!-- Header Profil Konsultan (Avatar Foto & Inisial) -->
      <div class="flex items-start gap-4 mb-6 pt-1 pr-8">
        <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex items-center justify-center font-bold text-2xl sm:text-3xl shrink-0 border border-white/20 shadow-md relative"
             style="background: ${k.avatar_gradient || 'linear-gradient(135deg, #0d9488, #2dd4a8)'}; color: ${k.avatar_color || '#042f2e'};">
          ${(k.foto || k.gambar) ? `
            <img src="${k.foto || k.gambar}" alt="${k.nama}" class="w-full h-full object-cover relative z-10" onerror="this.style.display='none';" />
            <span class="absolute inset-0 flex items-center justify-center z-0 font-bold text-2xl sm:text-3xl">${k.inisial}</span>
          ` : `
            <span>${k.inisial}</span>
          `}
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-xl sm:text-2xl font-bold text-white leading-tight mb-1" style="font-family:'Plus Jakarta Sans', sans-serif;">${k.nama}</h3>
          <p class="text-xs sm:text-sm text-[#2DD4A8] font-medium mb-1">${k.gelar}</p>
          <p class="text-xs text-[#8A93A8] flex items-center gap-1.5">
            <i class="ph ph-buildings text-xs text-[#2DD4A8]"></i>
            <span>${k.instansi}</span>
          </p>
        </div>
      </div>

      <!-- Ringkasan Praktik & Keterangan Demo -->
      <div class="grid grid-cols-2 gap-3 mb-6">
        <div class="p-3.5 rounded-xl border border-white/10" style="background:rgba(255,255,255,0.03);">
          <p class="text-[11px] text-[#8A93A8] mb-1">Pengalaman</p>
          <p class="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
            <i class="ph ph-briefcase text-[#2DD4A8]"></i> ${k.pengalaman}
          </p>
          <p class="text-[10px] text-[#2DD4A8] mt-0.5 font-medium">Praktik Konseling</p>
        </div>
        <div class="p-3.5 rounded-xl border border-white/10" style="background:rgba(255,255,255,0.03);">
          <p class="text-[11px] text-[#8A93A8] mb-1">Jenis Kelamin</p>
          <p class="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
            <i class="ph ph-user text-[#2DD4A8]"></i> ${k.jenis_kelamin || 'Terverifikasi'}
          </p>
          <p class="text-[10px] text-[#2DD4A8] mt-0.5 font-medium">Konsultan Profesional</p>
        </div>
      </div>

      <!-- Bidang Spesialisasi Psikologi -->
      <div class="mb-6">
        <p class="text-xs font-bold text-[#8A93A8] uppercase tracking-wider mb-2.5">Bidang &amp; Spesialisasi</p>
        <div class="flex flex-wrap gap-2">
          ${(k.bidang || []).map(b => `<span class="px-3 py-1 rounded-full text-xs font-medium border border-white/10 text-white/90 bg-white/5 flex items-center gap-1.5"><i class="ph ph-sparkle text-xs text-[#2DD4A8]"></i><span>${b}</span></span>`).join('')}
        </div>
      </div>

      <!-- Deskripsi Pendek Konsultan -->
      <div class="mb-8">
        <p class="text-xs font-bold text-[#8A93A8] uppercase tracking-wider mb-2">Tentang Pendamping</p>
        <p class="text-sm leading-relaxed text-[#CBD5E1]">${k.deskripsi}</p>
      </div>

      <!-- Tombol Aksi Langsung ke WhatsApp -->
      <div class="pt-4 border-t border-white/10">
        <a href="${k.kontak_wa}" target="_blank" rel="noopener noreferrer"
           class="w-full py-3.5 px-6 rounded-full text-center text-sm font-bold transition hover:bg-[#25b892] shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01]"
           style="background:#2DD4A8; color:#0D1220;">
          <i class="ph ph-whatsapp-logo text-lg"></i>
          <span>Konsultasi Sekarang</span>
          <span class="text-base">&rarr;</span>
        </a>
      </div>
    `;

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Kunci scroll layar utama
  }

  function closeKonsultanModal() {
    const modal = document.getElementById("konsultan-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    document.body.style.overflow = ""; // Pulihkan scroll layar

    // Pulihkan floating chat bubble jika tab klinis sedang aktif
    const tabKlinis = document.getElementById("tab-klinis-btn");
    const isKlinis = !tabKlinis || tabKlinis.getAttribute("aria-selected") === "true";
    if (isKlinis && window.TeduhChatOverlay && typeof window.TeduhChatOverlay.show === 'function') {
      window.TeduhChatOverlay.show();
    }
  }

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
