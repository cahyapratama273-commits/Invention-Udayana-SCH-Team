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

    // -- State
    var currentFilter = "Semua";
    var searchQuery = "";
    var currentPage = 1;
    var ITEMS_PER_PAGE = 8;
    var paginationEl = document.getElementById("blog-pagination");
    
    // -- Extract unique categories and sort
    var categories = [...new Set(semuaArtikel.map(a => a.kategori))].sort();
    categories.unshift("Semua");

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
            // Scroll ke atas grid dengan mulus
            var scrollTarget = document.getElementById("blog-artikel-grid");
            if (scrollTarget) {
              const yOffset = -120;
              const y = scrollTarget.getBoundingClientRect().top + window.pageYOffset + yOffset;
              window.scrollTo({ top: y, behavior: 'smooth' });
            }
          }
        });
      });
    }

    // -- Render Grid Articles based on Filter, Search, and Pagination (8 per page)
    function renderArticles() {
      if (!gridEl) return;
      
      // Filter by category
      var filtered = currentFilter === "Semua" 
        ? semuaArtikel 
        : semuaArtikel.filter(a => a.kategori === currentFilter);
        
      // Filter by search query (title & summary)
      if (searchQuery.trim() !== "") {
        var q = searchQuery.toLowerCase();
        filtered = filtered.filter(a => 
          a.judul.toLowerCase().includes(q) || 
          a.ringkasan.toLowerCase().includes(q)
        );
      }

      var totalCount = filtered.length;
      var totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
      if (currentPage > totalPages) currentPage = 1;

      // Slice 8 items for the current page
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
    }

    // -- Events bindings
    if (filterEl) {
      filterEl.addEventListener('click', function(e) {
        var tab = e.target.closest('.category-tab');
        if (!tab) return;
        
        currentFilter = tab.getAttribute('data-cat');
        currentPage = 1; // Reset ke page 1
        renderFilters();
        renderArticles();
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
        filterPanel.classList.toggle('hidden');
        if (filterPanel.classList.contains('hidden')) {
          toggleBtn.classList.remove('bg-white', 'text-black');
          toggleBtn.classList.add('bg-[#151B2E]', 'text-[#8A93A8]');
        } else {
          toggleBtn.classList.add('bg-white', 'text-black');
          toggleBtn.classList.remove('bg-[#151B2E]', 'text-[#8A93A8]');
        }
      });
    }

    // -- Initial render
    renderFeatured();
    renderFilters();
    renderArticles();

  } catch (err) {
    console.error("Error merender blog:", err);
    gridEl.innerHTML = '<p style="color:#8A93A8;" class="text-sm col-span-full text-center">Belum bisa memuat artikel. Coba refresh halaman ya.</p>';
  }
})();
