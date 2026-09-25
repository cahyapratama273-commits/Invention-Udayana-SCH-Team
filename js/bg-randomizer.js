/**
 * bg-randomizer.js — Session-persistent random background image manager
 * 
 * Selects a random forest/nature background image per browsing session (sessionStorage)
 * and applies it cohesively across all pages that use the hero/fixed background pattern.
 * Maintains consistent image across navigations within the same session.
 */
(function () {
  const FOREST_BACKGROUNDS = [
    '/assets/Images/artikel/hutan1.webp',
    '/assets/Images/artikel/hutan2.webp',
    '/assets/Images/artikel/hutan3.webp',
    '/assets/Images/artikel/hutan5.webp',
    '/assets/Images/artikel/hutan6.webp',
    '/assets/Images/artikel/hutan7.webp',
    '/assets/Images/artikel/hutan8.webp',
    '/assets/Images/artikel/hutan9.webp',
    '/assets/Images/artikel/hutan10.webp',
    '/assets/Images/artikel/hutan11.webp',
    '/assets/Images/artikel/hutan12.webp',
    '/assets/Images/artikel/hutan13.webp',
    '/assets/Images/artikel/hutan14.webp',
    '/assets/Images/artikel/hutan15.webp',
    '/assets/Images/artikel/hutan16.webp',
    '/assets/Images/artikel/hutan17.webp',
    '/assets/Images/artikel/hutan18.webp',
    '/assets/Images/artikel/hutan19.webp',
    '/assets/Images/artikel/hutan20.webp',
    '/assets/Images/artikel/hutan21.webp',
    '/assets/Images/artikel/hutan22.webp',
    '/assets/Images/artikel/hutan23.webp',
    '/assets/Images/artikel/hutan24.webp',
    '/assets/Images/artikel/hutan25.webp',
    '/assets/Images/artikel/hutan26.webp',
    '/assets/Images/artikel/hutan27.webp',
    '/assets/Images/artikel/hutan28.webp',
    '/assets/Images/artikel/hutan29.webp',
    '/assets/Images/artikel/hutan30.webp',
    '/assets/Images/artikel/hutan31.webp',
    '/assets/Images/artikel/hutan32.webp',
    '/assets/Images/artikel/hutan33.webp',
    '/assets/Images/artikel/hutan34.webp',
    '/assets/Images/artikel/hutan35.webp',
    '/assets/Images/artikel/hutan36.webp',
    '/assets/Images/artikel/hutan37.webp',
    '/assets/Images/artikel/hutan38.webp',
    '/assets/Images/artikel/hutan39.webp',
    '/assets/Images/artikel/hutan40.webp',
    '/assets/Images/artikel/hutan41.webp',
    '/assets/Images/artikel/hutan42.webp',
    '/assets/Images/artikel/hutan43.webp',
    '/assets/Images/artikel/hutan44.webp',
    '/assets/Images/artikel/hutan45.webp',
    '/assets/Images/artikel/hutan46.webp',
    '/assets/Images/artikel/hutan47.webp',
    '/assets/Images/artikel/hutan48.webp',
    '/assets/Images/artikel/hutan49.webp',
    '/assets/Images/artikel/hutan50.webp'
  ];

  const STORAGE_KEY = 'teduh_session_bg';

  function getSessionBg() {
    try {
      let bg = sessionStorage.getItem(STORAGE_KEY);
      if (!bg || !FOREST_BACKGROUNDS.includes(bg)) {
        const randomIndex = Math.floor(Math.random() * FOREST_BACKGROUNDS.length);
        bg = FOREST_BACKGROUNDS[randomIndex];
        sessionStorage.setItem(STORAGE_KEY, bg);
      }
      return bg;
    } catch (e) {
      // If sessionStorage is restricted or disabled
      return FOREST_BACKGROUNDS[0];
    }
  }

  const sessionBg = getSessionBg();
  window.__teduhSessionBg = sessionBg;

  function applySessionBg() {
    // 1. Update <img> background elements
    const bgImgs = document.querySelectorAll('img[data-session-bg], img.session-bg');
    bgImgs.forEach((img) => {
      if (!img.src.endsWith(sessionBg)) {
        img.src = sessionBg;
      }
    });

    // 2. Update inline background-image containers (e.g. hero in konsultasi.html)
    const bgContainers = document.querySelectorAll('[data-session-bg-style], #konsultasi-hero-bg');
    bgContainers.forEach((el) => {
      el.style.backgroundImage = `url('${sessionBg}')`;
    });
  }

  // Pre-apply as DOM nodes stream in (zero flicker)
  if (typeof MutationObserver !== 'undefined' && document.documentElement) {
    const observer = new MutationObserver(() => {
      applySessionBg();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener('DOMContentLoaded', () => {
      applySessionBg();
      observer.disconnect();
    });
  } else {
    document.addEventListener('DOMContentLoaded', applySessionBg);
  }

  // Also apply immediately if body is already ready
  if (document.body) {
    applySessionBg();
  }
})();
