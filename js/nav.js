/**
 * China Tech Survival Guide — Mobile hamburger menu
 * Toggles the <nav id="site-nav"> panel and animates the .nav-toggle button.
 * Closes when clicking outside or tapping a link.
 */
(function () {
  'use strict';
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  function setOpen(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  toggle.addEventListener('click', function () {
    setOpen(!nav.classList.contains('open'));
  });

  nav.addEventListener('click', function (e) {
    if (e.target && e.target.tagName === 'A') setOpen(false);
  });

  document.addEventListener('click', function (e) {
    if (!nav.classList.contains('open')) return;
    if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });
})();
