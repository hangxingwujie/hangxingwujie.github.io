/**
 * China Tech Survival Guide — Language Switcher
 * Uses Google Translate free widget, controlled by a custom dropdown.
 * Language preference persists via localStorage.
 *
 * Implementation: sets googtrans cookie, then reloads the page.
 * Google Translate detects the cookie on load and translates automatically.
 */

(function() {
  var cookieDomain = window.location.hostname;

  // Initialize Google Translate element (hidden)
  window.googleTranslateElementInit = function() {
    new google.translate.TranslateElement(
      {
        pageLanguage: 'en',
        includedLanguages: 'ko,ja',
        autoDisplay: false,
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
      },
      'google_translate_element'
    );
  };

  // Load the Translate script dynamically
  var ts = document.createElement('script');
  ts.type = 'text/javascript';
  ts.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.head.appendChild(ts);
})();

/**
 * Called by the language <select> dropdown's onchange.
 * Sets the googtrans cookie and localStorage, then reloads.
 */
function switchLanguage(lang) {
  if (lang === 'en') {
    // Reset to original English — delete cookie
    document.cookie =
      'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;
    localStorage.setItem('cts_lang', 'en');
  } else {
    // Set the translation cookie: /en/ko or /en/ja
    var expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie =
      'googtrans=/en/' + lang +
      '; expires=' + expires.toUTCString() +
      '; path=/; domain=.' + window.location.hostname;
    localStorage.setItem('cts_lang', lang);
  }
  location.reload();
}

/**
 * On page load, sync the dropdown to the stored language.
 */
document.addEventListener('DOMContentLoaded', function() {
  var sel = document.getElementById('language-selector');
  if (!sel) return;
  var stored = localStorage.getItem('cts_lang') || 'en';
  sel.value = stored;
});
