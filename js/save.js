/**
 * China Tech Survival Guide — Save guide (honest bookmark feature)
 * Toggles "saved" state per article slug in localStorage. No fake counts.
 * Loaded on article pages. Any <button data-slug="..."> becomes a save toggle.
 */
(function () {
  'use strict';
  var KEY = 'cts_saved_guides';

  function getList() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function saveList(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

  function isSaved(slug) { return getList().indexOf(slug) !== -1; }

  function toggle(slug) {
    var list = getList();
    var i = list.indexOf(slug);
    if (i === -1) { list.push(slug); } else { list.splice(i, 1); }
    saveList(list);
    return isSaved(slug);
  }

  function render(slug) {
    var saved = isSaved(slug);
    var els = document.querySelectorAll('button[data-slug="' + slug + '"]');
    for (var k = 0; k < els.length; k++) {
      var el = els[k];
      el.classList.toggle('saved', saved);
      el.setAttribute('aria-pressed', saved ? 'true' : 'false');
      var label = el.querySelector('.save-label');
      if (label) {
        if (!label.getAttribute('data-orig')) {
          label.setAttribute('data-orig', label.textContent);
        }
        label.textContent = saved ? 'Saved' : label.getAttribute('data-orig');
      }
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('button[data-slug]') : null;
    if (!btn) return;
    var slug = btn.getAttribute('data-slug');
    toggle(slug);
    render(slug);
  });

  document.querySelectorAll('button[data-slug]').forEach(function (el) {
    render(el.getAttribute('data-slug'));
  });
})();
