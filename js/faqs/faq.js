/**
 * FAQ Accordion — Hover to open, Click to pin/toggle
 * 
 * - Hover (desktop): card terbuka otomatis, tertutup lagi saat mouse keluar
 * - Klik: "pin" card supaya tetap terbuka meski mouse keluar; klik lagi untuk unpin & tutup
 * - Touchscreen: fallback ke klik biasa (native <details> behavior)
 */
$(document).ready(function () {
  const supportsHover = window.matchMedia('(hover: hover)').matches;
  const HOVER_DELAY = 200; // ms, biar nggak kebuka pas mouse cuma lewat sekilas

  if (!supportsHover) {
    // Touchscreen: biarkan <details>/<summary> jalan native, tidak perlu JS tambahan
    return;
  }

  $('.faq-item').each(function () {
    const $item = $(this);
    const $summary = $item.find('summary');
    let isPinned = $item.attr('open') !== undefined; // state awal, true kalau sudah ada attr "open" di HTML
    let hoverTimeout = null;

    // Hover masuk → buka (dengan sedikit delay biar nggak overly sensitive)
    $item.on('mouseenter', function () {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        $item.attr('open', '');
      }, HOVER_DELAY);
    });

    // Hover keluar → tutup, KECUALI sudah di-pin via klik
    $item.on('mouseleave', function () {
      clearTimeout(hoverTimeout);
      if (!isPinned) {
        $item.removeAttr('open');
      }
    });

    // Klik summary → toggle pin state, full manual control
    $summary.on('click', function (e) {
      e.preventDefault(); // cegah toggle native <details>, kita kontrol sendiri

      isPinned = !isPinned;

      if (isPinned) {
        $item.attr('open', '');
      } else {
        $item.removeAttr('open');
      }
    });
  });
});