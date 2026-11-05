(function () {
  'use strict';
  let current;
  const isId = v => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
  const count = n => Math.max(0, Number(n) || 0).toLocaleString('en-US');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const btn = (cls, text, attr) => { const n = el('button', cls, text); n.type = 'button'; if (attr) n.setAttribute(attr, ''); return n; };
  const picture = (src, fallback) => {
    const n = el('img'); n.alt = ''; n.loading = 'lazy'; n.decoding = 'async';
    n.src = typeof src === 'string' && (/^https?:\/\//i.test(src) || /^\/(?!\/)/.test(src)) ? src : fallback;
    n.addEventListener('error', () => { n.src = fallback; }, { once: true }); return n;
  };
  class Home {
    constructor(root) {
      this.root = root; this.abort = new AbortController(); this.accountAbort = new AbortController();
      this.owner = isId(root.dataset.ownerId) ? root.dataset.ownerId : ''; this.epoch = 0; this.version = 0;
      this.songs = new Map(); this.people = new Map(); this.followBusy = new Set(); this.followUpdates = new Map(); this.followRevision = 0;
      this.queues = new Map(); this.playback = {}; this.category = new URLSearchParams(location.search).get('categoryId') || '';
      if (!isId(this.category)) this.category = '';
      this.status = root.querySelector('[data-home-status]'); this.retry = root.querySelector('[data-home-retry]');
      this.loading = root.querySelector('[data-home-loading]'); this.shelves = root.querySelector('[data-home-shelves]');
      this.changed = root.querySelector('[data-home-changed]'); this.creators = root.querySelector('[data-home-creators]');
      this.recent = root.querySelector('[data-home-recent]'); this.select = root.querySelector('[data-home-category]');
      const opts = { signal: this.abort.signal };
      root.addEventListener('click', e => this.click(e), opts);
      this.select.addEventListener('change', () => {
        this.category = this.select.value; const url = new URL(location.href);
        if (this.category) url.searchParams.set('categoryId', this.category); else url.searchParams.delete('categoryId');
        history.replaceState(history.state, '', url); this.load();
      }, opts);
      window.addEventListener('message', e => this.message(e), opts);
      window.addEventListener('mediahz:authenticated', e => this.auth(e.detail?.user?.id), opts);
      const checkSession = () => {
        if (document.hidden || !this.active() || (!this.owner && document.getElementById('loginPopup')?.open)) return;
        this.reconcile();
      };
      window.addEventListener('focus', checkSession, opts);
      document.addEventListener('visibilitychange', checkSession, opts);
      window.addEventListener('userFollowChanged', e => {
        const data = e.detail; if (!data || data.userId !== this.owner) return;
        this.followUpdates.set(data.creatorId, { ...data, revision: ++this.followRevision });
        const person = this.people.get(data.creatorId); if (person) Object.assign(person, data);
        this.paintFollows(); this.changed.hidden = false;
      }, opts);
      document.getElementById('loginPopup')?.addEventListener('close', () => { if (!this.owner) this.pendingFollow = null; }, opts);
      document.addEventListener('mediahz:navigated', () => { if (!root.isConnected) this.destroy(); }, opts);
      this.load(); this.send({ type: 'trackStateRequest' });
    }
    active() { return !this.abort.signal.aborted && this.root.isConnected; }
    send(data) { document.getElementById('mediaPlayerFrame')?.contentWindow.postMessage(data, location.origin); }
    signal(extra) { return AbortSignal.any([this.abort.signal, this.accountAbort.signal, AbortSignal.timeout(10000), ...(extra ? [extra] : [])]); }
    async request(url, options = {}) {
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options,
        headers: { Accept: 'application/json', ...(this.owner ? { 'X-Home-Owner': this.owner } : {}), ...options.headers }, signal: this.signal(options.signal) });
      const result = await response.json();
      if (!response.ok || !result.success) {
        const message = url.startsWith('/api/users/')
          ? (response.status === 429 ? 'Too many requests. Please try again shortly.' : 'Unable to update follow status. Refresh Home to check the result.')
          : result.message || 'Unable to load Home.';
        throw Object.assign(new Error(message), { status: response.status });
      }
      return result.data;
    }
    clear() { this.shelves.replaceChildren(); this.creators.replaceChildren(); this.recent.replaceChildren(); this.songs.clear(); this.people.clear(); }
    async load() {
      this.readAbort?.abort(); this.readAbort = new AbortController(); const version = ++this.version, revision = this.followRevision;
      this.root.setAttribute('aria-busy', 'true'); this.retry.hidden = true; this.root.querySelector('[data-home-empty]').hidden = true;
      this.loading.hidden = this.shelves.childElementCount > 0; this.changed.hidden = true; this.status.textContent = 'Refreshing Home…';
      try {
        const data = await this.request('/api/home' + (this.category ? '?categoryId=' + encodeURIComponent(this.category) : ''), { signal: this.readAbort.signal });
        if (!this.active() || version !== this.version) return;
        if ((data.viewerId || '') !== this.owner) { this.reconcile(); return; }
        this.clear();
        const options = [el('option', '', 'All genres')]; options[0].value = '';
        for (const genre of data.categories) { const o = el('option', '', genre.name); o.value = genre.id; options.push(o); }
        this.select.replaceChildren(...options); this.select.value = this.category;
        for (const section of data.sections) this.shelves.append(this.shelf(section));
        for (const person of data.creators) {
          const update = this.followUpdates.get(person.id); this.people.set(person.id, update && update.revision > revision ? { ...person, ...update } : person);
          this.creators.append(this.person(this.people.get(person.id)));
        }
        for (const song of data.recent) { this.songs.set(song.id, song); this.recent.append(this.recentItem(song)); }
        this.root.querySelector('[data-home-creators-empty]').hidden = Boolean(data.creators.length);
        this.root.querySelector('[data-home-recent-empty]').hidden = Boolean(data.recent.length);
        this.root.querySelector('[data-home-recent-empty]').textContent = this.owner ? 'Your recently played tracks will appear here when you refresh Home.' : 'Sign in to save your listening history.';
        this.root.querySelector('[data-home-login]').hidden = Boolean(this.owner);
        this.root.querySelector('[data-home-empty]').hidden = Boolean(data.sections.length);
        this.status.textContent = ''; this.paintFollows(); this.paintPlayback(); this.paintQueues();
        window.SongEngagementV2_1?.bind(this.root);
        this.root.querySelectorAll('[data-home-rail]').forEach(rail => {
          rail.addEventListener('scroll', () => this.arrows(rail), { signal: this.readAbort.signal, passive: true }); this.arrows(rail);
        });
      } catch (error) {
        if (!this.active() || version !== this.version) return;
        if ([401, 409].includes(error.status)) { this.reconcile(); return; }
        this.status.textContent = error.status ? error.message : 'Unable to connect. Select Try again to load Home.'; this.retry.hidden = false;
      } finally { if (this.active() && version === this.version) { this.loading.hidden = true; this.root.setAttribute('aria-busy', 'false'); } }
    }
    shelf(section) {
      const shelf = el('section', 'mh-home-shelf'); shelf.dataset.homeShelf = section.id; shelf.dataset.expanded = 'false';
      const heading = el('div', 'mh-home-shelf-heading'), labels = el('div'); labels.append(el('h2', '', section.title), el('p', '', section.subtitle));
      const controls = el('div', 'mh-home-shelf-controls'); const expand = btn('mh-home-expand', 'View all', 'data-home-expand'); expand.setAttribute('aria-expanded', 'false');
      const railId = 'homeShelf-' + section.id; expand.setAttribute('aria-controls', railId); controls.append(expand);
      // Previous text arrows ('‹' / '›') depended on font baselines and sat below the circle centre.
      // for (const [direction, text] of [[-1, '‹'], [1, '›']]) { const b = btn('mh-home-arrow', text); ... }
      for (const direction of [-1, 1]) {
        const b = btn('mh-home-arrow'); b.dataset.homeScroll = direction;
        b.setAttribute('aria-label', (direction < 0 ? 'Previous: ' : 'Next: ') + section.title); b.setAttribute('aria-controls', railId);
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true'); icon.setAttribute('focusable', 'false');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', direction < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6');
        icon.append(path); b.append(icon); controls.append(b);
      }
      heading.append(labels, controls); const rail = el('div', 'mh-home-rail'); rail.id = railId; rail.dataset.homeRail = ''; rail.setAttribute('aria-label', section.title);
      section.items.forEach(song => { this.songs.set(song.id, song); rail.append(this.card(song)); }); shelf.append(heading, rail); return shelf;
    }
    cover(song) { const b = btn('mh-home-cover', null, 'data-home-cover'); b.dataset.songId = song.id; b.setAttribute('aria-label', 'Play ' + song.name); b.append(picture(song.image, '/images/chibi.gif')); return b; }
    title(song) { const n = el('a', 'mh-home-title', song.name); n.dataset.homeTitle = ''; n.href = typeof song.url === 'string' && /^\/(?!\/)/.test(song.url) ? song.url : '/home/song/' + song.id; n.title = song.name; return n; }
    card(song) {
      const c = el('article', 'mh-home-card'); c.dataset.homeCard = song.id; c.dataset.category = song.categoryId || '';
      const heading = el('h3'); heading.append(this.title(song));
      c.append(this.cover(song), heading, el('p', 'mh-home-artist', song.artist && song.artist !== 'Unknown' ? song.artist : song.creator?.name || 'Unknown'));
      const line = el('div', 'mh-home-status-line'); line.dataset.homeStatus = ''; c.append(line);
      const actions = el('div', 'mh-home-actions'), like = btn('mh-home-icon-button'); like.dataset.songLike = song.id; like.setAttribute('aria-label', 'Like'); like.setAttribute('aria-pressed', 'false');
      const heart = el('span', 'song-like-icon'); heart.setAttribute('aria-hidden', 'true'); const likes = el('span', '', count(song.likeCount)); likes.dataset.songLikes = song.id; like.append(heart, likes);
      const queue = btn('mh-home-icon-button', null, 'data-home-queue'); queue.dataset.songId = song.id; queue.setAttribute('aria-label', 'Add ' + song.name + ' to Next Up');
      const note = el('span', 'mh-home-queue-icon'); note.setAttribute('aria-hidden', 'true'); queue.append(note, el('span', '', 'Next Up')); actions.append(like, queue); c.append(actions); return c;
    }
    person(person) {
      const row = el('div', 'mh-home-person'), avatar = picture(person.avatar, '/images/auth/person-circle.svg');
      // Previous public prefix: /^\/profile\/[a-z0-9-]+$/.
      const linked = typeof person.profileUrl === 'string' && /^\/users\/profile\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(person.profileUrl);
      if (linked) { const link = el('a', 'mh-home-profile-avatar'); link.href = person.profileUrl; link.dataset.homeTitle = ''; link.setAttribute('aria-label', 'Open profile: ' + person.name); link.append(avatar); row.append(link); } else row.append(avatar);
      const info = el('div', 'mh-home-person-info'), name = el(linked ? 'a' : 'p', 'mh-home-person-name', person.name);
      if (linked) { name.href = person.profileUrl; name.dataset.homeTitle = ''; } info.append(name);
      const meta = el('p', 'mh-home-person-meta'); meta.dataset.homeFollowers = person.id; info.append(meta);
      const follow = btn('mh-home-follow', 'Follow', 'data-home-follow'); follow.dataset.creatorId = person.id; info.append(follow); row.append(info); return row;
    }
    recentItem(song) {
      const row = el('div', 'mh-home-recent'); row.append(this.cover(song)); const info = el('div', 'mh-home-recent-info');
      info.append(this.title(song), el('p', 'mh-home-artist', song.creator?.name || song.artist || 'Unknown'));
      const date = new Date(song.lastPlayedAt); if (Number.isFinite(date.getTime())) { const time = el('time', '', date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })); time.dateTime = date.toISOString(); info.append(time); }
      row.append(info); return row;
    }
    arrows(rail) {
      const shelf = rail.closest('[data-home-shelf]'); if (!shelf) return;
      shelf.querySelector('[data-home-scroll="-1"]').disabled = rail.scrollLeft <= 1;
      shelf.querySelector('[data-home-scroll="1"]').disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
    }
    click(event) {
      const b = event.target.closest('button,a'); if (!b || !this.root.contains(b)) return;
      if (b.matches('[data-home-refresh],[data-home-changed]')) { this.load(); return; }
      if (b.matches('[data-home-retry]')) { if (this.sessionUncertain) this.reconcile(); else this.load(); return; }
      if (b.matches('[data-home-login]')) { this.login(); return; }
      if (b.matches('[data-home-expand]')) {
        const shelf = b.closest('[data-home-shelf]'), expanded = shelf.dataset.expanded !== 'true'; shelf.dataset.expanded = String(expanded);
        b.setAttribute('aria-expanded', String(expanded)); b.textContent = expanded ? 'Show less' : 'View all'; this.arrows(shelf.querySelector('[data-home-rail]')); return;
      }
      if (b.matches('[data-home-scroll]')) { const rail = b.closest('[data-home-shelf]').querySelector('[data-home-rail]'); rail.scrollBy({ left: Number(b.dataset.homeScroll) * rail.clientWidth * .9, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); return; }
      if (b.matches('[data-home-follow]')) { const p = this.people.get(b.dataset.creatorId); if (p) this.follow(p.id, !p.following); return; }
      if (b.matches('[data-home-title]')) { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0 && window.navigateMediaHz) { event.preventDefault(); window.navigateMediaHz(b.getAttribute('href'), true); } return; }
      if (b.matches('[data-song-like]')) { this.changed.hidden = false; return; }
      const song = this.songs.get(b.dataset.songId); if (!song) return;
      if (b.matches('[data-home-cover]')) {
        this.selecting = song.id; clearTimeout(this.selectTimer); this.selectTimer = setTimeout(() => { this.selecting = null; if (this.active()) this.paintPlayback(); }, 10000);
        this.paintPlayback(); this.send({ type: 'trackToggle', songId: song.id, name: song.name, categoryId: song.categoryId });
      }
      if (b.matches('[data-home-queue]')) {
        if ([...this.queues.values()].some(q => q.id === song.id)) return;
        const requestId = crypto.randomUUID(); const timer = setTimeout(() => { this.queues.delete(requestId); if (this.active()) { this.paintQueues(); this.notice('No confirmation received. Please check Next Up.'); } }, 10000);
        this.queues.set(requestId, { id: song.id, timer }); this.paintQueues(); this.send({ type: 'queueAdd', requestId, song: { id: song.id, name: song.name, artist: song.artist, image: song.image, url: song.url } });
      }
    }
    paintQueues() { const ids = new Set([...this.queues.values()].map(q => q.id)); this.root.querySelectorAll('[data-home-queue]').forEach(b => { b.disabled = ids.has(b.dataset.songId); }); }
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
      this.root.querySelectorAll('[data-home-cover]').forEach(b => {
        const selected = b.dataset.songId === this.playback.songId, playing = selected && this.playback.status === 'playing';
        b.disabled = this.selecting === b.dataset.songId || selected && this.playback.status === 'loading';
        b.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + (this.songs.get(b.dataset.songId)?.name || ''));
        const card = b.closest('[data-home-card]'); if (!card) return; card.dataset.playing = String(playing);
        card.querySelector('[data-home-status]').textContent = selected ? ({ playing: 'Playing', paused: 'Paused', loading: 'Loading…', error: 'Unable to play' }[this.playback.status] || '') : '';
      });
    }
    paintFollows() {
      this.root.querySelectorAll('[data-home-follow]').forEach(b => { const p = this.people.get(b.dataset.creatorId); b.hidden = b.dataset.creatorId === this.owner; b.disabled = this.followBusy.has(b.dataset.creatorId); b.textContent = p?.following ? 'Following' : 'Follow'; b.setAttribute('aria-pressed', String(Boolean(p?.following))); b.setAttribute('aria-label', (p?.following ? 'Unfollow ' : 'Follow ') + (p?.name || '')); });
      this.root.querySelectorAll('[data-home-followers]').forEach(n => { const p = this.people.get(n.dataset.homeFollowers); n.textContent = count(p?.followers) + (Number(p?.followers) === 1 ? ' follower · ' : ' followers · ') + count(p?.tracks) + (Number(p?.tracks) === 1 ? ' track' : ' tracks'); });
    }
    async follow(id, following) {
      if (id === this.owner || this.followBusy.has(id)) return;
      if (!this.owner) { this.pendingFollow = { id, following }; this.login(); return; }
      const epoch = this.epoch; this.followBusy.add(id); this.paintFollows();
      try { const data = await this.request('/api/users/' + id + '/follow', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Follow-Owner': this.owner }, body: JSON.stringify({ following }) }); if (this.active() && epoch === this.epoch) window.UserFollowEvents?.publish(data); }
      catch (error) { if (!this.active() || epoch !== this.epoch) return; if ([401,409].includes(error.status)) this.reconcile(); else this.notice(error.message || 'Unable to confirm the result. Please refresh Home.'); }
      finally { if (this.active() && epoch === this.epoch) { this.followBusy.delete(id); this.paintFollows(); } }
    }
    auth(id) {
      const pending = this.pendingFollow; this.pendingFollow = null; this.sessionUncertain = false; this.reconciling = false;
      this.accountAbort.abort(); this.accountAbort = new AbortController(); this.epoch++; this.owner = isId(id) ? id : ''; this.root.dataset.ownerId = this.owner;
      this.clear(); this.followBusy.clear(); this.followUpdates.clear(); this.followRevision = 0; this.load();
      if (pending && this.owner && pending.id !== this.owner) this.follow(pending.id, pending.following);
    }
    async reconcile() {
      if (this.reconciling) return; this.reconciling = true; this.sessionUncertain = true; this.pendingFollow = null;
      const previousOwner = this.owner;
      this.root.setAttribute('aria-busy', 'true'); this.changed.hidden = true; this.root.querySelector('[data-home-empty]').hidden = true;
      this.accountAbort.abort(); this.accountAbort = new AbortController(); const epoch = ++this.epoch; ++this.version;
      this.clear(); this.owner = ''; this.root.dataset.ownerId = ''; this.loading.hidden = false; this.retry.hidden = true; this.status.textContent = 'Checking your account…';
      try {
        const response = await fetch('/auth/session', { cache: 'no-store', credentials: 'same-origin', signal: this.signal() }); const data = await response.json();
        if (!response.ok || !data.success || data.authenticated && !isId(data.user?.id)) throw new Error();
        if (!this.active() || epoch !== this.epoch) return;
        const user = data.authenticated ? data.user : null, slot = document.getElementById('navAuthControls');
        if (slot && typeof data.nav === 'string') { /* Escaped partial from our own session endpoint. */ slot.innerHTML = data.nav; slot.querySelectorAll('[data-avatar-fallback]').forEach(img => img.addEventListener('error', () => { img.src = img.dataset.avatarFallback; }, { once: true })); }
        else if (slot && !user) { const link = el('a', 'btn btn-outline-warning', 'Login'); link.href = '/auth/signin'; link.dataset.openLogin = ''; slot.replaceChildren(link); }
        if ((user?.id || '') === previousOwner) this.auth(user?.id);
        else { window.dispatchEvent(new CustomEvent('mediahz:authenticated', { detail: { user } })); this.send({ type: 'authChanged', userId: user?.id || null }); }
      } catch { if (!this.active() || epoch !== this.epoch) return; this.reconciling = false; this.loading.hidden = true; this.retry.hidden = false; this.root.setAttribute('aria-busy','false'); this.status.textContent = 'Unable to verify your account. Please try again.'; }
    }
    login() { if (window.MediaHzLogin) window.MediaHzLogin.open(); else location.assign('/auth/signin'); }
    notice(text) { if (window.UserFollowEvents) window.UserFollowEvents.notify(text); else this.status.textContent = text; }
    destroy() { this.abort.abort(); this.accountAbort.abort(); this.readAbort?.abort(); clearTimeout(this.selectTimer); this.queues.forEach(q => clearTimeout(q.timer)); this.queues.clear(); this.pendingFollow = null; }
  }
  window.initHomeView = function () { const root = document.querySelector('[data-home-view]'); if (current?.root === root && current.active()) return; current?.destroy(); current = root ? new Home(root) : null; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.initHomeView, { once: true }); else window.initHomeView();
})();
