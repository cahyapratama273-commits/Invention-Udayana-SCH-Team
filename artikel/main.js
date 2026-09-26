/**
 * artikel/main.js — Menangani Halaman Detail Artikel
 */
let dataArtikel = [];

function createSlug(text) {
  return text ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
}

async function loadArtikel() {
  if (typeof loadNavigasi === 'function') {
    try { await loadNavigasi(); } catch(e) {}
  }
  const container = document.querySelector('#detail-container');
  if (!container) return;

  // Coba beberapa kemungkinan path untuk fetching artikel.json
  const paths = [
    '/data/artikel.json',
    '../data/artikel.json',
    '../../data/artikel.json',
    'data/artikel.json'
  ];

  let loaded = false;
  for (const p of paths) {
    try {
      const res = await fetch(p);
      if (res.ok) {
        dataArtikel = await res.json();
        loaded = true;
        break;
      }
    } catch (e) {
      // Coba path berikutnya
    }
  }

  if (loaded && dataArtikel.length > 0) {
    init();
  } else {
    container.innerHTML = `
      <div class="text-center py-16">
        <div class="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl bg-white/5 border border-white/10 text-[#2DD4A8]">⚠️</div>
        <h2 class="text-xl font-bold text-white mb-2" style="font-family:'Playfair Display',serif;">Gagal Memuat Data Artikel</h2>
        <p class="text-sm text-[#8A93A8] mb-6 max-w-md mx-auto">Kami tidak dapat mengambil konten artikel saat ini. Silakan periksa koneksi atau coba kembali.</p>
        <a href="/blog.html" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-[#2DD4A8] text-[#0D1220] hover:bg-[#25b892] transition-colors">
          &larr; Kembali ke Blog
        </a>
      </div>
    `;
  }
}

function init() {
  const container = document.querySelector('#detail-container');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const artikelId = params.get('id');
  const slug = params.get('slug');

  let artikel = null;

  if (artikelId) {
    artikel = dataArtikel.find(item => String(item.id) === String(artikelId));
  } else if (slug) {
    artikel = dataArtikel.find(item => createSlug(item.judul) === slug);
  }

  if (artikel) {
    renderDetailArtikel(artikel);
  } else {
    container.innerHTML = `
      <div class="text-center py-16">
        <div class="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl bg-white/5 border border-white/10 text-[#8A93A8]">🔍</div>
        <h2 class="text-2xl font-bold text-white mb-2" style="font-family:'Playfair Display',serif;">Artikel Tidak Ditemukan</h2>
        <p class="text-sm text-[#8A93A8] mb-6">Artikel yang kamu cari tidak tersedia atau mungkin sudah dipindahkan.</p>
        <a href="/blog.html" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-[#2DD4A8] text-[#0D1220] hover:bg-[#25b892] transition-colors">
          &larr; Kembali ke Daftar Artikel
        </a>
      </div>
    `;
  }
}

