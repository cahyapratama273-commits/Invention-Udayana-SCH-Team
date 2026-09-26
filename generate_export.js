const fs = require('fs');
const path = require('path');

const exportDir = path.join(__dirname, 'plagiarism-check-export');
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

// ---------------------------------------------------------
// 1. ALL ARTIKEL & STEP YOGA CONTENT EXPORT
// ---------------------------------------------------------
const artikelData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/artikel.json'), 'utf8'));
const yogaData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/step-yoga.json'), 'utf8'));

let artikelContentText = '';

// Process artikel.json
for (const art of artikelData) {
  artikelContentText += `=== ARTIKEL: ${art.id} - ${art.judul} ===\n`;
  if (art.kategori) {
    artikelContentText += `Kategori: ${art.kategori}\n`;
  }
  if (art.waktu_baca) {
    artikelContentText += `Waktu Baca: ${art.waktu_baca}\n`;
  }
  if (art.ringkasan) {
    artikelContentText += `Ringkasan: ${art.ringkasan}\n\n`;
  }
  artikelContentText += `Konten:\n`;
  if (Array.isArray(art.konten)) {
    artikelContentText += art.konten.join('\n\n') + '\n\n';
  } else if (typeof art.konten === 'string') {
    artikelContentText += art.konten + '\n\n';
  }
  if (Array.isArray(art.sumber) && art.sumber.length > 0) {
    artikelContentText += `Sumber Rujukan:\n`;
    for (const s of art.sumber) {
      artikelContentText += `- ${s.nama || 'Sumber'} (${s.url || '-'})\n`;
    }
    artikelContentText += '\n';
  }
}

// Process step-yoga.json
for (const step of yogaData) {
  artikelContentText += `=== LANGKAH YOGA: ${step.id} - ${step.judul} ===\n`;
  if (step.tingkat) {
    artikelContentText += `Tingkat: ${step.tingkat}\n`;
  }
  if (step.durasi) {
    artikelContentText += `Durasi: ${step.durasi}\n`;
  }
  if (step.deskripsi) {
    artikelContentText += `Deskripsi:\n${step.deskripsi}\n\n`;
  }
  if (step.manfaat) {
    artikelContentText += `Manfaat:\n${step.manfaat}\n\n`;
  }
  if (step.tips) {
    artikelContentText += `Tips:\n${step.tips}\n\n`;
  }
}

fs.writeFileSync(path.join(exportDir, 'all-artikel-content.txt'), artikelContentText.trim() + '\n', 'utf8');
console.log('Created all-artikel-content.txt');

// ---------------------------------------------------------
// 2. ALL SUMBER LIST EXPORT
// ---------------------------------------------------------
let sumberListText = '';

for (const art of artikelData) {
  sumberListText += `=== ARTIKEL: ${art.id} - ${art.judul} ===\n`;
  if (Array.isArray(art.sumber) && art.sumber.length > 0) {
    for (const s of art.sumber) {
      const nama = s.nama || 'Sumber';
      const url = s.url || '-';
      sumberListText += `- ${nama} (${url})\n`;
    }
  } else {
    sumberListText += `- Tidak ada rujukan spesifik\n`;
  }
  sumberListText += '\n';
}

fs.writeFileSync(path.join(exportDir, 'all-sumber-list.txt'), sumberListText.trim() + '\n', 'utf8');
console.log('Created all-sumber-list.txt');

