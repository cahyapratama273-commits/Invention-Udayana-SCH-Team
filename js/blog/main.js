/**
 * main.js (Halaman Blog) — Logika Katalog Artikel BerTeduh
 *
 * Script ini bertanggung jawab untuk:
 * 1. Memuat navbar secara dinamis melalui fungsi loadNavigasi().
 * 2. Mengambil data seluruh artikel dari file JSON (data/artikel.json) dengan proteksi fallback path.
 * 3. Menampilkan "Artikel Unggulan" (Featured Card) yang dipersonalisasi berdasarkan kondisi emosi user.
 * 4. Merender section "Untuk Kamu" (rekomendasi artikel yang cocok dengan hasil kuis cek emosi).
 * 5. Merender section kurasi khusus "Yoga untuk Pikiranmu".
 * 6. Mengelola filter kategori dinamis, kolom pencarian teks (search), dan sistem penomoran halaman (pagination).
 */
(async function initBlog() {
  // 1. Muat komponen Navigasi atas
  if (typeof loadNavigasi === "function") {
    await loadNavigasi();
  }

  // 2. Tangkap elemen-elemen penampung HTML di DOM
  var gridEl = document.getElementById("blog-artikel-grid");           // Grid untuk menampilkan semua artikel
  var featuredEl = document.getElementById("featured-artikel-slot");   // Slot kartu artikel utama di bagian atas
  var filterEl = document.getElementById("blog-category-filter");       // Daftar tab pill kategori filter
  var searchInput = document.getElementById("blog-search-input");       // Input pencarian artikel berdasarkan judul/kata kunci
  
  // Jika kontainer grid utama tidak ada di halaman ini, hentikan eksekusi
  if (!gridEl) return;

  try {
    // 3. Mengambil file data/artikel.json dengan mencoba beberapa opsi path relatif
    var semuaArtikel = [];
    var paths = ["/data/artikel.json", "../../data/artikel.json", "../data/artikel.json", "data/artikel.json"];
    for (var p of paths) {
      try {
        var r = await fetch(p);
        if (r.ok) {
          semuaArtikel = await r.json();
          break; // Berhenti looping jika fetch berhasil
        }
      } catch (e) {}
    }
    if (semuaArtikel.length === 0) throw new Error("Gagal memuat artikel dari data source");

    // Tangkap elemen untuk section personalisasi dan navigasi halaman
    var untukKamuSection = document.getElementById("section-untuk-kamu");
    var untukKamuGrid = document.getElementById("untuk-kamu-grid");
    var untukKamuFallback = document.getElementById("untuk-kamu-fallback");
    var paginationEl = document.getElementById("blog-pagination");

    // Urutkan seluruh artikel berdasarkan ID secara ascending (id: '1', '2', ..., '10')
    semuaArtikel.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

    // ─── STATE HALAMAN BLOG ───
    var currentFilter = "Semua"; // Kategori yang sedang aktif dipilih (default: "Semua")
    var searchQuery = "";        // Kata kunci yang sedang diketik di input pencarian
    var currentPage = 1;         // Nomor halaman pagination aktif saat ini
    var ITEMS_PER_PAGE = 6;      // Batas jumlah artikel yang tampil per halaman (6 kartu per page)
    
    // Ekstrak daftar kategori unik langsung dari data JSON artikel secara otomatis
    var categories = [...new Set(semuaArtikel.map(a => a.kategori))].filter(Boolean).sort();
    categories.unshift("Semua"); // Tambahkan tab "Semua" di urutan paling awal

    // Periksa apakah ada parameter kategori dari URL (misalnya dari klik tombol di halaman lain: ?kategori=Yoga)
    var urlParams = new URLSearchParams(window.location.search);
    var paramCat = urlParams.get("kategori");
    if (paramCat) {
      var matchedCat = categories.find(c => c.toLowerCase() === paramCat.trim().toLowerCase());
      if (matchedCat) {
        currentFilter = matchedCat; // Pasang filter sesuai parameter URL
      }
    }

    /**
     * Memilih satu artikel unggulan (featured) berdasarkan kondisi emosi user dari kuis
     */
    function getFeaturedArtikel() {
      var savedMood = localStorage.getItem("userMentalKondisi");
      var candidates = [];

      // Saring artikel yang sesuai dengan mood user (baik / cemas / berat)
      if (savedMood === "baik" || savedMood === "cemas" || savedMood === "berat") {
        candidates = semuaArtikel.filter(a => a.kondisi === savedMood);
      }

      // Jika belum ada kuis atau tidak ada artikel yang cocok, gunakan fallback artikel featured
      if (candidates.length === 0) {
        candidates = semuaArtikel.filter(a => a.featured);
        
        // Fallback terakhir jika tidak ada satupun artikel ber-flag featured
        if (candidates.length === 0) {
          candidates = semuaArtikel;
        }
      }

      // Ambil secara acak dari daftar kandidat agar tampilan selalu segar tiap kali halaman dibuka
      var randomIndex = Math.floor(Math.random() * candidates.length);
      return candidates[randomIndex] || semuaArtikel[0];
    }

    /**
     * Membuat slug URL yang rapi dan aman untuk SEO (misal: "Mengatasi Cemas" -> "mengatasi-cemas")
     */
    function createSlug(text) {
      return text ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
    }

    /**
     * Merender kartu besar "Artikel Unggulan" di slot paling atas halaman
     */
    function renderFeatured() {
      if (!featuredEl) return;
      var featuredArticle = getFeaturedArtikel();
      if (!featuredArticle) return;

      var catSlug = createSlug(featuredArticle.kategori);
      var titleSlug = createSlug(featuredArticle.judul);
      var featuredUrl = `/artikel/?id=${featuredArticle.id}&kategori=${catSlug}&slug=${titleSlug}`;

      var html = `
      <a href="${featuredUrl}" class="group block rounded-2xl overflow-hidden bg-white/10 border border-white/20 hover:border-[#2DD4A8] backdrop-blur-md transition-all duration-300 shadow-xl hover:shadow-2xl" style="text-decoration:none;">
        <div class="flex flex-col md:flex-row h-full">
          <div class="w-full md:w-1/2 overflow-hidden aspect-[16/9] md:aspect-[4/3] bg-white/5">
            <div class="w-full h-full relative">
              <img src="${featuredArticle.gambar}" alt="${featuredArticle.judul}" class="w-full h-full object-cover" onerror="this.src='/assets/Images/placeholder.svg';">
            </div>
          </div>
          <div class="w-full md:w-1/2 p-5 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center">
            <span class="text-[11px] sm:text-xs font-bold uppercase tracking-widest mb-2 sm:mb-3 md:mb-4 text-[#2DD4A8]">${featuredArticle.kategori}</span>
            <h3 class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 md:mb-4 leading-snug md:leading-tight text-[#F5F5F5] group-hover:text-[#2DD4A8] transition-colors" style="font-family:'Plus Jakarta Sans', sans-serif;">
              ${featuredArticle.judul}
            </h3>
            <p class="text-xs sm:text-sm md:text-base leading-relaxed mb-4 sm:mb-6 line-clamp-3 md:line-clamp-none text-[#8A93A8]">
              ${featuredArticle.ringkasan}
            </p>
            <span class="text-xs sm:text-sm font-medium mt-auto text-[#2DD4A8] group-hover:text-[#25b892] inline-flex items-center gap-1 group-hover:translate-x-1 transition-all">Baca selengkapnya &rarr;</span>
          </div>
        </div>
      </a>
      `;
      featuredEl.innerHTML = html;
    }

    /**
     * Merender section "Untuk Kamu" (4 artikel rekomendasi hasil kuis mental user)
     */
    function renderUntukKamu() {
      if (!untukKamuGrid) return;

      // Baca status kondisi emosi user dari localStorage
      var savedMood = localStorage.getItem("userMentalKondisi");
      var validMoods = ["baik", "cemas", "berat"];

      // Jika belum pernah mengisi kuis, tampilkan kartu ajakan mengisi kuis cek emosi
      if (!savedMood || !validMoods.includes(savedMood)) {
        if (untukKamuFallback) {
          untukKamuGrid.innerHTML = "";
          untukKamuGrid.classList.add("hidden");
          untukKamuFallback.classList.remove("hidden");
        } else if (untukKamuSection) {
          untukKamuSection.classList.add("hidden");
        }
        return;
      }

      // Filter artikel yang memiliki field "kondisi" yang sama persis dengan mood user
      var matchingArticles = semuaArtikel.filter(a => a.kondisi === savedMood);

      if (matchingArticles.length === 0) {
        if (untukKamuSection) untukKamuSection.classList.add("hidden");
        return;
      }

      // Prioritaskan artikel unggulan (featured: true), ambil maksimal 4 artikel
      var sortedMatching = [...matchingArticles].sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      });

      var selectedArticles = sortedMatching.slice(0, 4);

      // Render 4 kartu artikel ke dalam grid 2x2
      if (typeof renderArtikelCardCompact === "function") {
        untukKamuGrid.innerHTML = selectedArticles.map(renderArtikelCardCompact).join("");
      } else if (typeof renderArtikelCard === "function") {
        untukKamuGrid.innerHTML = selectedArticles.map(a => renderArtikelCard(a, { compact: true })).join("");
      }

      if (untukKamuFallback) untukKamuFallback.classList.add("hidden");
      untukKamuGrid.classList.remove("hidden");
      if (untukKamuSection) untukKamuSection.classList.remove("hidden");
    }

    /**
     * Merender section kurasi "Yoga untuk Pikiranmu" (preview 4 artikel pose yoga)
     */
    function renderYogaSection() {
      var yogaGrid = document.getElementById("yoga-artikel-grid");
      if (!yogaGrid) return;

      var yogaArticles = semuaArtikel.filter(a => a.kategori === "Yoga");
      if (yogaArticles.length === 0) {
        var yogaSec = document.getElementById("section-yoga");
        if (yogaSec) yogaSec.classList.add("hidden");
        return;
      }

      // Urutkan pose unggulan di depan, ambil maksimal 4 artikel
      var sortedYoga = [...yogaArticles].sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      });

      var selectedYoga = sortedYoga.slice(0, 4);

      if (typeof renderArtikelCardCompact === "function") {
        yogaGrid.innerHTML = selectedYoga.map(renderArtikelCardCompact).join("");
      } else if (typeof renderArtikelCard === "function") {
        yogaGrid.innerHTML = selectedYoga.map(a => renderArtikelCard(a, { compact: true })).join("");
      }
    }

    /**
     * Merender tombol-tombol filter cepat (quick pills) dan isi modal kategori dengan scroll vertikal
     */
    function renderFilters() {
      // 1. Render Quick Category Pills di baris utama (tanpa horizontal scroll)
      if (filterEl) {
        var defaultQuick = ["Semua", "Kecemasan", "Produktivitas", "Tidur", "Yoga", "Fisik"];
        var quickPills = defaultQuick.filter(c => c === "Semua" || categories.includes(c));
        if (currentFilter && !quickPills.includes(currentFilter)) {
          quickPills.push(currentFilter);
        }

        var quickHtml = quickPills.map(cat => {
          var isActive = cat === currentFilter;
          var activeClass = isActive 
            ? 'bg-[#2DD4A8] border-[#2DD4A8] text-[#0D1220] font-bold shadow-md ring-2 ring-[#2DD4A8]/30' 
            : 'bg-[#151B2E] border-white/15 text-[#8A93A8] hover:border-[#2DD4A8] hover:text-[#2DD4A8] hover:bg-white/5';
          
          return `<button type="button" class="category-tab px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-medium transition cursor-pointer ${activeClass}" data-cat="${cat}">${cat}</button>`;
        }).join('');
        filterEl.innerHTML = quickHtml;
      }

      // 2. Hitung jumlah artikel per kategori
      var catCounts = {};
      semuaArtikel.forEach(a => {
        if (a.kategori) catCounts[a.kategori] = (catCounts[a.kategori] || 0) + 1;
      });

      // 3. Render SEMUA kategori di dalam overlay modal (scroll vertikal)
      var modalListEl = document.getElementById("category-modal-list");
      if (modalListEl) {
        var modalHtml = categories.map(cat => {
          var count = cat === "Semua" ? semuaArtikel.length : (catCounts[cat] || 0);
          var isActive = cat === currentFilter;
          var activeClass = isActive 
            ? 'bg-[#2DD4A8] border-[#2DD4A8] text-[#0D1220] font-bold shadow-md ring-2 ring-[#2DD4A8]/40' 
            : 'bg-[#1A2138] border-white/10 text-white/80 hover:border-[#2DD4A8] hover:text-white hover:bg-white/10';
          var countBadgeClass = isActive 
            ? 'bg-black/20 text-[#0D1220] font-bold' 
            : 'bg-white/10 text-[#8A93A8] group-hover:text-white';

          return `
            <button type="button" 
                    class="category-modal-item group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm transition-all duration-200 cursor-pointer ${activeClass}" 
                    data-cat="${cat}">
              <span class="font-medium">${cat}</span>
              <span class="text-[11px] px-2 py-0.5 rounded-full ${countBadgeClass}">${count}</span>
            </button>
          `;
        }).join('');
        modalListEl.innerHTML = modalHtml;
      }

      // 4. Update badge counter & trigger label pada tombol "Semua Kategori"
      var badgeCountEl = document.getElementById("category-badge-count");
      if (badgeCountEl) {
        var totalDistinct = categories.filter(c => c !== "Semua").length;
        badgeCountEl.textContent = `${totalDistinct} Topik`;
      }

      var triggerLabelEl = document.getElementById("btn-open-categories-label");
      if (triggerLabelEl) {
        if (currentFilter && currentFilter !== "Semua") {
          triggerLabelEl.textContent = `Kategori: ${currentFilter}`;
        } else {
          triggerLabelEl.textContent = "Semua Kategori";
        }
      }

      var selectedTextEl = document.getElementById("category-modal-selected-text");
      if (selectedTextEl) {
        selectedTextEl.innerHTML = `Kategori aktif: <strong class="text-[#2DD4A8]">${currentFilter}</strong>`;
      }
    }

    /**
     * Menghitung jangkauan nomor halaman untuk pagination dengan dukungan titik-titik (...)
     */
    function getPaginationRange(current, total) {
      const delta = 1;
      const range = [];
      const rangeWithDots = [];
      let l;

      for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
          range.push(i);
        }
      }

      for (let i of range) {
        if (l) {
          if (i - l === 2) {
            rangeWithDots.push(l + 1);
          } else if (i - l !== 1) {
            rangeWithDots.push('...');
          }
        }
        rangeWithDots.push(i);
        l = i;
      }

      return rangeWithDots;
    }

    /**
     * Merender kontrol tombol navigasi halaman (Sebelumnya, Nomor Halaman, Selanjutnya)
     */
    function renderPagination(totalItems) {
      if (!paginationEl) return;
      var totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

      // Jika hanya ada 1 halaman atau kurang, jangan tampilkan pagination
      if (totalPages <= 1) {
        paginationEl.innerHTML = "";
        return;
      }

      var html = [];

      // Tombol "Sebelumnya" (Prev)
      var prevDisabled = currentPage === 1 ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:border-[#2DD4A8] hover:text-[#2DD4A8]';
      html.push(`
        <button class="page-nav-btn px-4 py-2 rounded-full border border-white/10 text-xs sm:text-sm font-semibold transition backdrop-blur-md bg-[#151B2E]/70 text-[#F5F5F5] ${prevDisabled}"
                data-page="${currentPage - 1}">
          &larr; sebelumnya
        </button>
      `);

      // Daftar Tombol Nomor Halaman
      var pageRange = getPaginationRange(currentPage, totalPages);
      for (var item of pageRange) {
        if (item === '...') {
          html.push('<span class="px-2 py-1 text-xs text-[#8A93A8] font-semibold self-center">...</span>');
        } else {
          var p = item;
          var isCurrent = p === currentPage;
          if (isCurrent) {
            html.push(`
              <button class="page-num-btn w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold text-xs sm:text-sm shadow-lg transition bg-[#2DD4A8] text-[#0D1220] shadow-[0_0_15px_rgba(45,212,168,0.3)]"
                      data-page="${p}">
                ${p}
              </button>
            `);
          } else {
            html.push(`
              <button class="page-num-btn w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/10 text-xs sm:text-sm font-medium transition hover:border-[#2DD4A8] hover:text-[#2DD4A8] backdrop-blur-md bg-[#151B2E]/70 text-[#8A93A8]"
                      data-page="${p}">
                ${p}
              </button>
            `);
          }
        }
      }

      // Tombol "Selanjutnya" (Next)
      var nextDisabled = currentPage === totalPages ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:border-[#2DD4A8] hover:text-[#2DD4A8]';
      html.push(`
        <button class="page-nav-btn px-4 py-2 rounded-full border border-white/10 text-xs sm:text-sm font-semibold transition backdrop-blur-md bg-[#151B2E]/70 text-[#F5F5F5] ${nextDisabled}"
                data-page="${currentPage + 1}">
          Selanjutnya &rarr;
        </button>
      `);

      paginationEl.innerHTML = html.join("");

      // Pasang event listener klik pada seluruh tombol pagination
      paginationEl.querySelectorAll("button[data-page]").forEach(btn => {
        btn.addEventListener("click", function () {
          var targetPage = parseInt(this.getAttribute("data-page"), 10);
          if (targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
            currentPage = targetPage;
            renderArticles();
            // Scroll ke atas bagian grid artikel dengan animasi halus
            var scrollTarget = document.getElementById("section-semua-artikel") || document.getElementById("blog-artikel-grid");
            if (scrollTarget) {
              const yOffset = -90;
              const y = scrollTarget.getBoundingClientRect().top + window.pageYOffset + yOffset;
              window.scrollTo({ top: y, behavior: 'smooth' });
            }
          }
        });
      });
    }

    /**
     * Merender kartu-kartu artikel di grid utama berdasarkan filter, pencarian, dan pagination
     */
    function renderArticles() {
      if (!gridEl) return;
      
      // 1. Saring berdasarkan kategori aktif
      var filtered = currentFilter === "Semua" 
        ? semuaArtikel 
        : semuaArtikel.filter(a => a.kategori === currentFilter);
        
      // 2. Saring berdasarkan kata kunci pencarian (judul, ringkasan, atau kategori)
      if (searchQuery.trim() !== "") {
        var q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(a => 
          (a.judul && a.judul.toLowerCase().includes(q)) || 
          (a.ringkasan && a.ringkasan.toLowerCase().includes(q)) ||
          (a.kategori && a.kategori.toLowerCase().includes(q))
        );
      }

      var totalCount = filtered.length;
      var totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
      if (currentPage > totalPages) currentPage = 1;

      // 3. Potong data untuk 6 kartu pada halaman yang sedang aktif
      var startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      var pageItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        
      // 4. Render ke dalam grid
      if (typeof renderArtikelCard === "function") {
        if (pageItems.length > 0) {
          gridEl.innerHTML = pageItems.map(renderArtikelCard).join("");
        } else {
          gridEl.innerHTML = '<div class="col-span-full py-16 text-center"><p style="color:#8A93A8;" class="text-base">Tidak ada artikel yang cocok dengan pencarian / filter.</p></div>';
        }
      } else {
        console.error("Fungsi renderArtikelCard tidak ditemukan.");
      }

      // Perbarui tombol pagination dan refresh animasi AOS
      renderPagination(totalCount);
      if (window.AOS) window.AOS.refresh();
    }

    /**
     * Mengatur filter kategori secara terprogram (misal via klik tombol atau link)
     */
    function setCategoryFilter(categoryName, shouldScroll) {
      currentFilter = categoryName;
      currentPage = 1;      // Kembalikan ke halaman pertama
      searchQuery = "";     // Reset kata kunci pencarian
      if (searchInput) searchInput.value = "";

      // Perbarui query parameter di URL browser tanpa me-reload halaman
      try {
        var newUrl = new URL(window.location);
        if (categoryName === "Semua") {
          newUrl.searchParams.delete('kategori');
        } else {
          newUrl.searchParams.set('kategori', categoryName);
        }
        window.history.replaceState({}, '', newUrl);
      } catch (e) {}

      renderFilters();
      renderArticles();

      if (shouldScroll) {
        var scrollTarget = document.getElementById("semua-artikel-heading") || document.getElementById("section-semua-artikel") || document.getElementById("blog-artikel-grid");
        if (scrollTarget) {
          const yOffset = -90;
          const y = scrollTarget.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
    }

    // Expose fungsi pilih kategori ke global window agar bisa dipanggil dari anchor link mana pun
    window.selectBlogCategory = function(categoryName) {
      setCategoryFilter(categoryName, true);
    };

    // ─── EVENT LISTENERS ───
    // Event klik pada tab kategori cepat
    if (filterEl) {
      filterEl.addEventListener('click', function(e) {
        var tab = e.target.closest('.category-tab');
        if (!tab) return;
        
        var selectedCat = tab.getAttribute('data-cat');
        setCategoryFilter(selectedCat, false);
      });
    }

    // Event input pencarian artikel
    if (searchInput) {
      searchInput.addEventListener('input', function(e) {
        searchQuery = e.target.value;
        currentPage = 1; // Reset ke halaman 1 saat mulai mencari
        renderArticles();
      });
    }

    // ─── MODAL OVERLAY SEMUA KATEGORI (Scroll Vertikal) ───
    var modalEl = document.getElementById("category-overlay-modal");
    var modalCard = document.getElementById("category-modal-card");
    var openBtn = document.getElementById("btn-open-categories");
    var closeBtn = document.getElementById("category-modal-close-btn");
    var resetBtn = document.getElementById("category-modal-reset-btn");
    var categorySearchInput = document.getElementById("category-search-input");
    var categoryCaret = document.getElementById("category-caret");
    var modalListEl = document.getElementById("category-modal-list");

    function openCategoryModal() {
      if (!modalEl || !modalCard) return;
      modalEl.classList.remove("hidden");
      // Trigger reflow agar transisi CSS berjalan mulus
      void modalEl.offsetWidth;
      modalEl.classList.remove("opacity-0", "pointer-events-none");
      modalCard.classList.remove("scale-95");
      modalCard.classList.add("scale-100");
      if (openBtn) openBtn.setAttribute("aria-expanded", "true");
      if (categoryCaret) categoryCaret.classList.add("rotate-180");
      document.body.style.overflow = "hidden"; // Mencegah background ikut scroll saat modal terbuka

      setTimeout(() => {
        if (categorySearchInput) categorySearchInput.focus();
      }, 100);
    }

    function closeCategoryModal() {
      if (!modalEl || !modalCard) return;
      modalEl.classList.add("opacity-0", "pointer-events-none");
      modalCard.classList.remove("scale-100");
      modalCard.classList.add("scale-95");
      if (openBtn) openBtn.setAttribute("aria-expanded", "false");
      if (categoryCaret) categoryCaret.classList.remove("rotate-180");
      document.body.style.overflow = "";

      setTimeout(() => {
        modalEl.classList.add("hidden");
        if (categorySearchInput) {
          categorySearchInput.value = "";
          filterModalCategoryItems("");
        }
      }, 300);
    }

    function filterModalCategoryItems(query) {
      if (!modalListEl) return;
      var q = query.toLowerCase().trim();
      var items = modalListEl.querySelectorAll(".category-modal-item");
      var matchCount = 0;
      items.forEach(item => {
        var cat = item.getAttribute("data-cat") || "";
        if (cat.toLowerCase().includes(q)) {
          item.style.display = "inline-flex";
          matchCount++;
        } else {
          item.style.display = "none";
        }
      });

      var emptyNotice = document.getElementById("category-modal-empty-notice");
      if (matchCount === 0) {
        if (!emptyNotice) {
          emptyNotice = document.createElement("div");
          emptyNotice.id = "category-modal-empty-notice";
          emptyNotice.className = "w-full py-8 text-center text-sm text-[#8A93A8]";
          emptyNotice.innerHTML = `<i class="ph ph-magnifying-glass text-2xl mb-1 block opacity-50"></i>Topik "<strong>${query}</strong>" tidak ditemukan.`;
          modalListEl.appendChild(emptyNotice);
        } else {
          emptyNotice.style.display = "block";
          emptyNotice.innerHTML = `<i class="ph ph-magnifying-glass text-2xl mb-1 block opacity-50"></i>Topik "<strong>${query}</strong>" tidak ditemukan.`;
        }
      } else if (emptyNotice) {
        emptyNotice.style.display = "none";
      }
    }

    if (openBtn) openBtn.addEventListener("click", openCategoryModal);
    if (closeBtn) closeBtn.addEventListener("click", closeCategoryModal);
    if (modalEl) {
      modalEl.addEventListener("click", function(e) {
        if (e.target === modalEl) closeCategoryModal();
      });
    }
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && modalEl && !modalEl.classList.contains("hidden")) {
        closeCategoryModal();
      }
    });

    if (modalListEl) {
      modalListEl.addEventListener("click", function(e) {
        var item = e.target.closest(".category-modal-item");
        if (!item) return;
        var selectedCat = item.getAttribute("data-cat");
        if (selectedCat) {
          setCategoryFilter(selectedCat, true);
          closeCategoryModal();
        }
      });
    }

    if (categorySearchInput) {
      categorySearchInput.addEventListener("input", function(e) {
        filterModalCategoryItems(e.target.value);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function() {
        setCategoryFilter("Semua", true);
        closeCategoryModal();
      });
    }

    // Tombol "Lihat Semua Yoga"
    var viewAllYogaBtn = document.getElementById("view-all-yoga-btn");
    if (viewAllYogaBtn) {
      viewAllYogaBtn.addEventListener('click', function(e) {
        e.preventDefault();
        setCategoryFilter("Yoga", true);
      });
    }

    // ─── INITIAL RENDERING ───
    renderFeatured();
    renderUntukKamu();
    renderYogaSection();
    renderFilters();
    renderArticles();
    if (window.AOS) window.AOS.refresh();

  } catch (err) {
    console.error("Error merender blog:", err);
    gridEl.innerHTML = '<p style="color:#8A93A8;" class="text-sm col-span-full text-center">Belum bisa memuat artikel. Coba refresh halaman ya.</p>';
  }
})();
