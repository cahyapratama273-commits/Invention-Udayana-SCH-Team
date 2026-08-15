// Logika untuk membaca kondisi mental yang tersimpan  di localStorage, render sapaan + artikel yang disesuaikan dengan hasil kondisi mental

const KONDISI_CONFIG = {
  baik: {
    label: "Untukmu yang lagi baik",
    title: "Rekomendasi buat jaga mood baikmu tetap nyala",
    warna: "#1E413F",
    judulDefault: "Seneng liat kamu lagi baik-baik aja 🌤️",
    pesanDefault: "Yuk jaga ritme baik ini biar terus nyala hari ini.",
  },
  cemas: {
    label: "Untukmu yang lagi cemas / lelah",
    title: "Bacaan buat bantu redain pikiranmu pelan-pelan",
    warna: "#4A4676",
    judulDefault: "Pelan-pelan aja, kita bantu redain 🌊",
    pesanDefault: "Pikiran boleh rame, tapi kita coba tenangin dulu.",
  },
  berat: {
    label: "Untukmu yang lagi berat",
    title: "Mulai dari sini dulu, satu langkah kecil",
    warna: "#8C3E2E",
    judulDefault: "Kamu nggak sendirian ngadepin ini 🤍",
    pesanDefault: "Kita jalanin pelan-pelan, satu langkah dalam satu waktu.",
  },
};

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavigasi(); // dari NavRender.js, harus dimuat sebelum Beranda.js
  renderSapaan();
  await renderArtikelRekomendasi();
});

function getKondisiUser() {
  const kondisi = localStorage.getItem("userMentalKondisi"); // baca hasil quiz
  return KONDISI_CONFIG[kondisi] ? kondisi : "baik"; // fallback kalau belum pernah isi quiz
}

function renderSapaan() {
  const kondisi = getKondisiUser();
  const cfg = KONDISI_CONFIG[kondisi];

  const savedTitle = localStorage.getItem("userMentalTitle");
  const savedMessage = localStorage.getItem("userMentalMessage");

  const judulEl = document.getElementById("element-judul-beranda");
  const pesanEl = document.getElementById("element-pesan-beranda");
  const cardEl = document.getElementById("sapaan-card");

  if (judulEl) judulEl.textContent = savedTitle || cfg.judulDefault;
  if (pesanEl) pesanEl.textContent = savedMessage || cfg.pesanDefault;
  if (cardEl) cardEl.style.background = cfg.warna;
}

async function renderArtikelRekomendasi() {
  const kondisi = getKondisiUser();
  const cfg = KONDISI_CONFIG[kondisi];

  const labelEl = document.getElementById("rekomendasi-label");
  const titleEl = document.getElementById("rekomendasi-title");
  const gridEl = document.getElementById("artikel-grid");
  if (labelEl) labelEl.textContent = cfg.label;
  if (titleEl) titleEl.textContent = cfg.title;
  if (!gridEl) return;

  try {
    const res = await fetch("../data/artikel.json"); // ambil semua artikel
    const semuaArtikel = await res.json();
    const artikelRelevan = semuaArtikel.filter((a) => a.kondisi === kondisi); // saring sesuai kondisi

    gridEl.innerHTML = artikelRelevan.map(renderKartuArtikel).join(""); // render jadi HTML
  } catch (err) {
    console.error("Gagal memuat artikel:", err);
    gridEl.innerHTML = `<p class="text-sm text-[#5B6E68] col-span-full">Belum bisa memuat rekomendasi artikel. Coba refresh halaman ya.</p>`;
  }
}

function renderKartuArtikel(artikel) {
  return `
    <a href="../Blog/detail.html?id=${artikel.id}" class="tile rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 transition group">
      <div class="h-40 overflow-hidden bg-[#E4EAE5]">
        <img src="${artikel.gambar}" alt="${artikel.judul}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
             onerror="this.onerror=null; this.src='../assets/images/placeholder.svg';" />
      </div>
      <div class="p-5 flex flex-col gap-2 flex-1">
        <span class="text-[11px] font-bold uppercase tracking-wide text-[#7FA593]">${artikel.kategori}</span>
        <h3 class="font-display font-medium text-lg leading-snug">${artikel.judul}</h3>
        <p class="text-sm text-[#5B6E68] flex-1">${artikel.ringkasan}</p>
        <span class="text-xs text-[#5B6E68] mt-2">${artikel.waktu_baca}</span>
      </div>
    </a>
  `;
}