// ---------------------------------------------------------
// 3. PAGE STRUCTURE SNAPSHOT EXPORT
// ---------------------------------------------------------
const pageStructureText = `=== BERANDA ===

1. Hero Section
   - Eyebrow: "RUANG AMAN UNTUKMU"
   - Tagline & Judul: "Dunia Terlalu Terik. Mari Berteduh Sejenak."
   - Subjudul: "Ruang aman untuk mengurai isi kepala, membaca kembali emosi, dan beristirahat sejenak dari segala tuntutan."
   - Kartu Sapaan Dinamis: Pesan hangat personal untuk pengguna (Full, Partial, Abandoned paths)
   - Tombol Tindakan (CTA): "MULAI BERTEDUH" (Menuju Kuis Cek Emosi) & "Konsultasi"

2. Statistik BerTeduh
   - Eyebrow: "STATISTIK BERTEDUH"
   - Indikator Angka: 40+ Artikel Kesehatan Mental & 100% Akses Gratis Tanpa Wajib Akun
   - Ringkasan Komitmen Kesejahteraan Emosional

3. Layanan Kami (Jelajahi Fitur Teduh)
   - Eyebrow: "LAYANAN KAMI"
   - Kartu 1: Cek Emosi (Kuis kuesioner singkat interaktif)
   - Kartu 2: Ruang Baca (Artikel edukatif & panduan psikologi)
   - Kartu 3: Relaksasi (Modul pernapasan ritmis & panduan yoga)
   - Kartu 4: Konsultasi (Diskusi pendampingan & AI pendengar)

4. Mengapa Memilih Kami (4 Kartu Nilai & Pilar Utama)
   - Eyebrow: "KEUNGGULAN KAMI"
   - Pilar 1: Pendekatan Humanis & Empatis
   - Pilar 2: Konten Berbasis Sains & Terverifikasi
   - Pilar 3: Aksesibilitas Tanpa Hambatan
   - Pilar 4: Privasi & Keamanan Utama

5. Kenapa Harus BerTeduh (4 Kartu Keunggulan Praktis)
   - Eyebrow: "KENAPA BERTEDUH"
   - Keunggulan 1: Privasi Terjaga (Tanpa pendaftaran rumit)
   - Keunggulan 2: Sesuai Kondisimu (Rekomendasi terpersonalisasi)
   - Keunggulan 3: Tanpa Menghakimi (Ruang aman penerimaan penuh)
   - Keunggulan 4: Mulai Kapan Saja (Dapat diakses 24/7)

6. Rekomendasi Artikel
   - Eyebrow Dinamis Sesuai Kondisi Mental Pengguna
   - Grid Kartu Artikel Sorotan / Terpopuler

7. FAQ (Pertanyaan Umum & Jawaban)
   - Eyebrow: "PUSAT BANTUAN"
   - Accordion Tanya Jawab Seputar Layanan, Keamanan Data, dan Cara Penggunaan


=== BLOG ===

1. Header Blog (Ruang Baca)
   - Eyebrow: "KUMPULAN ARTIKEL"
   - Judul & Subjudul Koleksi Wawasan dan Panduan Praktis Kesehatan Mental

2. Featured Section (Artikel Sorotan Utama)
   - Eyebrow: "ARTIKEL POPULER"
   - Banner Kartu Artikel Utama / Featured Pilihan

3. Section "Untuk Kamu" (Rekomendasi Terpersonalisasi)
   - Grid Kartu Artikel Pilihan Sesuai Hasil Kondisi Emosi Pengguna (atau Akses Kuis)

4. Section "Yoga untuk Pikiranmu" (Rekomendasi Curated Preview)
   - Eyebrow: "GERAKAN & KETENANGAN"
   - Preview Fixed 4 Artikel Yoga & Olah Napas
   - Tombol Tautan "Lihat semua artikel Yoga" (Pre-set filter Kategori Yoga)

5. Section "Semua Artikel" (Eksplorasi Katalog Lengkap)
   - Eyebrow: "EKSPLORASI"
   - Header Section & Bilah Pencarian (Search Bar)
   - Tombol & Panel Filter Kategori Dinamis (Pill Badges Kategori)
   - Grid Daftar Artikel Terpaginasi (6 Artikel per Halaman)
   - Kontrol Navigasi Halaman (Pagination)

6. Kartu Dukungan Untukmu
   - Akses Cepat Informasi Konsultasi Profesional


=== KONSULTASI ===

1. Hero & Quotes Section
   - Eyebrow: "RUANG KONSULTASI"
   - Judul: "Ruang Aman untuk Pulih & Bertumbuh"
   - Subjudul: "Temukan pendengar yang tepat untuk perjalanan pemulihan emosionalmu."
   - 3 Pilar Layanan Utama (Kerahasiaan, Tanpa Menghakimi, Berbasis Empati)
   - Banner Kutipan Inspiratif Kesehatan Mental

2. Layanan & Pilihan Jalur Konsultasi
   - Eyebrow: "RAGAM DUKUNGAN"
   - Jalur 1: Psikologi Klinis (Sesi pendampingan tatap layar dengan psikolog profesional)
   - Jalur 2: Konsultasi AI BerTeduh (Asisten kecerdasan buatan pendengar 24/7)

3. Daftar Konsultan Klinis (View 1: Direktori Psikolog)
   - Eyebrow: "TIM AHLI BERLISENSI"
   - Grid Kartu Profil Psikolog Profesional (Keahlian, Jadwal, Pendidikan, Pengalaman, Lisensi)
   - Overlay Modal Detail Informasi Psikolog & Booking Contact

4. Ruang Chat AI Sensorik (View 2: Asisten Percakapan Interaktif)
   - Eyebrow: "ASISTEN VIRTUAL"
   - Panel Info & Karakteristik AI BerTeduh ("Ngobrol Dulu Aja")
   - Antarmuka Chat UI (Bubbles Pesan, Riwayat Percakapan, dan Input Text)


=== RELAKSASI ===

1. Header Ruang Relaksasi
   - Eyebrow: "RUANG PEMULIHAN DIRI"
   - Judul & Subjudul Panduan Latihan Pernapasan dan Pose Pemulihan Tubuh

2. Section Pernapasan Ritmis (Modul Latihan Olah Napas Interaktif)
   - Eyebrow: "LATIHAN INTERAKTIF"
   - Selector Tabs Teknik Pernapasan (4-7-8, Box Breathing, 4-4-6, 5-2-5)
   - Petunjuk Fokus & Deskripsi Manfaat Teknik
   - SVG Circular Progress Track & Glowing Dot Visual Timer
   - State Machine: Tap to start, Hold to pause, Tap to resume, Hold to stop
   - Baris Kartu Fase & Emojis Interaktif

3. Section Panduan Langkah Relaksasi Tubuh & Pikiran (Katalog Pose Yoga)
   - Eyebrow: "PANDUAN YOGA"
   - Subjudul & Deskripsi Olah Gerak Fisik
   - Grid Kartu Langkah Relaksasi / Pose Yoga (Tingkat, Durasi, Deskripsi, Manfaat, Tips, dan Pemutar Video Lokal)


=== RUANG SENSORIK (SENTUH) ===

1. Header & Control Bar Overlays
   - Eyebrow: "SENTUHAN MENENANGKAN"
   - Header Text: "Ruang Sensorik" & Subjudul Penenang Pikiran
   - Desktop Pill Controls Bar:
     * Mode Switcher 3 Tema: Air (Riak Gelombang), Angkasa (Stardust Hooke's Law Springs), Menulis (Goresan Pasir)
     * Color Picker (Palette Pemilihan Warna Sentuhan)
     * Tombol Mute / Unmute Efek Suara (Audio Control)
   - Mobile Draggable Floating Circular Action Button (FAB) + Popover Menu Pengaturan Cerdas

2. Kanvas Interaktif Sensorik 2D (Full-Viewport Canvas Layer)
   - Tema Air: Simulasi 2D Height-Field Wave Hydrodynamics (Micro-ripples localized, damping 0.992, ekspansi 25-35%)
   - Tema Angkasa: Simulasi Physics Field Stardust Hooke's Law Springs (Repulsion impulses & sparkle bursts)
   - Tema Menulis: Simulasi Goresan Pasir Taktil & Auto-Refill Alami 8-12 detik
`;

fs.writeFileSync(path.join(exportDir, 'page-structure-snapshot.txt'), pageStructureText.trim() + '\n', 'utf8');
console.log('Created page-structure-snapshot.txt');

// Zip creating helper using PowerShell Compress-Archive
const { execSync } = require('child_process');
try {
  const zipPath = path.join(__dirname, 'plagiarism-check-export.zip');
  execSync(`powershell -Command "Compress-Archive -Path '${exportDir}\\*' -DestinationPath '${zipPath}' -Force"`);
  console.log('Created plagiarism-check-export.zip archive successfully');
} catch (e) {
  console.error('Zip creation note:', e.message);
}
