(function () {
  'use strict';
  let current;
  const isId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
  const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };
  const button = (cls, text, attribute) => { const node = el('button', cls, text); node.type = 'button'; if (attribute) node.setAttribute(attribute, ''); return node; };
  const picture = (src, fallback) => {
    const node = el('img'); node.alt = ''; node.loading = 'lazy'; node.decoding = 'async';
    node.src = typeof src === 'string' && (/^https?:\/\//i.test(src) || /^\/(?!\/)/.test(src)) ? src : fallback;
    node.addEventListener('error', () => { node.src = fallback; }, { once: true }); return node;
  };
  const descriptions = {
    likes: ['No liked tracks yet', 'Use the heart on any track to save it to your Library.', 'Keep the tracks you love close. Use the heart on any track to save it here.'],
    history: ['Your history starts with a listen', 'Tracks will appear here after you listen for a little while.', 'Pick up a familiar sound. History is saved to your account after a qualified listen; refresh to see the latest tracks.'],
    following: ['Find your people', 'Follow creators from Home, Feed or a track page to find them here.', 'Keep in touch with creators you follow. Start a message or update your follow status here.'],
  };
  class Library {
    constructor(root) {
      this.root = root; this.abort = new AbortController(); this.accountAbort = new AbortController();
      this.owner = isId(root.dataset.ownerId) ? root.dataset.ownerId : ''; this.epoch = 0; this.version = 0;
      this.songs = new Map(); this.people = new Map(); this.followBusy = new Set(); this.followUpdates = new Map(); this.followRevision = 0;
      this.queues = new Map(); this.playback = {}; this.page = 0; this.initial = true;
      const params = new URLSearchParams(location.search);
      this.tab = ['likes', 'history', 'following'].includes(params.get('tab')) ? params.get('tab') : 'likes';
      this.q = (params.get('q') || '').slice(0, 100); this.category = isId(params.get('categoryId')) ? params.get('categoryId') : '';
      this.sort = ['recent', 'title', 'artist'].includes(params.get('sort')) ? params.get('sort') : 'recent';
      this.items = root.querySelector('[data-library-items]'); this.loading = root.querySelector('[data-library-loading]');
      this.status = root.querySelector('[data-library-status]'); this.retry = root.querySelector('[data-library-retry]');
      this.changed = root.querySelector('[data-library-changed]'); this.more = root.querySelector('[data-library-more]');
      this.search = root.querySelector('[data-library-search]'); this.genre = root.querySelector('[data-library-genre]'); this.order = root.querySelector('[data-library-sort]');
      this.search.value = this.q; const opts = { signal: this.abort.signal };
      root.addEventListener('click', event => this.click(event), opts);
      root.querySelector('[role=tablist]').addEventListener('keydown', event => {
        const tabs = [...root.querySelectorAll('[data-library-tab]')], index = tabs.indexOf(document.activeElement);
        if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next].focus(); this.changeTab(tabs[next].dataset.libraryTab);
      }, opts);
      this.search.addEventListener('input', () => { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.q = this.search.value.trim(); this.url(); this.load(); }, 250); }, opts);
      this.genre.addEventListener('change', () => { this.category = this.genre.value; this.url(); this.load(); }, opts);
      this.order.addEventListener('change', () => { this.sort = this.order.value; this.url(); this.load(); }, opts);
      window.addEventListener('message', event => this.message(event), opts);
      window.addEventListener('mediahz:authenticated', event => this.auth(event.detail?.user?.id), opts);
      window.addEventListener('mediahz:session-stale', () => this.reconcile(), opts);
      const checkSession = () => { if (!document.hidden && this.active() && !(!this.owner && document.getElementById('loginPopup')?.open)) this.reconcile(); };
      window.addEventListener('focus', checkSession, opts); document.addEventListener('visibilitychange', checkSession, opts);
      window.addEventListener('userFollowChanged', event => {
        const data = event.detail; if (!data || data.userId !== this.owner || this.sessionUncertain) return;
        this.followUpdates.set(data.creatorId, { ...data, revision: ++this.followRevision });
        const person = this.people.get(data.creatorId); if (person) { Object.assign(person, data); this.markChanged(); this.paintFollows(); }
      }, opts);
      window.addEventListener('songStats', event => {
        const stats = event.detail, song = this.songs.get(stats?.songId);
        if (!song || typeof stats.liked !== 'boolean' || this.sessionUncertain) return;
        if (song.liked !== stats.liked && this.tab === 'likes') this.markChanged();
        song.liked = stats.liked;
      }, opts);
      document.addEventListener('mediahz:navigated', () => { if (!root.isConnected) this.destroy(); }, opts);
      this.paintTabs(); this.load(); this.send({ type: 'trackStateRequest' });
    }
    active() { return !this.abort.signal.aborted && this.root.isConnected; }
    send(data) { document.getElementById('mediaPlayerFrame')?.contentWindow.postMessage(data, location.origin); }
    signal(extra) { return AbortSignal.any([this.abort.signal, this.accountAbort.signal, AbortSignal.timeout(10000), ...(extra ? [extra] : [])]); }
    async request(url, options = {}) {
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options,
        headers: { Accept: 'application/json', ...(this.owner ? { 'X-Library-Owner': this.owner } : {}), ...options.headers }, signal: this.signal(options.signal) });
      const result = await response.json();
      if (!response.ok || !result.success) throw Object.assign(new Error(url.startsWith('/api/users/') ? 'Unable to confirm follow status. Refresh Library to check the result.' : result.message || 'Unable to load Library.'), { status: response.status });
      return result.data;
    }
    url() {
      const url = new URL(location.href);
      for (const [key, value] of Object.entries({ tab: this.tab === 'likes' ? '' : this.tab, q: this.q, categoryId: this.category, sort: this.sort === 'recent' ? '' : this.sort })) {
        if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
      }
      history.replaceState(history.state, '', url);
    }
    paintTabs() {
      const following = this.tab === 'following';
      if (following) { this.category = ''; if (this.sort === 'artist') this.sort = 'recent'; }
      this.root.querySelectorAll('[data-library-tab]').forEach(tab => { const selected = tab.dataset.libraryTab === this.tab; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; });
      this.root.querySelector('[role=tabpanel]').setAttribute('aria-labelledby', 'libraryTab-' + this.tab);
      this.search.placeholder = { likes: 'Search liked tracks', history: 'Search your history', following: 'Search people you follow' }[this.tab];
      this.root.querySelector('[data-library-genre-label]').hidden = following;
      const options = [[ 'recent', { likes: 'Newest tracks', history: 'Recently played', following: 'Recently followed' }[this.tab] ], ['title', following ? 'Name A–Z' : 'Title A–Z'], ...(!following ? [['artist', 'Artist A–Z']] : [])];
      this.order.replaceChildren(...options.map(([value, label]) => { const option = el('option', '', label); option.value = value; return option; })); this.order.value = this.sort;
      this.root.querySelector('[data-library-help]').textContent = descriptions[this.tab][2]; this.items.classList.toggle('mh-library-people', following);
    }
    changeTab(tab) {
      if (tab === this.tab) return;
      clearTimeout(this.searchTimer); this.tab = tab; this.q = ''; this.search.value = ''; this.category = ''; this.sort = 'recent';
      this.clear(); this.paintTabs(); this.url(); this.load();
    }
    clear() { this.items.replaceChildren(); this.songs.clear(); this.people.clear(); this.page = 0; }
    markChanged() { this.dirty = true; this.changed.hidden = false; this.more.hidden = true; }
    setAccess() {
      const accessible = Boolean(this.owner) && !this.sessionUncertain;
      this.root.querySelector('[data-library-toolbar]').hidden = !accessible;
      this.root.querySelector('[data-library-refresh]').disabled = !accessible;
      this.root.querySelector('[data-library-profile]').hidden = !accessible;
      this.root.querySelector('[data-library-guest]').hidden = accessible || this.sessionUncertain;
    }
    async load(append = false) {
      if (this.sessionUncertain) { this.reconcile(); return; }
      // An item removal shifts offsets, including a previously failed append request.
      if (append && this.dirty) append = false;
      // Include text typed immediately before a genre/sort/refresh click, before debounce fires.
      const query = this.search.value.trim();
      if (query !== this.q) append = false;
      this.q = query; this.url();
      clearTimeout(this.searchTimer); this.readAbort?.abort(); this.readAbort = new AbortController();
      const version = ++this.version, revision = this.followRevision, start = performance.now(), minimum = this.initial ? 1500 : 0; this.initial = false;
      this.setAccess(); this.retry.hidden = true; this.more.hidden = true; this.changed.hidden = true; this.dirty = false;
      this.root.querySelector('[data-library-empty]').hidden = true;
      if (!this.owner) { this.clear(); this.loading.hidden = true; this.status.textContent = ''; this.root.setAttribute('aria-busy', 'false'); return; }
      this.root.setAttribute('aria-busy', 'true'); this.loading.hidden = this.items.childElementCount > 0;
      this.status.textContent = append ? 'Loading more…' : this.items.childElementCount ? 'Refreshing your collection…' : 'Loading your collection…';
      const page = append ? this.page + 1 : 1;
      try {
        const params = new URLSearchParams({ tab: this.tab, q: this.q, sort: this.sort, page, limit: 24 }); if (this.category) params.set('categoryId', this.category);
        const data = await this.request('/api/library?' + params, { signal: this.readAbort.signal });
        if (minimum > performance.now() - start) await new Promise(resolve => setTimeout(resolve, minimum - (performance.now() - start)));
        if (!this.active() || version !== this.version) return;
        if (data.viewerId !== this.owner) { this.reconcile(); return; }
        if (!append) this.clear(); this.page = page;
        const options = [el('option', '', 'All genres')]; options[0].value = '';
        for (const category of data.categories) { const option = el('option', '', category.name); option.value = category.id; options.push(option); }
        this.genre.replaceChildren(...options); this.genre.value = this.category;
        for (const item of data.items) {
          if (this.tab === 'following') {
            if (this.people.has(item.id)) continue;
            const update = this.followUpdates.get(item.id), value = update && update.revision > revision ? { ...item, ...update } : item;
            this.people.set(item.id, value); this.items.append(this.person(value));
          } else { if (this.songs.has(item.id)) continue; this.songs.set(item.id, item); this.items.append(this.track(item)); }
        }
        this.more.hidden = !data.hasMore || this.dirty; this.status.textContent = '';
        const empty = this.items.childElementCount === 0;
        this.root.querySelector('[data-library-empty]').hidden = !empty;
        this.root.querySelector('[data-library-empty-title]').textContent = this.q || this.category ? 'No matches in this collection' : descriptions[this.tab][0];
        this.root.querySelector('[data-library-empty-copy]').textContent = this.q || this.category ? 'Try a different search or genre.' : descriptions[this.tab][1];
        this.paintPlayback(); this.paintFollows(); this.paintQueues(); window.SongEngagementV2_1?.bind(this.root, { fresh: !append });
      } catch (error) {
        if (!this.active() || version !== this.version) return;
        if ([401, 409].includes(error.status)) { this.reconcile(); return; }
        this.status.textContent = error.status ? error.message : 'Unable to connect. Your current list is still here. Please try again.';
        this.retry.hidden = false; this.retryAppend = append;
      } finally { if (this.active() && version === this.version) { this.loading.hidden = true; this.root.setAttribute('aria-busy', 'false'); } }
    }
    track(song) {
      const row = el('article', 'mh-library-track'); row.dataset.libraryTrack = song.id;
      const cover = button('mh-library-cover', null, 'data-library-cover'); cover.dataset.songId = song.id; cover.setAttribute('aria-label', 'Play ' + song.name); cover.append(picture(song.image, '/images/chibi.gif'));
      const info = el('div', 'mh-library-track-info'); info.append(el('p', 'mh-library-artist', song.artist && song.artist !== 'Unknown' ? song.artist : song.creator?.name || 'Unknown'));
      const heading = el('h3'), title = el('a', 'mh-library-title', song.name); title.dataset.libraryTitle = ''; title.title = song.name;
      title.href = typeof song.url === 'string' && /^\/(?!\/)/.test(song.url) ? song.url : '/home/song/' + song.id; heading.append(title); info.append(heading);
      const meta = el('div', 'mh-library-meta'); if (song.category?.name) meta.append(el('span', 'mh-library-genre', song.category.name));
      if (song.lastPlayedAt) { const date = new Date(song.lastPlayedAt); if (Number.isFinite(date.getTime())) { const time = el('time', '', 'Played ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })); time.dateTime = date.toISOString(); meta.append(time); } }
      const status = el('span', 'mh-library-playback'); status.dataset.libraryPlayback = ''; meta.append(status); info.append(meta);
      const actions = el('div', 'mh-library-actions'), like = button('mh-library-button'); like.dataset.songLike = song.id; like.dataset.initialLiked = String(song.liked); like.setAttribute('aria-pressed', String(song.liked)); like.setAttribute('aria-label', song.liked ? 'Unlike' : 'Like');
      const heart = el('span', 'song-like-icon'); heart.setAttribute('aria-hidden', 'true'); like.append(heart);
      const queue = button('mh-library-button', null, 'data-library-queue'); queue.dataset.songId = song.id; queue.setAttribute('aria-label', 'Add ' + song.name + ' to Next Up');
      const note = el('span', 'mh-library-queue-icon'); note.setAttribute('aria-hidden', 'true'); queue.append(note, el('span', '', 'Next Up')); actions.append(like, queue);
      row.append(cover, info, actions); return row;
    }
    person(person) {
      const card = el('article', 'mh-library-person'); card.dataset.libraryPerson = person.id;
      const avatar = picture(person.avatar, '/images/auth/person-circle.svg'), name = el('h3', '', person.name);
      // Previous public prefix: /^\/profile\/[a-z0-9-]+$/.
      if (typeof person.profileUrl === 'string' && /^\/users\/profile\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(person.profileUrl)) { const link = el('a', 'mh-library-profile-link'); link.href = person.profileUrl; link.dataset.libraryLink = ''; link.append(avatar, name); card.append(link); } else card.append(avatar, name);
      if (person.tag) card.append(el('p', '', '#' + person.tag.replace(/^#/, ''))); if (person.location) card.append(el('p', '', person.location));
      const actions = el('div', 'mh-library-person-actions'), follow = button('mh-library-button', 'Following', 'data-library-follow'); follow.dataset.creatorId = person.id;
      const message = button('mh-library-button', 'Message', 'data-library-message'); message.dataset.creatorId = person.id; actions.append(follow, message); card.append(actions); return card;
    }
    click(event) {
      const target = event.target.closest('button,a'); if (!target || !this.root.contains(target)) return;
      if (target.matches('[data-library-tab]')) { this.changeTab(target.dataset.libraryTab); return; }
      if (target.matches('[data-library-login]')) { this.login(); return; }
      if (target.matches('[data-library-link],[data-library-title]')) {
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0 && window.navigateMediaHz) { event.preventDefault(); window.navigateMediaHz(target.getAttribute('href'), true); } return;
      }
      if (target.matches('[data-library-retry]') && this.sessionUncertain) { this.reconcile(); return; }
      if (this.sessionUncertain || !this.owner) return;
      if (target.matches('[data-library-refresh],[data-library-changed]')) { this.load(); return; }
      if (target.matches('[data-library-retry]')) { this.load(Boolean(this.retryAppend)); return; }
      if (target.matches('[data-library-more]')) { this.load(true); return; }
      if (target.matches('[data-library-follow]')) { const person = this.people.get(target.dataset.creatorId); if (person) this.follow(person.id, !person.following); return; }
      if (target.matches('[data-library-message]')) { const person = this.people.get(target.dataset.creatorId); if (person) { if (window.MediaHzMail) window.MediaHzMail.composeTo(person); else this.notice('Open Mail from the navigation bar to start a message.'); } return; }
      const song = this.songs.get(target.dataset.songId); if (!song) return;
      if (target.matches('[data-library-cover]')) {
        this.selecting = song.id; clearTimeout(this.selectTimer); this.selectTimer = setTimeout(() => { this.selecting = null; if (this.active()) this.paintPlayback(); }, 10000);
        this.paintPlayback(); this.send({ type: 'trackToggle', songId: song.id, name: song.name, categoryId: song.categoryId });
      }
      if (target.matches('[data-library-queue]')) {
        if ([...this.queues.values()].some(q => q.id === song.id)) return;
        const requestId = crypto.randomUUID(), timer = setTimeout(() => { this.queues.delete(requestId); if (this.active()) { this.paintQueues(); this.notice('No confirmation received. Please check Next Up.'); } }, 10000);
        this.queues.set(requestId, { id: song.id, timer }); this.paintQueues(); this.send({ type: 'queueAdd', requestId, song: { id: song.id, name: song.name, artist: song.artist, image: song.image, url: song.url } });
      }
    }
    paintQueues() { const ids = new Set([...this.queues.values()].map(q => q.id)); this.root.querySelectorAll('[data-library-queue]').forEach(b => { b.disabled = ids.has(b.dataset.songId); }); }
    message(event) {
      if (event.origin !== location.origin || event.source !== document.getElementById('mediaPlayerFrame')?.contentWindow) return;
      const data = event.data;
      if (data?.type === 'queueAdded') { const q = this.queues.get(data.requestId); if (!q || q.id !== data.songId) return; clearTimeout(q.timer); this.queues.delete(data.requestId); this.paintQueues(); this.notice(data.success ? 'Added to Next Up.' : 'Unable to add this track.'); }
      if (data?.type !== 'trackPlayback') return;
      this.playback = data;
      if ((data.songId === this.selecting && ['playing', 'paused', 'ended'].includes(data.status)) || data.status === 'error') { this.selecting = null; clearTimeout(this.selectTimer); }
      this.paintPlayback();
    }
    paintPlayback() {
      this.root.querySelectorAll('[data-library-cover]').forEach(b => {
        const selected = b.dataset.songId === this.playback.songId, playing = selected && this.playback.status === 'playing';
        b.disabled = this.selecting === b.dataset.songId || selected && this.playback.status === 'loading';
        b.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + (this.songs.get(b.dataset.songId)?.name || ''));
        const row = b.closest('[data-library-track]'); row.dataset.playing = String(playing);
        row.querySelector('[data-library-playback]').textContent = selected ? ({ playing: 'Playing', paused: 'Paused', loading: 'Loading…', error: 'Unable to play' }[this.playback.status] || '') : '';
      });
    }
    paintFollows() { this.root.querySelectorAll('[data-library-follow]').forEach(b => { const person = this.people.get(b.dataset.creatorId); b.disabled = this.followBusy.has(b.dataset.creatorId); b.textContent = person?.following ? 'Following' : 'Follow'; b.setAttribute('aria-pressed', String(Boolean(person?.following))); b.setAttribute('aria-label', (person?.following ? 'Unfollow ' : 'Follow ') + (person?.name || '')); }); }
    async follow(id, following) {
      if (!this.owner || this.sessionUncertain || this.followBusy.has(id)) return;
      const epoch = this.epoch; this.followBusy.add(id); this.paintFollows();
      try { const data = await this.request('/api/users/' + id + '/follow', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Follow-Owner': this.owner }, body: JSON.stringify({ following }) }); if (this.active() && epoch === this.epoch) window.UserFollowEvents?.publish(data); }
      catch (error) { if (!this.active() || epoch !== this.epoch) return; if ([401,409].includes(error.status)) this.reconcile(); else this.notice(error.message); }
      finally { if (this.active() && epoch === this.epoch) { this.followBusy.delete(id); this.paintFollows(); } }
    }
    resetAccount() {
      this.accountAbort.abort(); this.accountAbort = new AbortController(); this.readAbort?.abort(); this.epoch++; ++this.version;
      clearTimeout(this.searchTimer); clearTimeout(this.selectTimer); this.selecting = null; this.queues.forEach(q => clearTimeout(q.timer)); this.queues.clear();
      this.clear(); this.followBusy.clear(); this.followUpdates.clear(); this.followRevision = 0; this.changed.hidden = true; this.more.hidden = true;
    }
    auth(id) {
      this.resetAccount(); this.sessionUncertain = false; this.reconciling = false; this.retryAppend = false;
      this.owner = isId(id) ? id : ''; this.root.dataset.ownerId = this.owner; this.load();
    }
    async reconcile() {
      if (this.reconciling || !this.active()) return;
      const previousOwner = this.owner; this.reconciling = true; this.sessionUncertain = true; this.resetAccount();
      this.owner = ''; this.root.dataset.ownerId = ''; const epoch = this.epoch;
      this.setAccess(); this.root.querySelector('[data-library-empty]').hidden = true; this.root.setAttribute('aria-busy', 'true');
      this.loading.hidden = false; this.retry.hidden = true; this.status.textContent = 'Checking your account…';
      try {
        const response = await fetch('/auth/session', { cache: 'no-store', credentials: 'same-origin', signal: this.signal() }), data = await response.json();
        if (!response.ok || !data.success || data.authenticated && !isId(data.user?.id)) throw new Error();
        if (!this.active() || epoch !== this.epoch) return;
        const user = data.authenticated ? data.user : null, slot = document.getElementById('navAuthControls');
        if (slot && typeof data.nav === 'string') { /* Escaped account partial from our session endpoint. */ slot.innerHTML = data.nav; slot.querySelectorAll('[data-avatar-fallback]').forEach(img => img.addEventListener('error', () => { img.src = img.dataset.avatarFallback; }, { once: true })); }
        else if (slot && !user) { const link = el('a', 'btn btn-outline-warning', 'Login'); link.href = '/auth/signin'; link.dataset.openLogin = ''; slot.replaceChildren(link); }
        if ((user?.id || '') === previousOwner) this.auth(user?.id);
        else { window.dispatchEvent(new CustomEvent('mediahz:authenticated', { detail: { user } })); this.send({ type: 'authChanged', userId: user?.id || null }); }
      } catch { if (!this.active() || epoch !== this.epoch) return; this.reconciling = false; this.loading.hidden = true; this.retry.hidden = false; this.root.setAttribute('aria-busy', 'false'); this.status.textContent = 'Unable to verify your account. Please try again.'; }
    }
    login() { if (window.MediaHzLogin) window.MediaHzLogin.open(); else location.assign('/auth/signin'); }
    notice(text) { if (window.UserFollowEvents) window.UserFollowEvents.notify(text); else this.status.textContent = text; }
    destroy() { this.abort.abort(); this.resetAccount(); }
  }
  // Replaces the old catalogue-only initLibraryView; library_v2_1.js remains unloaded.
  window.initLibraryView = function () { const root = document.querySelector('[data-library-view]'); if (current?.root === root && current.active()) return; current?.destroy(); current = root ? new Library(root) : null; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.initLibraryView, { once: true }); else window.initLibraryView();
})();
