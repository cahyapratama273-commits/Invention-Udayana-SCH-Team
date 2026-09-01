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
    var res = await fetch("../../data/artikel.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    var semuaArtikel = await res.json();

    // -- State
    var currentFilter = "Semua";
    var searchQuery = "";
    
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

    // -- Render Featured Card
    function renderFeatured() {
      if (!featuredEl) return;
      var featuredArticle = getFeaturedArtikel();
      if (!featuredArticle) return;

      var html = `
        <a href="/blog/?id=${featuredArticle.id}" class="group block rounded-2xl overflow-hidden transition-transform hover:-translate-y-1" style="background:#151B2E; text-decoration:none;">
          <div class="flex flex-col md:flex-row h-full">
            <div class="w-full md:w-1/2 overflow-hidden" style="background:#1A2138; aspect-ratio:4/3;">
              <!-- Placeholder background #1A2138 -->
              <div class="w-full h-full relative">
                <!-- Image dari dataArtikel -->
                <img src="${featuredArticle.gambar}" alt="${featuredArticle.judul}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.style.display='none';">
              </div>
            </div>
            <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
              <span class="text-xs font-bold uppercase tracking-widest mb-4" style="color:#2DD4A8;">${featuredArticle.kategori}</span>
              <h3 class="text-3xl lg:text-4xl font-bold mb-4 leading-tight" style="font-family:'Playfair Display',serif; color:#F5F5F5;">
                ${featuredArticle.judul}
              </h3>
              <p class="text-base leading-relaxed mb-6" style="color:#8A93A8;">
                ${featuredArticle.ringkasan}
              </p>
              <span class="text-sm font-medium" style="color:#2DD4A8;">Baca selengkapnya &rarr;</span>
            </div>
          </div>
        </a>
      `;
      featuredEl.innerHTML = html;
    }

    // -- Render Filter Tabs (now in a panel as pills)
    function renderFilters() {
      if (!filterEl) return;
      var html = categories.map(cat => {
        var isActive = cat === currentFilter;
        // Pill style for grid layout
        var activeClass = isActive 
          ? 'bg-[#2DD4A8] border-[#2DD4A8] text-[#0D1220]' 
          : 'bg-transparent border-[rgba(255,255,255,0.08)] text-[#8A93A8] hover:border-[#2DD4A8] hover:text-[#2DD4A8]';
        
        return `<button class="category-tab px-4 py-2 rounded-full border transition whitespace-nowrap text-sm font-medium ${activeClass}" data-cat="${cat}">${cat}</button>`;
      }).join('');
      filterEl.innerHTML = html;
    }

    // -- Render Grid Articles based on Filter & Search
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
        
      if (typeof renderArtikelCard === "function") {
        if (filtered.length > 0) {
          gridEl.innerHTML = filtered.map(renderArtikelCard).join("");
        } else {
          gridEl.innerHTML = '<div class="col-span-full py-16 text-center"><p style="color:#8A93A8;" class="text-base">Tidak ada artikel yang cocok dengan pencarian / filter.</p></div>';
        }
      } else {
        console.error("Fungsi renderArtikelCard tidak ditemukan.");
      }
    }

    // -- Events bindings
    if (filterEl) {
      filterEl.addEventListener('click', function(e) {
        var tab = e.target.closest('.category-tab');
        if (!tab) return;
        
        currentFilter = tab.getAttribute('data-cat');
        renderFilters();
        renderArticles();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', function(e) {
        searchQuery = e.target.value;
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
