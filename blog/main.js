let dataArtikel = [];

async function loadArtikel() {
  try {
    const res = await fetch('../data/artikel.json');
    dataArtikel = await res.json();
    init();
  } catch (err) {
    console.error('Gagal load data artikel:', err);
    document.querySelector('#detail-container').innerHTML = `<p>Gagal memuat data artikel.</p>`;
  }
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const artikelId = params.get('id');
  const artikel = dataArtikel.find(item => String(item.id) === String(artikelId));

  if (artikel) {
    renderDetailArtikel(artikel);
  } else {
    document.querySelector('#detail-container').innerHTML = `<p>Artikel tidak ditemukan.</p>`;
  }
}

loadArtikel();