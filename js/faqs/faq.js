/**
 * FAQ Accordion — Smooth Animated Toggle with Hover & Click Support
 */
$(document).ready(function () {
  const ANIM_DURATION = 350; // ms

  $('.faq-item').each(function () {
    const $item = $(this);
    const $summary = $item.find('summary');
    let isAnimating = false;

    function openItem() {
      if ($item.attr('open') !== undefined || isAnimating) return;
      isAnimating = true;
      $item.removeClass('is-closing');
      $item.attr('open', '');
      setTimeout(() => {
        isAnimating = false;
      }, ANIM_DURATION);
    }

    function closeItem() {
      if ($item.attr('open') === undefined || isAnimating) return;
      isAnimating = true;
      $item.addClass('is-closing');
      setTimeout(() => {
        $item.removeAttr('open');
        $item.removeClass('is-closing');
        isAnimating = false;
      }, ANIM_DURATION);
    }

    // Klik summary untuk membuka / menutup dengan animasi halus
    $summary.on('click', function (e) {
      e.preventDefault();
      if (isAnimating) return;

      const isOpen = $item.attr('open') !== undefined && !$item.hasClass('is-closing');
      if (isOpen) {
        closeItem();
      } else {
        openItem();
      }
    });
  });
});