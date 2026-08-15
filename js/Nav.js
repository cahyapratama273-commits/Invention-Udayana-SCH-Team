// Nav.js — router AJAX: klik link internal -> fetch -> ganti #app-content, no reload
(function () {
  const CONTENT_SELECTOR = "#app-content"; // bagian yang di swap untuk setiap navigasi
  const FADE_MS = 160; // durasi transisi fade out/in

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms)); // bikin delay pakai Promise
  }

  function isNavigableLink(a) {
    if (!a || !a.href) return false; // bukan elemen <a> atau nggak punya href
    if (a.target && a.target !== "_self") return false; // target="_blank" dll dibiarin normal
    if (a.hasAttribute("download")) return false; // link download dibiarin normal
    if (a.hasAttribute("data-no-ajax")) return false; // opt-out manual
    if (a.href.startsWith("mailto:") || a.href.startsWith("tel:")) return false;
    let url;
    try { url = new URL(a.href, window.location.href); } catch (e) { return false; }
    if (url.origin !== window.location.origin) return false; // link ke luar situs, biarin normal
    if (url.pathname === window.location.pathname && url.hash) return false; // anchor di halaman sama
    return true;
  }

  // FIX: terima baseUrl (URL halaman yang di-fetch), dipakai buat resolve manual.
  // Sebelumnya pakai oldScript.src, yang salah karena document hasil DOMParser
  // base URL-nya "about:blank", bukan URL halaman yang di-fetch.
  function runInlineScripts(container, baseUrl) {
    container.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script"); // <script> dari innerHTML nggak auto-jalan
      [...oldScript.attributes].forEach((attr) => newScript.setAttribute(attr.name, attr.value));
      const rawSrc = oldScript.getAttribute("src"); // ambil string mentah dari HTML, bukan properti .src
      if (rawSrc) {
        newScript.src = new URL(rawSrc, baseUrl).href; // resolve manual relatif ke baseUrl yang benar
        newScript.async = false; // FIX: paksa jalan sesuai urutan HTML, bukan siapa cepat download duluan
      } else {
        newScript.textContent = oldScript.textContent; // script inline, copy isinya
      }
      oldScript.replaceWith(newScript); // ganti tag lama biar browser eksekusi yang baru
    });
  }

  function highlightActiveNav() {
    const current = document.body.dataset.page; // baca data-page halaman aktif
    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.classList.remove("font-semibold");
      if (el.dataset.nav !== "bantuan") {
        el.style.background = "";
        el.style.color = "";
      }
    });
    if (!current) return;
    document.querySelectorAll(`[data-nav="${current}"]`).forEach((el) => {
      el.classList.add("font-semibold"); // tebalin menu yang lagi aktif
      if (el.dataset.nav !== "bantuan") {
        el.style.background = "#EEF2EE";
        el.style.color = "#1E413F";
      }
    });
  }

  async function navigateTo(url, push = true) {
    const content = document.querySelector(CONTENT_SELECTOR);
    if (!content) { window.location.href = url; return; } // halaman ini nggak support AJAX nav, reload biasa

    content.style.transition = `opacity ${FADE_MS}ms ease`;
    content.style.opacity = "0"; // fade out dulu
    await wait(FADE_MS);

    try {
      const res = await fetch(url, { headers: { "X-Requested-With": "spa-nav" } });
      if (!res.ok) throw new Error(`Gagal fetch (${res.status})`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html"); // ubah string HTML jadi dokumen
      const newContent = doc.querySelector(CONTENT_SELECTOR);
      if (!newContent) throw new Error(`${url} tidak punya ${CONTENT_SELECTOR}`);

      content.innerHTML = newContent.innerHTML; // suntik konten baru
      document.title = doc.title || document.title; // update judul tab
      document.body.dataset.page = doc.body.dataset.page || ""; // update penanda halaman aktif

      // FIX: pushState dipindah ke SINI, sebelum script dijalankan -> supaya
      // document.location udah benar duluan, karena script yang baru (mis.
      // fetch("../data/x.json") di Beranda.js) resolve path relatifnya
      // berdasarkan document.location saat itu.
      if (push) history.pushState({ url }, "", url);

      runInlineScripts(content, url); // jalanin script halaman baru, resolve path relatif ke `url`
      document.dispatchEvent(new CustomEvent("spa:loaded", { detail: { url } }));

      window.scrollTo({ top: 0, behavior: "instant" });
      highlightActiveNav();
    } catch (err) {
      console.error("Navigasi AJAX gagal, fallback ke reload penuh:", err);
      window.location.href = url; // fallback aman kalau AJAX gagal
      return;
    }
    content.style.opacity = "1"; // fade in konten baru
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!isNavigableLink(a)) return; // bukan link yang perlu di-intercept
    e.preventDefault();
    if (a.href === window.location.href) return; // udah di halaman itu, skip
    navigateTo(a.href);
  });

  window.addEventListener("popstate", () => navigateTo(window.location.href, false)); // tombol back/forward

  window.teduhNavigateTo = navigateTo; // dipakai buat redirect programatik dari file lain

  document.addEventListener("DOMContentLoaded", highlightActiveNav); // highlight pas load pertama
})();