$(document).ready(function() {

  function animateCounter($el) {
    const target = parseFloat($el.data('target'));
    const suffix = $el.data('suffix') || '';
    const divide = $el.data('divide') ? parseFloat($el.data('divide')) : 1;

    $({ count: 0 }).animate({ count: target }, {
      duration: 1500,
      easing: 'swing',
      step: function() {
        let displayValue;
        if (divide > 1) {
          displayValue = (this.count / divide).toFixed(1).replace('.', ',');
        } else {
          displayValue = Math.floor(this.count);
        }
        $el.text(displayValue + suffix);
      },
      complete: function() {
        let finalValue;
        if (divide > 1) {
          finalValue = (target / divide).toFixed(1).replace('.', ',');
        } else {
          finalValue = target;
        }
        $el.text(finalValue + suffix);
      }
    });
  }

  const $counters = $('.counter');
  let alreadyRun = false;

  function checkInView() {
    if (alreadyRun || $counters.length === 0) return;

    const $first = $counters.first();
    const elTop = $first.offset().top;
    const winTop = $(window).scrollTop();
    const winBottom = winTop + $(window).height();

    if (elTop < winBottom - 100) {
      alreadyRun = true;
      $counters.each(function() {
        animateCounter($(this));
      });
      $(window).off('scroll', checkInView);
    }
  }

  $(window).on('scroll', checkInView);
  checkInView();

});