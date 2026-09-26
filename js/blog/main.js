/**
 * main.js (Blog) — Entry point halaman Blog
 *
 * Menggunakan fetch() karena jQuery CDN dimuat setelah </main>,
 * sedangkan script ini dieksekusi di dalam <main>.
 */
(async function initBlog() {
  // 1. Muat komponen Navigasi
  if (typeof loadNavigasi === "function") {
    await loadNavigasi();
  }

  // 2. Element containers
  var gridEl = document.getElementById("blog-artikel-grid");
  var featuredEl = document.getElementById("featured-artikel-slot");
  var filterEl = document.getElementById("blog-category-filter");
  var searchInput = document.getElementById("blog-search-input");
  
  if (!gridEl) return;

  try {
    // Coba fetch dengan berbagai path fallback
    var semuaArtikel = [];
    var paths = ["/data/artikel.json", "../../data/artikel.json", "../data/artikel.json", "data/artikel.json"];
    for (var p of paths) {
      try {
        var r = await fetch(p);
        if (r.ok) {
          semuaArtikel = await r.json();
          break;
        }
      } catch (e) {}
    }
    if (semuaArtikel.length === 0) throw new Error("Gagal memuat artikel dari data source");

    // -- Elements
    var untukKamuSection = document.getElementById("section-untuk-kamu");
    var untukKamuGrid = document.getElementById("untuk-kamu-grid");
    var untukKamuFallback = document.getElementById("untuk-kamu-fallback");
    var paginationEl = document.getElementById("blog-pagination");

    // -- Sort all articles by id ascending
    semuaArtikel.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

    // -- State
    var currentFilter = "Semua";
    var searchQuery = "";
    var currentPage = 1;
    var ITEMS_PER_PAGE = 6;
    
    // -- Extract unique categories dynamically from artikel.json
    var categories = [...new Set(semuaArtikel.map(a => a.kategori))].filter(Boolean).sort();
    categories.unshift("Semua");

    // -- Read initial category filter from URL query param if present (?kategori=Yoga)
    var urlParams = new URLSearchParams(window.location.search);
    var paramCat = urlParams.get("kategori");
    if (paramCat) {
      var matchedCat = categories.find(c => c.toLowerCase() === paramCat.trim().toLowerCase());
      if (matchedCat) {
        currentFilter = matchedCat;
      }
    }

    // -- Helper: Get user mood from localStorage
    function getFeaturedArtikel() {
      var savedMood = localStorage.getItem("userMentalKondisi");
      var candidates = [];

      // Validasi mood
      if (savedMood === "baik" || savedMood === "cemas" || savedMood === "berat") {
        candidates = semuaArtikel.filter(a => a.kondisi === savedMood);
      }

      // Fallback: Jika tidak ada mood tersimpan / corrupt data / atau tidak ada artikel yg cocok
      if (candidates.length === 0) {
        // Coba cari artikel dengan flag featured: true
        candidates = semuaArtikel.filter(a => a.featured);
        
        // Fallback terakhir: seluruh artikel
        if (candidates.length === 0) {
          candidates = semuaArtikel;
        }
      }

      // Pilih secara random dari kandidat (untuk variasi tiap kali reload)
      var randomIndex = Math.floor(Math.random() * candidates.length);
      return candidates[randomIndex] || semuaArtikel[0];
    }

    // -- Helper: Slug generator
    function createSlug(text) {
      return text ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
    }

    // -- Render Featured Card
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

    // -- Render "Untuk Kamu" Section (Personalized by userMentalKondisi in localStorage)
    function renderUntukKamu() {
      if (!untukKamuGrid) return;

      // Read user's last kondisi result from localStorage (same key used in Beranda.js)
      var savedMood = localStorage.getItem("userMentalKondisi");
      var validMoods = ["baik", "cemas", "berat"];

      // If no quiz result exists in localStorage yet, show fallback message inviting user to take Cek-Emosi quiz
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

      // Filter data/artikel.json by matching kondisi
      var matchingArticles = semuaArtikel.filter(a => a.kondisi === savedMood);

      if (matchingArticles.length === 0) {
        if (untukKamuSection) untukKamuSection.classList.add("hidden");
        return;
      }

      // Pick up to 4 articles (prioritize featured: true if more than 4 match, otherwise first 4 in array order)
      var sortedMatching = [...matchingArticles].sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0; // preserve array order
      });

      var selectedArticles = sortedMatching.slice(0, 4);

      // Render compact article cards into the 2x2 grid
      if (typeof renderArtikelCardCompact === "function") {
        untukKamuGrid.innerHTML = selectedArticles.map(renderArtikelCardCompact).join("");
      } else if (typeof renderArtikelCard === "function") {
        untukKamuGrid.innerHTML = selectedArticles.map(a => renderArtikelCard(a, { compact: true })).join("");
      }

      if (untukKamuFallback) untukKamuFallback.classList.add("hidden");
      untukKamuGrid.classList.remove("hidden");
      if (untukKamuSection) untukKamuSection.classList.remove("hidden");
    }

    // -- Render "Yoga untuk Pikiranmu" Section (Fixed curated preview of 4 Yoga articles)
    function renderYogaSection() {
      var yogaGrid = document.getElementById("yoga-artikel-grid");
      if (!yogaGrid) return;

      var yogaArticles = semuaArtikel.filter(a => a.kategori === "Yoga");
      if (yogaArticles.length === 0) {
        var yogaSec = document.getElementById("section-yoga");
        if (yogaSec) yogaSec.classList.add("hidden");
        return;
      }

      // Sort by featured first, then original order
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

    // -- Render Filter Tabs (in a panel as pills)
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

    // -- Helper: Scalable Pagination Range with Ellipsis
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

    // -- Render Pagination Controls
    function renderPagination(totalItems) {
      if (!paginationEl) return;
      var totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

      if (totalPages <= 1) {
        paginationEl.innerHTML = "";
        return;
      }

      var html = [];

      // Prev Button
      var prevDisabled = currentPage === 1 ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:border-[#2DD4A8] hover:text-[#2DD4A8]';
      html.push(`
        <button class="page-nav-btn px-4 py-2 rounded-full border border-white/10 text-xs sm:text-sm font-semibold transition backdrop-blur-md ${prevDisabled}"
                style="background:rgba(21,27,46,0.7); color:#F5F5F5;"
                data-page="${currentPage - 1}">
          &larr; sebelumnya
        </button>
      `);

      // Page Numbers with Ellipsis Support
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

      // Next Button
      var nextDisabled = currentPage === totalPages ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:border-[#2DD4A8] hover:text-[#2DD4A8]';
      html.push(`
        <button class="page-nav-btn px-4 py-2 rounded-full border border-white/10 text-xs sm:text-sm font-semibold transition backdrop-blur-md ${nextDisabled}"
                style="background:rgba(21,27,46,0.7); color:#F5F5F5;"
                data-page="${currentPage + 1}">
          Selanjutnya &rarr;
        </button>
      `);

      paginationEl.innerHTML = html.join("");

      // Bind events to pagination buttons
      paginationEl.querySelectorAll("button[data-page]").forEach(btn => {
        btn.addEventListener("click", function () {
          var targetPage = parseInt(this.getAttribute("data-page"), 10);
          if (targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
            currentPage = targetPage;
            renderArticles();
            // Scroll ke atas grid Semua Artikel dengan mulus
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

    // -- Render Grid Articles based on Filter, Search, and Pagination (6 per page)
    function renderArticles() {
      if (!gridEl) return;
      
      // Filter by category
      var filtered = currentFilter === "Semua" 
        ? semuaArtikel 
        : semuaArtikel.filter(a => a.kategori === currentFilter);
        
      // Filter by search query (title, summary, or category name)
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

      // Slice 6 items for the current page
      var startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      var pageItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        
      if (typeof renderArtikelCard === "function") {
        if (pageItems.length > 0) {
          gridEl.innerHTML = pageItems.map(renderArtikelCard).join("");
        } else {
          gridEl.innerHTML = '<div class="col-span-full py-16 text-center"><p style="color:#8A93A8;" class="text-base">Tidak ada artikel yang cocok dengan pencarian / filter.</p></div>';
        }
      } else {
        console.error("Fungsi renderArtikelCard tidak ditemukan.");
      }

      // Render pagination
      renderPagination(totalCount);
      if (window.AOS) window.AOS.refresh();
    }

    // -- Programmatic Category Filter Setter
    function setCategoryFilter(categoryName, shouldScroll) {
      currentFilter = categoryName;
      currentPage = 1;
      searchQuery = "";
      if (searchInput) searchInput.value = "";

      // Open filter panel if filtering by a specific category
      if (filterPanel && categoryName !== "Semua") {
        filterPanel.classList.remove('hidden');
        if (toggleBtn) {
          toggleBtn.classList.add('bg-white', 'text-black');
          toggleBtn.classList.remove('bg-white/10', 'text-[#8A93A8]');
        }
      }

      // Update URL search params
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

    // -- Events bindings
    if (filterEl) {
      filterEl.addEventListener('click', function(e) {
        var tab = e.target.closest('.category-tab');
        if (!tab) return;
        
        var selectedCat = tab.getAttribute('data-cat');
        setCategoryFilter(selectedCat, false);
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', function(e) {
        searchQuery = e.target.value;
        currentPage = 1; // Reset ke page 1
        renderArticles();
      });
    }

    // Toggle panel
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

      // If query param set a filter on load, open the filter panel
      if (currentFilter !== "Semua") {
        filterPanel.classList.remove('hidden');
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.classList.add('bg-white', 'text-black');
        toggleBtn.classList.remove('bg-white/10', 'text-[#8A93A8]');
      }
    }

    // View all Yoga button handler
    var viewAllYogaBtn = document.getElementById("view-all-yoga-btn");
    if (viewAllYogaBtn) {
      viewAllYogaBtn.addEventListener('click', function() {
        setCategoryFilter("Yoga", true);
      });
    }

    // -- Initial render
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
