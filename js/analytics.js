/**
 * China Tech Survival Guide — GA4 event tracking
 *
 * GA4 out of the box only reports page_view. That tells you which pages get
 * traffic but not which ones earn anything. This file instruments the four
 * actions that actually matter for a content site with affiliate links:
 *
 *   affiliate_click  — click on a monetised outbound link (trip.com etc.)
 *   outbound_click   — click on any other external link
 *   save_guide       — reader bookmarks a guide (js/save.js)
 *   comment_submit   — reader leaves a comment (js/comments.js)
 *
 * Usage from other modules: window.CtsTrack('event_name', { ...params })
 * Safe when gtag is blocked or absent — tracking never breaks the page.
 */
(function () {
  'use strict';

  var AFFILIATE_HOSTS = ['trip.com', 'airalo.com', 'nordvpn.com', 'saily.com'];

  window.CtsTrack = function (name, params) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, params || {});
      }
    } catch (e) { /* analytics must never break the page */ }
  };

  function currentSlug() {
    var path = location.pathname.replace(/\/+$/, '');
    var file = path.substring(path.lastIndexOf('/') + 1) || 'home';
    return file.replace(/\.html$/, '');
  }

  function hostOf(href) {
    try {
      return new URL(href, location.href).hostname.replace(/^www\./, '');
    } catch (e) {
      return '';
    }
  }

  function isAffiliate(host) {
    for (var i = 0; i < AFFILIATE_HOSTS.length; i++) {
      var h = AFFILIATE_HOSTS[i];
      if (host === h || host.slice(-(h.length + 1)) === '.' + h) return true;
    }
    return false;
  }

  // Capture phase so the event is queued before the browser navigates away.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;

    var href = a.getAttribute('href') || '';
    if (!/^https?:\/\//i.test(href)) return;

    var host = hostOf(href);
    if (!host || host === location.hostname.replace(/^www\./, '')) return;

    var affiliate = isAffiliate(host);
    window.CtsTrack(affiliate ? 'affiliate_click' : 'outbound_click', {
      link_domain: host,
      link_url: href,
      link_text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      source_page: currentSlug(),
      affiliate: affiliate ? 'yes' : 'no'
    });
  }, true);

  // Let save.js / comments.js report without importing anything.
  window.CtsPageSlug = currentSlug;
})();
