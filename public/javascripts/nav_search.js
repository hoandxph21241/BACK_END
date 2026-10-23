(function (window, document) {
  'use strict';
  const form = document.getElementById('navSearchForm');
  const input = document.getElementById('navSearchInput');
  const clear = document.getElementById('navSearchClear');
  if (!form || !input || !clear) return;

  function updateClear() { clear.hidden = input.value.length === 0; }
  function sync(url) {
    const target = new URL(url, location.href);
    input.value = target.pathname.replace(/\/+$/, '') === '/home/search' ? target.searchParams.get('q') || '' : '';
    updateClear();
  }
  form.addEventListener('submit', event => {
    const q = input.value.normalize('NFC').replace(/\s+/gu, ' ').trim();
    if (!q) { event.preventDefault(); input.focus(); return; }
    if (q.length > input.maxLength) {
      event.preventDefault(); input.setCustomValidity('Maximum 100 characters.'); input.reportValidity(); return;
    }
    input.value = q;
    updateClear();
    if (typeof window.navigateMediaHz !== 'function') return;
    event.preventDefault();
    window.navigateMediaHz('/home/search?' + new URLSearchParams({ q }), true);
  });
  input.addEventListener('input', () => { input.setCustomValidity(''); updateClear(); });
  clear.addEventListener('click', () => { input.value = ''; input.setCustomValidity(''); updateClear(); input.focus(); });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-search-navigation]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !window.navigateMediaHz) return;
    event.preventDefault();
    window.navigateMediaHz(link.getAttribute('href'), true);
  });
  document.addEventListener('mediahz:navigated', event => sync(event.detail.url));
  sync(location.href);
})(window, document);
