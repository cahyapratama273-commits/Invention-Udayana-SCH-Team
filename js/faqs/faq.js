/**
 * FAQ Horizontal Drawer & Vertical Mobile Accordion
 * Single-open interaction pattern with ARIA accessibility
 */
$(document).ready(function () {
  const $faqRows = $('.faq-row');

  $faqRows.each(function () {
    const $row = $(this);
    const $btn = $row.find('.faq-card');
    const $drawer = $row.find('.faq-drawer');

    function closeFaq() {
      $row.removeClass('is-open');
      $btn.attr('aria-expanded', 'false');
      $drawer.removeAttr('title');
    }

    function openFaq() {
      // Single-open accordion: close all other open items
      $faqRows.not($row).each(function () {
        const $otherRow = $(this);
        $otherRow.removeClass('is-open');
        $otherRow.find('.faq-card').attr('aria-expanded', 'false');
        $otherRow.find('.faq-drawer').removeAttr('title');
      });

      // Open this item
      $row.addClass('is-open');
      $btn.attr('aria-expanded', 'true');
      $drawer.attr('title', 'Klik untuk menutup jawaban');
    }

    $btn.on('click', function (e) {
      e.preventDefault();
      const isOpen = $row.hasClass('is-open');
      if (isOpen) {
        closeFaq();
      } else {
        openFaq();
      }
    });

    // Klik card jawaban untuk menutup
    $drawer.on('click', function (e) {
      // Jika yang diklik adalah link <a>, biarkan user berpindah halaman
      if ($(e.target).closest('a').length) {
        return;
      }
      if ($row.hasClass('is-open')) {
        closeFaq();
      }
    });
  });
});