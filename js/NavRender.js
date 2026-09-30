/**
 * NavRender.js — Komponen Pemuat Navbar (Navbar Loader)
 * 
 * Script ini bertanggung jawab untuk mengambil (fetch) file HTML komponen navbar 
 * (`component/Nav.html`) dan menyuntikkannya ke dalam elemen khusus di setiap halaman 
 * yang memiliki id `navbar-slot`.
 * 
 * Menggunakan in-memory caching agar pemanggilan berulang atau navigasi cepat tidak melakukan request ganda.
 */
let __cachedNavHtml = null;

async function loadNavigasi(navPath = "/component/Nav.html", slotId = "navbar-slot") {
  // 1. Cari elemen penampung (container) di halaman aktif
  const slot = document.getElementById(slotId); 
  
  // Jika tidak ada elemen penampung atau sudah terisi konten, tidak perlu duplikasi
  if (!slot || slot.children.length > 0) {
    return;
  }

  try {
    // 2. Fetch isi dari file komponen Nav.html (dengan memory cache)
    if (!__cachedNavHtml) {
      const res = await fetch(navPath);
      if (!res.ok) throw new Error(`Gagal memuat komponen ${navPath} (HTTP Status: ${res.status})`);
      __cachedNavHtml = await res.text();
    }

    // 3. Masukkan kode HTML yang didapat ke dalam elemen penampung
    slot.innerHTML = __cachedNavHtml;

    // 4. Jalankan script inline di dalam komponen Nav.html jika ada
    slot.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script");
      const rawSrc = oldScript.getAttribute("src"); 
      if (rawSrc) {
        newScript.src = new URL(rawSrc, window.location.origin + navPath.replace("../", "/")).href;
        newScript.async = false;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.replaceWith(newScript);
    });

    // 5. Picu highlight navigasi aktif jika fungsi tersedia
    if (typeof window.__highlightActiveNav === 'function') {
      window.__highlightActiveNav();
    }
  } catch (err) {
    console.error("Gagal memuat navigasi:", err);
    slot.innerHTML = `<p class="text-xs text-rose-500 text-center py-2">Navbar gagal dimuat.</p>`;
  }
}

// Fallback otomatis jika dipanggil saat DOM siap
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", () => {
      loadNavigasi();
    });
  } else {
    loadNavigasi();
  }
}