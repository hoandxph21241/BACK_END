// Previous controller retained, unloaded, in nav_search_legacy.js.
(function (window, document) {
  'use strict';
  const form = document.getElementById('navSearchForm'), input = document.getElementById('navSearchInput');
  const clear = document.getElementById('navSearchClear'), panel = document.getElementById('navSearchSuggestions');
  const list = document.getElementById('navSearchOptions'), status = document.getElementById('navSearchStatus'), all = document.getElementById('navSearchAll');
  if (!form || !input || !clear || !panel || !list) return;
  let timer, abort, generation = 0, composing = false, active = -1, choices = [], result = null, state = '';
  const messages = {
    en: { loading: 'Searching…', empty: 'No matches found.', error: 'Suggestions are unavailable. Press Enter to search.', tracks: 'Tracks', people: 'People', all: 'View all results', results: 'suggestions available', label: 'Search suggestions' },
    vi: { loading: 'Đang tìm…', empty: 'Không tìm thấy kết quả.', error: 'Chưa tải được gợi ý. Nhấn Enter để tìm kiếm.', tracks: 'Bài hát', people: 'Người đăng', all: 'Xem tất cả kết quả', results: 'gợi ý', label: 'Gợi ý tìm kiếm' },
  };
  const text = key => messages[window.MediaHzLanguage?.language === 'vi' ? 'vi' : 'en'][key];
  const query = () => input.value.normalize('NFC').replace(/\s+/gu, ' ').trim();
  const searchUrl = q => '/home/search?' + new URLSearchParams({ q });
  const element = (tag, className, value) => { const node = document.createElement(tag); node.className = className; if (value !== undefined) node.textContent = value; return node; };
  function updateClear() { clear.hidden = input.value.length === 0; }
  function resetSelection() { active = -1; input.removeAttribute('aria-activedescendant'); for (const option of choices) option.setAttribute('aria-selected', 'false'); }
  function cancel() { clearTimeout(timer); abort?.abort(); abort = null; generation++; }
  function dismiss() {
    cancel(); panel.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-busy');
    resetSelection(); list.replaceChildren(); choices = []; result = null;
  }
  function show() { panel.hidden = false; input.setAttribute('aria-expanded', 'true'); all.href = searchUrl(query()); all.textContent = text('all'); list.setAttribute('aria-label', text('label')); }
  function setStatus(next) { state = next; status.textContent = text(next); status.hidden = false; show(); }
  function render(data) {
    list.replaceChildren(); choices = []; resetSelection(); result = data;
    for (const [kind, items] of [['tracks', data.tracks || []], ['people', data.people || []]]) {
      if (!items.length) continue;
      const heading = element('li', 'nav-search-group', text(kind)); heading.setAttribute('role', 'presentation'); list.append(heading);
      for (const item of items) {
        if (typeof item.url !== 'string' || !/^\/(?!\/)/.test(item.url)) continue;
        const row = element('li', 'nav-search-row'); row.setAttribute('role', 'presentation');
        const option = element('a', 'nav-search-option'); option.href = item.url; option.tabIndex = -1;
        option.dataset.searchNavigation = ''; option.dataset.suggestionKind = kind === 'tracks' ? 'track' : 'person';
        option.id = 'navSearchOption-' + choices.length; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false');
        const image = element('img', 'nav-search-cover'); image.alt = ''; image.width = 40; image.height = 40;
        const fallback = kind === 'people' ? '/images/auth/person-circle.svg' : '/images/chibi.gif';
        image.src = typeof item.image === 'string' && (/^https?:\/\//i.test(item.image) || /^\/(?!\/)/.test(item.image)) ? item.image : fallback;
        image.addEventListener('error', () => { if (!image.dataset.failed) { image.dataset.failed = '1'; image.src = fallback; } });
        const copy = element('span', 'nav-search-copy'); copy.append(element('span', 'nav-search-title', item.name));
        copy.append(element('span', 'nav-search-subtitle', kind === 'tracks' ? item.artist || 'Unknown' : item.tag || 'MediaHz'));
        option.append(image, copy); row.append(option); list.append(row); choices.push(option);
      }
    }
    state = choices.length ? 'results' : 'empty'; show();
    status.textContent = choices.length ? choices.length + ' ' + text('results') : text('empty');
    status.classList.toggle('nav-search-sr-only', choices.length > 0); status.hidden = false;
  }
  async function suggest() {
    const q = query(); if (q.length < 2 || q.length > input.maxLength || composing) return dismiss();
    const version = ++generation; abort = new AbortController();
    list.replaceChildren(); choices = []; resetSelection(); result = null;
    status.classList.remove('nav-search-sr-only'); input.setAttribute('aria-busy', 'true'); setStatus('loading');
    try {
      const response = await fetch('/home/search/suggestions?' + new URLSearchParams({ q }), { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal: abort.signal });
      const json = await response.json();
      if (version !== generation || query() !== q || document.activeElement !== input) return;
      if (!response.ok || !json.success) throw new Error('suggestions');
      render(json.data);
    } catch (error) { if (version === generation && error.name !== 'AbortError') setStatus('error'); }
    finally { if (version === generation) input.removeAttribute('aria-busy'); }
  }
  function schedule() { dismiss(); updateClear(); input.setCustomValidity(''); if (!composing && query().length >= 2) timer = setTimeout(suggest, 300); }
  function select(index) { resetSelection(); active = index; const option = choices[index]; option.setAttribute('aria-selected', 'true'); input.setAttribute('aria-activedescendant', option.id); option.scrollIntoView({ block: 'nearest' }); }
  form.addEventListener('submit', event => {
    if (composing || event.isComposing) { event.preventDefault(); return; }
    const q = query(); if (!q) { event.preventDefault(); input.focus(); return; }
    if (q.length > input.maxLength) { event.preventDefault(); input.setCustomValidity('Maximum 100 characters.'); input.reportValidity(); return; }
    input.value = q; updateClear(); dismiss(); if (typeof window.navigateMediaHz !== 'function') return;
    event.preventDefault(); window.navigateMediaHz(searchUrl(q), true);
  });
  input.addEventListener('input', schedule);
  input.addEventListener('compositionstart', () => { composing = true; dismiss(); });
  input.addEventListener('compositionend', () => { composing = false; schedule(); });
  input.addEventListener('focus', schedule);
  input.addEventListener('keydown', event => {
    if (composing || event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape') { event.preventDefault(); dismiss(); return; }
    if (panel.hidden) return;
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && choices.length) {
      event.preventDefault(); select((active + (event.key === 'ArrowDown' ? 1 : active < 0 ? 0 : -1) + choices.length) % choices.length);
    } else if (event.key === 'Enter' && active >= 0) { event.preventDefault(); choices[active].click(); }
  });
  clear.addEventListener('click', () => { input.value = ''; dismiss(); input.setCustomValidity(''); updateClear(); input.focus(); });
  document.addEventListener('pointerdown', event => { if (!event.target.closest('.nav-search')) dismiss(); });
  document.addEventListener('focusin', event => { if (!event.target.closest('.nav-search')) dismiss(); });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-search-navigation]'); if (!link) return;
    const href = link.getAttribute('href'); dismiss();
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !window.navigateMediaHz) return;
    event.preventDefault(); window.navigateMediaHz(href, true);
  });
  list.addEventListener('mousedown', event => { if (event.button === 0) event.preventDefault(); });
  function sync(url) { dismiss(); const target = new URL(url, location.href); input.value = target.pathname.replace(/\/+$/, '') === '/home/search' ? target.searchParams.get('q') || '' : ''; updateClear(); }
  document.addEventListener('mediahz:navigated', event => sync(event.detail.url));
  window.addEventListener('mediahz:authenticated', dismiss);
  window.addEventListener('mediahz:preferences', dismiss);
  window.addEventListener('blur', dismiss);
  document.addEventListener('visibilitychange', () => { if (document.hidden) dismiss(); });
  window.addEventListener('mediahz:languagechanged', () => { if (panel.hidden) return; if (result) render(result); else setStatus(state); });
  sync(location.href);
})(window, document);
