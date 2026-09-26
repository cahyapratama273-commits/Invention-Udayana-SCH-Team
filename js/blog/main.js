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
            <span class="text-[11px] sm:text-xs font-bold uppercase tracking-widest mb-2 sm:mb-3 md:mb-4" style="color:#2DD4A8;">${featuredArticle.kategori}</span>
            <h3 class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 md:mb-4 leading-snug md:leading-tight" style="font-family:'Playfair Display',serif; color:#F5F5F5;">
              ${featuredArticle.judul}
            </h3>
            <p class="text-xs sm:text-sm md:text-base leading-relaxed mb-4 sm:mb-6 line-clamp-3 md:line-clamp-none" style="color:#8A93A8;">
              ${featuredArticle.ringkasan}
            </p>
            <span class="text-xs sm:text-sm font-medium mt-auto" style="color:#2DD4A8;">Baca selengkapnya &rarr;</span>
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
     * Merender tombol-tombol pilihan filter kategori berupa pill buttons
     */
    function renderFilters() {
      if (!filterEl) return;
      var html = categories.map(cat => {
        var isActive = cat === currentFilter;
        var activeClass = isActive 
          ? 'bg-[#2DD4A8] border-[#2DD4A8] text-[#0D1220] font-bold shadow-md' 
          : 'bg-transparent border-[rgba(255,255,255,0.08)] text-[#8A93A8] hover:border-[#2DD4A8] hover:text-[#2DD4A8]';
        
        return `<button class="category-tab px-4 py-2 rounded-full border transition whitespace-nowrap text-sm font-medium ${activeClass}" data-cat="${cat}">${cat}</button>`;
      }).join('');
      filterEl.innerHTML = html;
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
        <button class="page-nav-btn px-4 py-2 rounded-full border border-white/10 text-xs sm:text-sm font-semibold transition backdrop-blur-md ${prevDisabled}"
                style="background:rgba(21,27,46,0.7); color:#F5F5F5;"
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
              <button class="page-num-btn w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold text-xs sm:text-sm shadow-lg transition"
                      style="background:#2DD4A8; color:#0D1220; box-shadow:0 0 15px rgba(45,212,168,0.3);"
                      data-page="${p}">
                ${p}
              </button>
            `);
          } else {
            html.push(`
              <button class="page-num-btn w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/10 text-xs sm:text-sm font-medium transition hover:border-[#2DD4A8] hover:text-[#2DD4A8] backdrop-blur-md"
                      style="background:rgba(21,27,46,0.7); color:#8A93A8;"
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
        <button class="page-nav-btn px-4 py-2 rounded-full border border-white/10 text-xs sm:text-sm font-semibold transition backdrop-blur-md ${nextDisabled}"
                style="background:rgba(21,27,46,0.7); color:#F5F5F5;"
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

      // Buka panel filter jika kategori yang dipilih bukan "Semua"
      if (filterPanel && categoryName !== "Semua") {
        filterPanel.classList.remove('hidden');
        if (toggleBtn) {
          toggleBtn.classList.add('bg-white', 'text-black');
          toggleBtn.classList.remove('bg-white/10', 'text-[#8A93A8]');
        }
      }

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
        var scrollTarget = document.getElementById("section-semua-artikel") || document.getElementById("blog-artikel-grid");
        if (scrollTarget) {
          const yOffset = -90;
          const y = scrollTarget.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
    }

    // ─── EVENT LISTENERS ───
    // Event klik pada tab kategori
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

    // Toggle buka/tutup panel filter kategori
    var toggleBtn = document.getElementById("toggle-filter-btn");
    var filterPanel = document.getElementById("filter-panel");
    if (toggleBtn && filterPanel) {
      toggleBtn.addEventListener('click', function() {
        var isHidden = filterPanel.classList.toggle('hidden');
        toggleBtn.setAttribute('aria-expanded', String(!isHidden));
        if (isHidden) {
          toggleBtn.classList.remove('bg-white', 'text-black');
          toggleBtn.classList.add('bg-white/10', 'text-[#8A93A8]');
        } else {
          toggleBtn.classList.add('bg-white', 'text-black');
          toggleBtn.classList.remove('bg-white/10', 'text-[#8A93A8]');
        }
      });

      // Jika ada query param kategori saat halaman pertama kali dibuka, buka otomatis filternya
      if (currentFilter !== "Semua") {
        filterPanel.classList.remove('hidden');
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.classList.add('bg-white', 'text-black');
        toggleBtn.classList.remove('bg-white/10', 'text-[#8A93A8]');
      }
    }

    // Tombol "Lihat Semua Pose Yoga"
    var viewAllYogaBtn = document.getElementById("view-all-yoga-btn");
    if (viewAllYogaBtn) {
      viewAllYogaBtn.addEventListener('click', function() {
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
