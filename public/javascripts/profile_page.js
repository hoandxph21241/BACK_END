(function () {
  'use strict';
  let current;
  const isId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const button = (text, attribute) => { const n = el('button', 'profile-button', text); n.type = 'button'; if (attribute) n.setAttribute(attribute, ''); return n; };
  const count = value => Math.max(0, Number(value) || 0).toLocaleString('en-US');
  class Profile {
    constructor(root) {
      this.root = root; this.data = JSON.parse(root.dataset.profileMeta); this.profile = this.data.profile; this.owner = this.data.viewerId || '';
      this.abort = new AbortController(); this.version = 0; this.followRevision = 0; this.statsVersion = 0; this.engagementRevision = 0; this.engagementUpdates = new Map(); this.songs = new Map(); this.queues = new Map(); this.playback = {};
      this.ownRoute = root.dataset.ownRoute === 'true'; this.source = root.dataset.profileSource;
      this.q = this.data.query.q; this.sort = this.data.query.sort; this.page = this.data.page; this.limit = this.data.query.limit; this.tab = this.data.query.tab;
      this.items = root.querySelector('[data-profile-tracks]'); this.status = root.querySelector('[data-profile-status]');
      this.search = root.querySelector('[data-profile-search]'); this.select = root.querySelector('[data-profile-sort]');
      this.more = root.querySelector('[data-profile-more]'); this.retry = root.querySelector('[data-profile-retry]');
      const opts = { signal: this.abort.signal };
      root.addEventListener('click', event => this.click(event), opts);
      this.search.addEventListener('input', () => { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.load(), 250); }, opts);
      this.select.addEventListener('change', () => { this.sort = this.select.value; this.load(); }, opts);
      root.querySelector('[role=tablist]').addEventListener('keydown', event => {
        const tabs = [...root.querySelectorAll('[data-profile-tab]')], index = tabs.indexOf(document.activeElement);
        if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + 1) % tabs.length;
        tabs[next].focus(); this.changeTab(tabs[next].dataset.profileTab);
      }, opts);
      window.addEventListener('message', event => this.message(event), opts);
      window.addEventListener('mediahz:authenticated', event => this.auth(event.detail?.user?.id), opts);
      window.addEventListener('mediahz:session-stale', () => this.reconcile(), opts);
      const check = () => { if (!document.hidden && this.active() && !document.getElementById('loginPopup')?.open) this.reconcile(); };
      window.addEventListener('focus', check, opts); document.addEventListener('visibilitychange', check, opts);
      window.addEventListener('userFollowChanged', event => { const value = event.detail; if (value?.creatorId !== this.profile.id || value.userId !== this.owner) return; ++this.followRevision; this.data.following = value.following; this.data.stats.followers = value.followers; this.paintSocial(); }, opts);
      window.addEventListener('songStats', event => {
        const value = event.detail, song = this.songs.get(value?.songId); if (!song) return;
        let changed = false;
        for (const field of ['playCount', 'likeCount']) if (Number.isFinite(value[field]) && value[field] !== song[field]) { changed = true; song[field] = value[field]; }
        if (changed) {
          this.engagementUpdates.set(song.id, { revision: ++this.engagementRevision, playCount: song.playCount, likeCount: song.likeCount });
          // Row events have no complete aggregate snapshot. Read totals from the server,
          // coalescing updates rather than mixing local deltas with unrelated API snapshots.
          this.queueStats();
        }
        this.paintSocial();
      }, opts);
      window.addEventListener('mediahz:profile-updated', event => { if (event.detail?.id !== this.profile.id) return; const p = event.detail; this.profile.name = p.fullName; this.profile.avatar = p.imageAccount || this.profile.avatar; this.profile.bio = p.bio || ''; }, opts);
      document.addEventListener('mediahz:navigated', () => { if (!root.isConnected) this.destroy(); }, opts);
      document.getElementById('loginPopup')?.addEventListener('close', () => { if (!this.owner) this.intent = null; }, opts);
      this.items.querySelectorAll('[data-profile-song]').forEach(row => this.songs.set(row.dataset.profileTrack, JSON.parse(row.dataset.profileSong)));
      this.bindImages(); this.paintSocial(); window.SongEngagementV2_1?.bind(root); this.send({ type: 'trackStateRequest' });
    }
    active() { return !this.abort.signal.aborted && this.root.isConnected; }
    send(data) { document.getElementById('mediaPlayerFrame')?.contentWindow.postMessage(data, location.origin); }
    bindImages() { this.root.querySelectorAll('[data-profile-image-fallback],[data-image-fallback]').forEach(img => { if (img.dataset.profileBound) return; img.dataset.profileBound = 'true'; img.addEventListener('error', () => { img.src = img.dataset.profileImageFallback || img.dataset.imageFallback; }, { once: true, signal: this.abort.signal }); }); }
    url() { const url = new URL(location.href); for (const [key, value] of Object.entries({ tab: this.tab === 'tracks' ? '' : this.tab, q: this.q, sort: this.sort === 'newest' ? '' : this.sort })) { if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); } url.searchParams.delete('page'); history.replaceState(history.state, '', url); }
    changeTab(tab) { this.tab = tab; this.url(); this.root.querySelectorAll('[data-profile-tab]').forEach(b => { const selected = b.dataset.profileTab === tab; b.setAttribute('aria-selected', String(selected)); b.tabIndex = selected ? 0 : -1; }); for (const value of ['tracks', 'about']) this.root.querySelector('#profilePanel-' + value).hidden = value !== tab; }
    async request(url, options = {}) {
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { Accept: 'application/json', ...(this.owner ? { 'X-Profile-Owner': this.owner } : {}), ...options.headers }, signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(10000), ...(options.signal ? [options.signal] : [])]) });
      const result = await response.json(); if (!response.ok || !result.success) throw Object.assign(new Error(url.startsWith('/api/users/') ? 'Unable to confirm follow status. Please refresh Profile.' : result.message || 'Unable to load Profile.'), { status: response.status }); return result.data;
    }
    async load(append = false) {
      if (this.root.dataset.sessionState !== 'ready') { this.reconcile(); return; }
      const query = this.search.value.trim(); if (query !== this.q) append = false; this.q = query; this.url();
      clearTimeout(this.searchTimer); this.readAbort?.abort(); this.readAbort = new AbortController(); const version = ++this.version, revision = this.followRevision, engagementRevision = this.engagementRevision, page = append ? this.page + 1 : 1;
      clearTimeout(this.statsTimer); this.statsAbort?.abort(); const statsVersion = ++this.statsVersion;
      this.retry.hidden = true; this.more.hidden = true; this.items.setAttribute('aria-busy', 'true'); this.status.textContent = append ? 'Loading more tracks…' : 'Refreshing tracks…';
      try {
        const params = new URLSearchParams({ q: this.q, sort: this.sort, page, limit: this.limit }); const data = await this.request(this.source + '?' + params, { signal: this.readAbort.signal });
        if (!this.active() || version !== this.version) return;
        if ((data.viewerId || '') !== this.owner) { this.reconcile(); return; }
        const latest = { following: this.data.following, followers: this.data.stats.followers, likes: this.data.stats.likes, plays: this.data.stats.plays };
        this.data = data; if (this.followRevision > revision) { this.data.following = latest.following; this.data.stats.followers = latest.followers; }
        // A newer aggregate request takes precedence over this read's older totals.
        if (statsVersion !== this.statsVersion) { this.data.stats.likes = latest.likes; this.data.stats.plays = latest.plays; }
        // Keep confirmed row updates when an older response replaces the rows.
        if (this.engagementRevision > engagementRevision) {
          for (const song of data.items) { const update = this.engagementUpdates.get(song.id); if (update && update.revision > engagementRevision) { song.playCount = update.playCount; song.likeCount = update.likeCount; } }
        }
        if (!append) { this.items.replaceChildren(); this.songs.clear(); }
        for (const song of data.items) { if (this.songs.has(song.id)) continue; this.songs.set(song.id, song); this.items.append(this.track(song)); }
        this.page = page; this.more.hidden = !data.hasMore; this.root.querySelector('[data-profile-empty]').hidden = this.items.childElementCount > 0;
        this.root.querySelector('[data-profile-empty] h2').textContent = this.q ? 'No matching tracks' : 'No public tracks yet';
        this.status.textContent = ''; this.paintSocial(); this.paintPlayback(); this.bindImages(); window.SongEngagementV2_1?.bind(this.root, { fresh: !append });
        // A later response may contain external changes newer than the earlier summary.
        // Validate totals once more after receiving it when engagement changed concurrently.
        if (statsVersion !== this.statsVersion) this.queueStats();
      } catch (error) { if (!this.active() || version !== this.version) return; if ([401,409].includes(error.status)) this.reconcile(); else { this.status.textContent = error.status ? error.message : 'Unable to connect. Your current tracks are still here.'; this.retry.hidden = false; this.retryAppend = append; } }
      finally { if (this.active() && version === this.version) this.items.setAttribute('aria-busy', 'false'); }
    }
    queueStats() { clearTimeout(this.statsTimer); this.statsAbort?.abort(); const token = ++this.statsVersion; this.statsTimer = setTimeout(() => this.refreshStats(token), 100); }
    async refreshStats(token) {
      if (!this.active() || token !== this.statsVersion) return;
      this.statsAbort = new AbortController();
      try {
        const data = await this.request(this.source + '?limit=1', { signal: this.statsAbort.signal });
        if (!this.active() || token !== this.statsVersion) return;
        if ((data.viewerId || '') !== this.owner) { this.reconcile(); return; }
        this.data.stats.plays = data.stats.plays; this.data.stats.likes = data.stats.likes; this.paintSocial();
      } catch (error) { if (!this.active() || token !== this.statsVersion || this.statsAbort.signal.aborted) return; if ([401,409].includes(error.status)) this.reconcile(); else this.status.textContent = 'Track updated. Refresh to update statistics.'; }
    }
    track(song) {
      const row = el('article', 'profile-track'); row.dataset.profileTrack = song.id;
      const play = button(null, 'data-profile-play'); play.className = 'profile-track-cover'; play.dataset.songId = song.id; play.setAttribute('aria-label', 'Play ' + song.name);
      const image = el('img'); image.alt = ''; image.loading = 'lazy'; image.src = song.image; image.dataset.profileImageFallback = '/images/chibi.gif'; play.append(image);
      const info = el('div', 'profile-track-info'); info.append(el('p', 'profile-track-artist', song.artist && song.artist !== 'Unknown' ? song.artist : this.profile.name));
      const heading = el('h3'), link = el('a', '', song.name); link.href = typeof song.url === 'string' && /^\/(?!\/)/.test(song.url) ? song.url : '/home/song/' + song.id; link.dataset.profileNav = ''; heading.append(link); info.append(heading);
      const meta = el('div', 'profile-track-meta'); if (song.category?.name) meta.append(el('span', 'profile-genre', song.category.name));
      const date = new Date(song.uploadDate); if (song.uploadDate && Number.isFinite(date.getTime())) { const time = el('time', '', date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })); time.dateTime = date.toISOString(); meta.append(time); }
      const state = el('span'); state.dataset.profilePlaying = ''; meta.append(state); info.append(meta);
      const actions = el('div', 'profile-track-actions'), plays = el('span', 'profile-track-plays', '▷ '), total = el('span', '', count(song.playCount)); total.dataset.songPlays = song.id; plays.append(total);
      const like = button(); like.dataset.songLike = song.id; like.setAttribute('aria-label', 'Like'); like.setAttribute('aria-pressed', 'false'); const heart = el('span', 'song-like-icon'); heart.setAttribute('aria-hidden', 'true'); const likes = el('span', '', count(song.likeCount)); likes.dataset.songLikes = song.id; like.append(heart, likes);
      const queue = button(null, 'data-profile-queue'); queue.dataset.songId = song.id; queue.setAttribute('aria-label', 'Add ' + song.name + ' to Next Up'); const note = el('span', 'profile-queue-icon'); note.setAttribute('aria-hidden', 'true'); queue.append(note, el('span', '', 'Next Up')); actions.append(plays, like, queue); row.append(play, info, actions); return row;
    }
    async click(event) {
      const target = event.target.closest('button,a'); if (!target || !this.root.contains(target)) return;
      if (target.matches('[data-profile-nav]')) { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0 && window.navigateMediaHz) { event.preventDefault(); window.navigateMediaHz(target.getAttribute('href'), true); } return; }
      if (target.matches('[data-profile-tab]')) { this.changeTab(target.dataset.profileTab); return; }
      if (target.matches('[data-profile-about]')) { this.changeTab('about'); this.root.querySelector('#profileTab-about').focus(); return; }
      if (target.matches('[data-profile-copy]')) { const url = new URL(this.profile.url || location.pathname, location.origin).href; try { await navigator.clipboard.writeText(url); this.notice('Profile link copied.'); } catch { if (!this.active()) return; const input = this.root.querySelector('[data-profile-copy-output]'); input.value = url; input.hidden = false; input.focus(); input.select(); this.notice('Select and copy your profile link.'); } return; }
      if (target.matches('[data-profile-refresh]')) { this.load(); return; }
      if (target.matches('[data-profile-retry]')) { this.load(Boolean(this.retryAppend)); return; }
      if (target.matches('[data-profile-more]')) { this.load(true); return; }
      if (target.matches('[data-profile-follow],[data-profile-message]')) {
        if (this.root.dataset.sessionState !== 'ready') return;
        if (!this.owner) { this.intent = target.matches('[data-profile-follow]') ? 'follow' : 'message'; this.login(); return; }
        if (target.matches('[data-profile-follow]')) this.follow(!this.data.following); else this.compose(); return;
      }
      const song = this.songs.get(target.dataset.songId); if (!song) return;
      if (target.matches('[data-profile-play]')) { this.selecting = song.id; clearTimeout(this.selectTimer); this.selectTimer = setTimeout(() => { this.selecting = null; if (this.active()) this.paintPlayback(); }, 10000); this.paintPlayback(); this.send({ type: 'trackToggle', songId: song.id, name: song.name, categoryId: song.categoryId }); }
      if (target.matches('[data-profile-queue]')) {
        if ([...this.queues.values()].some(q => q.id === song.id)) return;
        const requestId = crypto.randomUUID(), timer = setTimeout(() => { this.queues.delete(requestId); if (this.active()) { this.paintQueues(); this.notice('No confirmation received. Please check Next Up.'); } }, 10000);
        this.queues.set(requestId, { id: song.id, timer }); this.paintQueues(); this.send({ type: 'queueAdd', requestId, song });
      }
    }
    paintQueues() { const pending = new Set([...this.queues.values()].map(q => q.id)); this.root.querySelectorAll('[data-profile-queue]').forEach(b => { b.disabled = pending.has(b.dataset.songId); }); }
    paintSocial() { this.root.querySelectorAll('[data-profile-stat]').forEach(n => { n.textContent = count(this.data.stats[n.dataset.profileStat]); }); const b = this.root.querySelector('[data-profile-follow]'); if (b) { b.disabled = Boolean(this.followBusy) || this.root.dataset.sessionState !== 'ready'; b.textContent = this.data.following ? 'Following' : 'Follow'; b.setAttribute('aria-pressed', String(this.data.following)); b.setAttribute('aria-label', (this.data.following ? 'Unfollow ' : 'Follow ') + this.profile.name); } }
    async follow(following) { if (!this.owner || this.data.isSelf || this.followBusy) return; this.followBusy = true; this.paintSocial(); try { const data = await this.request('/api/users/' + this.profile.id + '/follow', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Follow-Owner': this.owner }, body: JSON.stringify({ following }) }); if (this.active()) window.UserFollowEvents?.publish(data); } catch (error) { if (!this.active()) return; if ([401,409].includes(error.status)) this.reconcile(); else this.notice(error.message); } finally { if (this.active()) { this.followBusy = false; this.paintSocial(); } } }
    compose() { if (!this.data.isSelf && this.owner) window.MediaHzMail?.composeTo({ id: this.profile.id, name: this.profile.name, avatar: this.profile.avatar, tag: this.profile.tag }); }
    message(event) {
      if (event.origin !== location.origin || event.source !== document.getElementById('mediaPlayerFrame')?.contentWindow) return;
      const data = event.data; if (data?.type === 'queueAdded') { const q = this.queues.get(data.requestId); if (!q || q.id !== data.songId) return; clearTimeout(q.timer); this.queues.delete(data.requestId); this.paintQueues(); this.notice(data.success ? 'Added to Next Up.' : 'Unable to add this track.'); }
      if (data?.type !== 'trackPlayback') return; this.playback = data;
      if ((data.songId === this.selecting && ['playing','paused','ended'].includes(data.status)) || data.status === 'error') { this.selecting = null; clearTimeout(this.selectTimer); } this.paintPlayback();
    }
    paintPlayback() { this.root.querySelectorAll('[data-profile-play]').forEach(b => { const selected = b.dataset.songId === this.playback.songId, playing = selected && this.playback.status === 'playing'; b.disabled = this.selecting === b.dataset.songId || selected && this.playback.status === 'loading'; b.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + (this.songs.get(b.dataset.songId)?.name || '')); const row = b.closest('[data-profile-track]'); row.dataset.playing = String(playing); row.querySelector('[data-profile-playing]').textContent = selected ? ({ playing:'Playing', paused:'Paused', loading:'Loading…', error:'Unable to play' }[this.playback.status] || '') : ''; }); }
    async auth(id) {
      const next = isId(id) ? id : ''; if (next === this.owner || !this.active()) return;
      const intent = this.intent, subject = this.profile.id, path = this.ownRoute ? next ? '/users/profile' : this.profile.url || '/discover' : this.profile.url;
      this.root.dataset.editInvalid = 'true'; this.root.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); this.destroy(); this.root.replaceChildren(el('p', 'profile-load-status', 'Loading profile…'));
      if (!window.navigateMediaHz) { location.assign(path); return; }
      await window.navigateMediaHz(path + location.search, true, { refresh: true });
      if (current?.active() && current.profile.id === subject && current.owner === next && next && !current.data.isSelf) { if (intent === 'follow') current.follow(true); if (intent === 'message') current.compose(); }
    }
    async reconcile() {
      if (this.checking || !this.active()) return; this.checking = true; this.root.dataset.sessionState = 'checking'; this.paintSocial();
      try {
        const response = await fetch('/auth/session', { credentials:'same-origin',cache:'no-store',signal:AbortSignal.any([this.abort.signal,AbortSignal.timeout(10000)]) }), data = await response.json();
        if (!response.ok || !data.success || data.authenticated && !isId(data.user?.id)) throw new Error(); if (!this.active()) return;
        const user = data.authenticated ? data.user : null, next = user?.id || '';
        if (next !== this.owner) { const slot = document.getElementById('navAuthControls'); if (slot && typeof data.nav === 'string') slot.innerHTML = data.nav; else if (slot && !user) { const link = el('a', 'btn btn-outline-warning', 'Login'); link.href = '/auth/signin'; link.dataset.openLogin = ''; slot.replaceChildren(link); } window.dispatchEvent(new CustomEvent('mediahz:authenticated',{detail:{user}})); this.send({type:'authChanged',userId:next||null}); }
        else { this.root.dataset.sessionState = 'ready'; this.paintSocial(); }
      } catch { if (this.active()) { this.root.dataset.sessionState = 'error'; this.status.textContent = 'Unable to verify your account. Select Try again.'; this.retry.hidden = false; } }
      finally { this.checking = false; }
    }
    login() { if (window.MediaHzLogin) window.MediaHzLogin.open(); else location.assign('/auth/signin'); }
    notice(message) { if (window.UserFollowEvents) window.UserFollowEvents.notify(message); else this.status.textContent = message; }
    destroy() { this.abort.abort(); this.readAbort?.abort(); this.statsAbort?.abort(); clearTimeout(this.statsTimer); clearTimeout(this.searchTimer); clearTimeout(this.selectTimer); this.queues.forEach(q=>clearTimeout(q.timer)); this.queues.clear(); this.intent = null; }
  }
  window.initProfilePage = function () { const root = document.querySelector('[data-profile-screen]'); if (current?.root === root && current.active()) return; current?.destroy(); current = root ? new Profile(root) : null; };
  document.addEventListener('click', event => { const link = event.target.closest('[data-profile-missing] [data-profile-nav]'); if (link && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && window.navigateMediaHz) { event.preventDefault(); window.navigateMediaHz(link.getAttribute('href'), true); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.initProfilePage, { once:true }); else window.initProfilePage();
})();
