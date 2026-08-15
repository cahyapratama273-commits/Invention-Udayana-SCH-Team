// NavRender.js — fetch component/Nav.html, suntik ke slot navbar
async function loadNavigasi(navPath = "../component/Nav.html", slotId = "navbar-slot") {
  const slot = document.getElementById(slotId); // cari elemen tujuan
  if (!slot) {
    console.warn(`loadNavigasi: elemen #${slotId} tidak ditemukan.`);
    return;
  }

  try {
    const res = await fetch(navPath); // ambil file Nav.html
    if (!res.ok) throw new Error(`Gagal fetch ${navPath} (status ${res.status})`);

    slot.innerHTML = await res.text(); // suntik HTML-nya

    slot.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script"); // <script> dari innerHTML nggak auto-jalan
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.replaceWith(newScript); // paksa browser eksekusi ulang
    });
  } catch (err) {
    console.error("Gagal memuat navigasi:", err);
    slot.innerHTML = `<p class="text-xs text-rose-500 text-center py-2">Navbar gagal dimuat.</p>`;
  }
}
