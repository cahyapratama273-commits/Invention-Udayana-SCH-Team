/**
 * NavRender.js — Komponen Pemuat Navbar (Navbar Loader)
 * 
 * Script ini bertanggung jawab untuk mengambil (fetch) file HTML komponen navbar 
 * (`component/Nav.html`) dan menyuntikkannya ke dalam elemen khusus di setiap halaman 
 * yang memiliki id `navbar-slot`. 
 * 
 * Ini adalah cara "Component-Based" versi vanilla JS, sehingga jika ada perubahan
 * pada menu navbar, kita hanya perlu mengubah 1 file (Nav.html) saja.
 */
async function loadNavigasi(navPath = "/component/Nav.html", slotId = "navbar-slot") {
  // 1. Cari elemen penampung (container) di halaman aktif
  const slot = document.getElementById(slotId); 
  
  // Jika tidak ada elemen penampung, batalkan proses
  if (!slot) {
    console.warn(`loadNavigasi: elemen #${slotId} tidak ditemukan di halaman ini.`);
    return;
  }

  try {
    // 2. Fetch isi dari file komponen Nav.html
    const res = await fetch(navPath);
    if (!res.ok) throw new Error(`Gagal memuat komponen ${navPath} (HTTP Status: ${res.status})`);

    // 3. Masukkan kode HTML yang didapat ke dalam elemen penampung
    slot.innerHTML = await res.text();

    // 4. MENGAKALI KETERBATASAN BROWSER:
    // Secara default, browser TIDAK akan mengeksekusi tag <script> yang dimasukkan 
    // secara dinamis menggunakan .innerHTML (demi keamanan / XSS protection).
    // Oleh karena itu, kita harus mengekstrak tag <script> dari komponen Nav.html,
    // lalu membuat ulang tag <script> tersebut via document.createElement agar bisa jalan.
    slot.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script");
      
      const rawSrc = oldScript.getAttribute("src"); 
      if (rawSrc) {
        // Jika tag script memanggil file eksternal (memiliki atribut src)
        // Kita resolve URL-nya berdasarkan lokasi file komponen (navPath)
        newScript.src = new URL(rawSrc, window.location.origin + navPath.replace("../", "/")).href;
        newScript.async = false; // Memaksa script dimuat sesuai urutannya (synchronous order)
      } else {
        // Jika tag script berisi kode inline, langsung copy isi kodenya
        newScript.textContent = oldScript.textContent;
      }
      
      // Gantikan tag script mati (lama) dengan tag script hidup (baru)
      oldScript.replaceWith(newScript);
    });
  } catch (err) {
    // Tangani error jika file Nav.html gagal dimuat (misal: jaringan putus)
    console.error("Gagal memuat navigasi:", err);
    slot.innerHTML = `<p class="text-xs text-rose-500 text-center py-2">Navbar gagal dimuat.</p>`;
  }
}

// Di file-file halaman utama (misalnya Beranda.js), 
// loadNavigasi() dipanggil agar navbar tampil.