function renderDetailArtikel(artikel) {
  const container = document.querySelector('#detail-container');
  if (!container) return;

  // 1. Update Page Title
  document.title = `${artikel.judul} — BerTeduh`;

  // 2. Ganti Background Gambar Utama secara dinamis sesuai gambar artikel
  const bgImg = document.getElementById('detail-bg-img');
  if (bgImg && artikel.gambar) {
    bgImg.src = artikel.gambar;
  }

  // 3. Render paragraphs
  const kontenHtml = Array.isArray(artikel.konten)
    ? artikel.konten.map(p => `<p class="text-[#E2E8F0] text-base sm:text-lg lg:text-xl leading-relaxed sm:leading-loose mb-6 font-normal">${p}</p>`).join('')
    : `<p class="text-[#E2E8F0] text-base sm:text-lg lg:text-xl leading-relaxed sm:leading-loose mb-6">${artikel.konten || artikel.ringkasan}</p>`;

  // 4. Render Sumber / Referensi jika tersedia
  let referensiHtml = '';
  if (Array.isArray(artikel.sumber) && artikel.sumber.length > 0) {
    const listItems = artikel.sumber.map(s => {
      const nama = s.nama || s.url || 'Referensi';
      const url = s.url || '#';
      return `
        <li class="flex items-start gap-2.5 text-xs sm:text-sm text-[#8A93A8]">
          <span class="text-[#2DD4A8] select-none leading-relaxed">•</span>
          <a href="${url}" target="_blank" rel="noopener" 
             class="text-[#8A93A8] hover:text-[#2DD4A8] transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-[#2DD4A8] inline-flex items-center gap-1.5 leading-relaxed group">
            <span>${nama}</span>
            <svg class="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </li>
      `;
    }).join('');

    referensiHtml = `
      <!-- Referensi Section -->
      <section class="mt-12 pt-8 border-t border-white/10" aria-label="Referensi Artikel">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-[#8A93A8] mb-3">Referensi</h2>
        <ul class="space-y-2.5 list-none p-0 m-0">
          ${listItems}
        </ul>
      </section>
    `;
  }

  // 5. Data langsung menempel di depan background (tanpa kartu penutup tebal)
  container.innerHTML = `
    <!-- Breadcrumb Navigation -->
    <nav aria-label="Breadcrumb" class="mb-4">
      <ol class="flex items-center flex-wrap gap-2 text-xs sm:text-sm text-[#8A93A8]">
        <li>
          <a href="/beranda.html" class="hover:text-[#2DD4A8] transition-colors">Beranda</a>
        </li>
        <li class="select-none text-white/30">/</li>
        <li>
          <a href="/blog.html" class="hover:text-[#2DD4A8] transition-colors">Blog</a>
        </li>
        <li class="select-none text-white/30">/</li>
        <li class="text-[#F5F5F5] font-medium truncate max-w-[200px] sm:max-w-xs md:max-w-md" aria-current="page">
          ${artikel.judul}
        </li>
      </ol>
    </nav>

    <!-- Top Navigation Actions -->
    <div class="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-white/15">
      <a href="/blog.html" class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#2DD4A8] hover:text-[#25b892] transition-colors group">
        <span class="group-hover:-translate-x-1 transition-transform">&larr;</span> Kembali ke Semua Artikel
      </a>
      <div class="flex items-center gap-3">
        <span class="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#2DD4A8]/20 text-[#2DD4A8] border border-[#2DD4A8]/40 backdrop-blur-md">
          ${artikel.kategori}
        </span>
        <span class="text-xs text-[#CBD5E1] hidden sm:inline">🕒 ${artikel.waktu_baca}</span>
      </div>
    </div>

    <!-- Article Header -->
    <div class="mb-10">
      <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-md" style="font-family:'Playfair Display',serif;">
        ${artikel.judul}
      </h1>
      <p class="text-xs sm:text-sm text-[#CBD5E1] flex items-center gap-3">
        <span>🕒 ${artikel.waktu_baca}</span>
        <span>•</span>
        <span>Ditinjau secara Medis & Psikologi oleh Tim BerTeduh</span>
      </p>
    </div>

    <!-- Quote / Ringkasan Highlight -->
    <blockquote class="p-6 sm:p-8 rounded-2xl mb-12 border-l-4 border-[#2DD4A8] bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl m-0">
      <p class="text-lg sm:text-xl text-[#F8FAFC] italic font-serif leading-relaxed">
        "${artikel.ringkasan}"
      </p>
    </blockquote>

    <!-- Main Content Paragraphs -->
    <div class="article-body max-w-none text-[#E2E8F0] space-y-6">
      ${kontenHtml}
    </div>

    ${referensiHtml}

    <!-- Author & Footer Call to Action -->
    <div class="${referensiHtml ? 'mt-10' : 'mt-16'} pt-8 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-3.5 w-full sm:w-auto">
        <div class="w-12 h-12 rounded-2xl bg-[#2DD4A8]/20 border border-[#2DD4A8]/40 text-[#2DD4A8] flex items-center justify-center font-bold text-xl shrink-0 shadow-md" aria-hidden="true">
          🌿
        </div>
        <div>
          <p class="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold">Ditinjau oleh</p>
          <p class="text-sm font-bold text-white">By Team BerTeduh</p>
        </div>
      </div>
      <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
        <a href="/blog.html" class="teduh-btn-primary w-full sm:w-auto">
          Jelajahi Artikel Lainnya &#8599;
        </a>
      </div>
    </div>

    <!-- Section: Butuh teman untuk memprosesnya? -->
    <section class="mt-12 pt-8 border-t border-white/15" aria-labelledby="cta-support-title">
      <h2 id="cta-support-title" class="font-semibold text-xl mb-1.5 text-white" style="font-family:'Playfair Display',serif;">Butuh teman untuk memprosesnya?</h2>
      <p class="text-sm text-[#8A93A8] mb-5 max-w-[46ch]">
        Kamu bisa lanjut ngobrol soal artikel ini, atau bicara langsung dengan orang yang lebih paham.
      </p>

      <div class="grid gap-3">
        <!-- Kartu: Tanya AI -->
        <div class="flex gap-4 items-start bg-white/10 backdrop-blur-md text-white rounded-t-2xl rounded-br-2xl rounded-bl-sm p-5 border border-white/20 shadow-lg">
          <div class="shrink-0 w-[38px] h-[38px] rounded-full bg-white/10 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 5h16v11H8l-4 4V5Z" stroke="#2DD4A8" stroke-width="1.6" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-[15.5px] mb-1">Tanya AI soal artikel ini</h3>
            <p class="text-[13.5px] leading-relaxed text-white/70 mb-3.5">
              Obrolan singkat untuk menerjemahkan artikel ini ke situasi kamu sendiri.
            </p>
            <button onclick="onTanyaAI()"
                    class="font-medium text-[13.5px] bg-[#2DD4A8] text-[#0D1220] rounded-full px-4 py-2.5 hover:bg-[#25b892] transition">
              Mulai obrolan
            </button>
          </div>
        </div>

        <!-- Kartu: Cari Psikolog -->
        <div class="flex gap-4 items-start bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-lg">
          <div class="shrink-0 w-[38px] h-[38px] rounded-[10px] flex items-center justify-center bg-[#38BDF8]/15">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.4" stroke="#38BDF8" stroke-width="1.6"/>
              <path d="M5 20c1.4-4 4-6 7-6s5.6 2 7 6" stroke="#38BDF8" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-[15.5px] mb-1 text-white">Cari psikolog untuk konsultasi langsung</h3>
            <p class="text-[13.5px] leading-relaxed text-[#8A93A8] mb-3.5">
              Terhubung dengan konsultan berlisensi yang bisa mendampingi lebih jauh.
            </p>
            <button onclick="onCariPsikolog()"
                    class="font-medium text-[13.5px] bg-transparent border border-[#38BDF8] text-[#38BDF8] rounded-full px-4 py-2 hover:bg-[#38BDF8]/10 transition">
              Cari konsultan
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
  if (window.AOS) window.AOS.refresh();
}

// Global Actions
window.onTanyaAI = function() {
  window.location.href = '/konsultasi.html#section-ai';
};

window.onCariPsikolog = function() {
  window.location.href = '/konsultasi.html';
};

// Jalankan ketika DOM siap
document.addEventListener('DOMContentLoaded', () => {
  loadArtikel();
});