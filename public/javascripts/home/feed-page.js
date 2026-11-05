(function () {
  'use strict';
  let current;
  const isId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
  const count = value => Math.max(0, Number(value) || 0).toLocaleString('vi-VN');
  const clock = value => { const n = Math.max(0, Math.floor(Number(value) || 0)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
  const node = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text != null) n.textContent = text; return n; };
  const icon = name => { const n = node('span', 'mh-feed-icon mh-feed-icon-' + name); n.setAttribute('aria-hidden', 'true'); return n; };
  const button = (className, text, attribute) => { const n = node('button', className, text); n.type = 'button'; if (attribute) n.setAttribute(attribute, ''); return n; };
  function picture(source, className, fallback) {
    const n = node('img', className); n.alt = ''; n.loading = 'lazy'; n.decoding = 'async';
    n.src = typeof source === 'string' && (/^https?:\/\//i.test(source) || /^\/(?!\/)/.test(source)) ? source : fallback;
    n.addEventListener('error', () => { n.src = fallback; }, { once: true }); return n;
  }
  class Feed {
    constructor(root) {
      this.root = root; this.abort = new AbortController(); this.accountAbort = new AbortController();
      this.list = root.querySelector('[data-feed-list]'); this.loading = root.querySelector('[data-feed-loading]');
      this.status = root.querySelector('[data-feed-status]'); this.more = root.querySelector('[data-feed-more]');
      this.retry = root.querySelector('[data-feed-retry]'); this.empty = root.querySelector('[data-feed-empty]');
      this.changed = root.querySelector('[data-feed-changed]'); this.creators = root.querySelector('[data-feed-creators]');
      this.creatorStatus = root.querySelector('[data-feed-creators-status]'); this.creatorRetry = root.querySelector('[data-feed-creators-retry]');
      this.owner = isId(root.dataset.ownerId) ? root.dataset.ownerId : '';
      const query = new URLSearchParams(location.search);
      this.mode = ['following', 'discover'].includes(query.get('mode')) ? query.get('mode') : this.owner ? 'following' : 'discover';
      this.sort = query.get('sort') === 'popular' && this.mode === 'discover' ? 'popular' : 'newest';
      this.category = [...root.querySelector('[data-feed-category]').options].some(o => o.value === query.get('categoryId')) ? query.get('categoryId') : '';
      this.entries = new Map(); this.people = new Map(); this.followBusy = new Set(); this.queuePending = new Map();
      this.followUpdates = new Map(); this.followRevision = 0;
      this.version = 0; this.epoch = 0; this.playback = {}; this.cursor = null; this.visible = new Set();
      this.waveCache = new WeakMap(); this.motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
      this.playbackAt = performance.now(); this.animation = null;
      this.visibility = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { this.visible.add(entry.target); this.draw(entry.target); }
        else { this.visible.delete(entry.target); this.waveCache.delete(entry.target); }
        this.syncAnimation();
      }), { rootMargin: '100px' });
      // Previous: redraw/rebuild every bar whenever the root resized.
      // this.resize = new ResizeObserver(() => this.visible.forEach(wave => this.draw(wave)));
      this.resize = new ResizeObserver(() => {
        this.visible.forEach(wave => { this.waveCache.delete(wave); this.draw(wave); }); this.syncAnimation();
      });
      this.resize.observe(root);
      const options = { signal: this.abort.signal };
      root.addEventListener('click', event => this.click(event), options);
      root.addEventListener('change', event => {
        if (event.target.matches('[data-feed-sort]')) this.sort = event.target.value;
        else if (event.target.matches('[data-feed-category]')) this.category = event.target.value;
        else return;
        this.load();
      }, options);
      root.addEventListener('keydown', event => this.keydown(event), options);
      window.addEventListener('message', event => this.message(event), options);
      window.addEventListener('userFollowChanged', event => this.followChanged(event.detail), options);
      window.addEventListener('mediahz:authenticated', event => this.authenticated(event.detail?.user?.id), options);
      this.motionPreference.addEventListener('change', () => { this.paintPlayback(); }, options);
      document.addEventListener('visibilitychange', () => {
        this.stopAnimation();
        if (!document.hidden) { this.awaitingState = true; this.send({ type: 'trackStateRequest' }); }
      }, options);
      document.getElementById('loginPopup')?.addEventListener('close', () => { if (!this.owner) this.pendingFollow = null; }, options);
      document.addEventListener('mediahz:navigated', () => { if (!root.isConnected) this.destroy(); }, options);
      this.paintFilters(); this.load(); this.loadCreators(); this.send({ type: 'trackStateRequest' });
    }
    send(data) { document.getElementById('mediaPlayerFrame')?.contentWindow.postMessage(data, location.origin); }
    active() { return !this.abort.signal.aborted && this.root.isConnected; }
    signal(extra) { return AbortSignal.any([this.abort.signal, this.accountAbort.signal, AbortSignal.timeout(10000), ...(extra ? [extra] : [])]); }
    async request(url, options = {}) {
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options,
        headers: { Accept: 'application/json', ...(this.owner ? { 'X-Feed-Owner': this.owner } : {}), ...options.headers }, signal: this.signal(options.signal) });
      const result = await response.json();
      if (!response.ok || !result.success) throw Object.assign(new Error(result.message || 'Không thể tải Feed.'), { status: response.status });
      return result.data;
    }
    paintFilters() {
      this.root.querySelectorAll('[data-feed-tab]').forEach(tab => {
        const selected = tab.dataset.feedTab === this.mode; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
      });
      this.root.querySelector('#feedPanel').setAttribute('aria-labelledby', this.mode === 'following' ? 'feedFollowingTab' : 'feedDiscoverTab');
      this.root.querySelector('[data-feed-sort-label]').hidden = this.mode === 'following';
      this.root.querySelector('[data-feed-sort]').value = this.sort;
      this.root.querySelector('[data-feed-category]').value = this.category;
      const url = new URL(location.href); url.searchParams.set('mode', this.mode);
      if (this.mode === 'discover' && this.sort === 'popular') url.searchParams.set('sort', this.sort); else url.searchParams.delete('sort');
      if (this.category) url.searchParams.set('categoryId', this.category); else url.searchParams.delete('categoryId');
      history.replaceState(history.state, '', url);
    }
    resetEntries() {
      this.stopAnimation(); this.waveCache = new WeakMap();
      this.visibility.disconnect(); this.visible.clear(); this.entries.clear(); this.list.replaceChildren();
    }
    showEmpty(title, text, login = false, discover = false) {
      this.empty.hidden = false; this.empty.querySelector('[data-feed-empty-title]').textContent = title;
      this.empty.querySelector('[data-feed-empty-text]').textContent = text;
      this.empty.querySelector('[data-feed-login]').hidden = !login; this.empty.querySelector('[data-feed-discover]').hidden = !discover;
    }
    async load(append = false) {
      if (append && (this.busy || !this.cursor)) return;
      this.readAbort?.abort(); this.readAbort = new AbortController(); const version = ++this.version, followRevision = this.followRevision;
      this.busy = true; this.failedAppend = append; this.paintFilters(); this.empty.hidden = true; this.retry.hidden = true;
      this.more.hidden = true; this.more.disabled = true; this.root.querySelector('[data-feed-end]').hidden = true;
      this.root.setAttribute('aria-busy', 'true'); this.status.textContent = append ? 'Đang tải thêm bài hát…' : 'Đang cập nhật Feed…';
      this.loading.hidden = this.entries.size > 0;
      if (!append) this.changed.hidden = true;
      try {
        if (this.mode === 'following' && !this.owner) {
          this.resetEntries(); this.cursor = null; this.status.textContent = '';
          this.showEmpty('Âm nhạc từ người bạn theo dõi', 'Đăng nhập để nghe những bài hát mới từ người bạn yêu thích.', true, true); return;
        }
        const query = new URLSearchParams({ mode: this.mode, sort: this.sort, categoryId: this.category, limit: '12' });
        if (append) query.set('cursor', this.cursor);
        const data = await this.request('/api/feed/items?' + query, { signal: this.readAbort.signal });
        if (!this.active() || version !== this.version) return;
        if ((data.viewerId || '') !== this.owner) { this.reconcileSession(); return; }
        if (!append) this.resetEntries();
        const fragment = document.createDocumentFragment();
        for (const song of data.items) {
          if (!isId(song.id) || this.entries.has(song.id)) continue;
          // Previous: this.people.set(song.creator.id, { ...song.creator });
          if (song.creator) this.mergePerson(song.creator, followRevision);
          const entry = this.entry(song); this.entries.set(song.id, { song, entry }); fragment.append(entry);
        }
        this.list.append(fragment); this.cursor = data.nextCursor;
        this.list.querySelectorAll('[data-feed-waveform]').forEach(wave => this.visibility.observe(wave));
        this.paintFollows(); this.paintPlayback(); window.SongEngagementV2_1?.bind(this.list);
        this.status.textContent = '';
        if (!this.entries.size) {
          if (this.mode === 'following') this.showEmpty('Chưa có bài hát mới', this.category ? 'Chưa có bài thuộc thể loại này từ người bạn theo dõi.' : 'Theo dõi người đăng để các bản nhạc mới xuất hiện tại đây.', false, true);
          else this.showEmpty('Chưa có bài hát', 'Thử một thể loại khác hoặc làm mới Feed.');
        }
        this.more.hidden = !this.cursor; this.root.querySelector('[data-feed-end]').hidden = Boolean(this.cursor) || !this.entries.size;
      } catch (error) {
        if (!this.active() || version !== this.version) return;
        // Previous: 401 immediately assumed logout; 409 retained the old account's rows.
        if (error.status === 401 || error.status === 409) { this.reconcileSession(); return; }
        this.status.textContent = error.status ? error.message : 'Không thể kết nối. Các bài đang hiển thị vẫn được giữ lại.'; this.retry.hidden = false;
      } finally {
        if (this.active() && version === this.version) { this.busy = false; this.loading.hidden = true; this.more.disabled = false; this.root.setAttribute('aria-busy', 'false'); }
      }
    }
    async loadCreators() {
      const epoch = this.epoch, followRevision = this.followRevision;
      this.creatorRetry.hidden = true; this.creatorStatus.textContent = 'Đang tìm người đăng…';
      try {
        const data = await this.request('/api/feed/creators');
        if (!this.active() || epoch !== this.epoch) return;
        if ((data.viewerId || '') !== this.owner) { this.reconcileSession(); return; }
        const fragment = document.createDocumentFragment();
        data.items.forEach(person => {
          // Previous: this.people.set(person.id, person);
          person = this.mergePerson(person, followRevision);
          const row = node('div', 'mh-feed-creator'); row.append(picture(person.avatar, '', '/images/auth/person-circle.svg'));
          const info = node('div', 'mh-feed-creator-info'); info.append(node('p', 'mh-feed-creator-name', person.name));
          const meta = node('p', 'mh-feed-creator-meta'); meta.dataset.feedCreatorMeta = person.id; meta.dataset.tracks = person.tracks; info.append(meta);
          info.append(this.followButton(person)); row.append(info); fragment.append(row);
        });
        this.creators.replaceChildren(fragment); this.paintFollows();
        this.creatorStatus.textContent = data.items.length ? '' : 'Bạn đã theo dõi những người đăng nổi bật. Hãy khám phá thêm trong Feed.';
      } catch (error) {
        if (!this.active() || epoch !== this.epoch) return;
        if (error.status === 409) { this.reconcileSession(); return; }
        this.creatorStatus.textContent = 'Chưa tải được người đăng.'; this.creatorRetry.hidden = false;
      }
    }
    mergePerson(person, startedRevision) {
      const update = this.followUpdates.get(person.id);
      const merged = update && update.revision > startedRevision ? { ...person, following: update.following, followers: update.followers } : { ...person };
      this.people.set(person.id, merged); return merged;
    }
    followButton(person) { const b = button('mh-feed-follow', 'Follow', 'data-feed-follow'); b.dataset.creatorId = person.id; return b; }
    entry(song) {
      const entry = node('article', 'mh-feed-entry'); entry.dataset.feedEntry = song.id;
      if (song.creator) entry.dataset.creatorId = song.creator.id;
      const byline = node('div', 'mh-feed-byline');
      const avatar = picture(song.creator?.avatar, 'mh-feed-avatar', '/images/auth/person-circle.svg'), author = node('span', 'mh-feed-author', song.creator?.name || 'Người đăng không còn khả dụng');
      // Previous public prefix: /^\/profile\/[a-z0-9-]+$/.
      if (typeof song.creator?.profileUrl === 'string' && /^\/users\/profile\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(song.creator.profileUrl)) { const link = node('a', 'mh-feed-profile-link'); link.href = song.creator.profileUrl; link.dataset.feedLink = ''; link.append(avatar, author); byline.append(link); } else byline.append(avatar, author);
      const date = new Date(song.publishedAt); const validDate = song.publishedAt && Number.isFinite(date.getTime());
      const time = node('time', 'mh-feed-date', validDate ? date.toLocaleDateString('vi-VN') : ''); if (validDate) time.dateTime = date.toISOString(); byline.append(time);
      if (song.creator) byline.append(this.followButton(song.creator)); entry.append(byline);
      const body = node('div', 'mh-feed-body'), art = node('div', 'mh-feed-art');
      art.append(picture(song.image, 'mh-feed-cover', '/images/chibi.gif'));
      // Previous play overlay on the cover, retained for reference:
      // const play = button('mh-feed-play', null, 'data-feed-play'); play.setAttribute('aria-label', 'Phát ' + song.name); play.append(icon('play')); art.append(play);
      const content = node('div', 'mh-feed-content'), heading = node('h2');
      const title = node('a', 'mh-feed-title', song.name); title.href = typeof song.url === 'string' && /^\/(?!\/)/.test(song.url) ? song.url : '/home/song/' + song.id; title.dataset.feedLink = ''; title.title = song.name;
      heading.append(title); content.append(heading, node('p', 'mh-feed-artist', song.artist || 'Unknown'));
      // Previous DTO lookup: song.category?.nameCategory || song.categoryName || song.categoryId?.nameCategory;
      const genre = song.category?.name || song.categoryName || song.categoryId?.nameCategory;
      if (genre) content.append(node('span', 'mh-feed-genre', genre));
      if (song.waveform?.peaks?.length === 480) {
        const wave = node('div', 'mh-feed-wave'); wave.dataset.feedWaveform = song.id; wave.setAttribute('role', 'slider'); wave.tabIndex = 0;
        wave.setAttribute('aria-label', 'Tua ' + song.name); wave.setAttribute('aria-valuemin', '0'); wave.setAttribute('aria-valuemax', String(Math.round(song.waveform.duration))); wave.setAttribute('aria-valuenow', '0'); wave.append(node('canvas')); content.append(wave);
      } else content.append(node('div', 'mh-feed-wave-empty', 'Waveform chưa có sẵn'));
      const duration = node('div', 'mh-feed-duration'); duration.append(node('span', 'mh-feed-time', '0:00'), node('span', '', clock(song.waveform?.duration || song.duration))); content.append(duration);
      body.append(art, content); entry.append(body);
      const actions = node('div', 'mh-feed-actions');
      const like = button('mh-feed-action', null); like.dataset.songLike = song.id; like.setAttribute('aria-pressed', 'false'); like.setAttribute('aria-label', 'Yêu thích');
      const heart = node('span', 'song-like-icon'); heart.setAttribute('aria-hidden', 'true');
      const likes = node('span', '', count(song.likeCount)); likes.dataset.songLikes = song.id; like.append(heart, likes); actions.append(like);
      const queue = button('mh-feed-action', null, 'data-feed-queue'); queue.append(icon('music'), node('span', '', 'Next Up')); queue.setAttribute('aria-label', 'Thêm ' + song.name + ' vào hàng đợi'); actions.append(queue);
      if (song.creator) { const message = button('mh-feed-action', null, 'data-feed-message'); message.dataset.creatorId = song.creator.id; message.append(icon('message'), node('span', '', 'Message')); actions.append(message); }
      const metrics = node('span', 'mh-feed-metrics'); const plays = node('span', '', count(song.playCount)); plays.dataset.songPlays = song.id; metrics.append(icon('play'), plays); metrics.title = 'Lượt nghe'; actions.append(metrics);
      entry.append(actions); return entry;
    }
    paintFollows() {
      this.root.querySelectorAll('[data-feed-follow]').forEach(b => {
        const person = this.people.get(b.dataset.creatorId), self = this.owner === b.dataset.creatorId;
        b.hidden = self; b.textContent = person?.following ? 'Following' : 'Follow'; b.disabled = this.followBusy.has(b.dataset.creatorId);
        b.setAttribute('aria-pressed', String(Boolean(person?.following))); b.setAttribute('aria-busy', String(b.disabled));
        b.setAttribute('aria-label', (person?.following ? 'Bỏ theo dõi ' : 'Theo dõi ') + (person?.name || ''));
      });
      this.root.querySelectorAll('[data-feed-message]').forEach(b => { b.hidden = this.owner === b.dataset.creatorId; });
      this.root.querySelectorAll('[data-feed-creator-meta]').forEach(meta => {
        meta.textContent = count(meta.dataset.tracks) + ' bài hát · ' + count(this.people.get(meta.dataset.feedCreatorMeta)?.followers) + ' followers';
      });
    }
    async setFollowing(id, following) {
      if (this.followBusy.has(id) || id === this.owner || !this.people.has(id)) return;
      if (!this.owner) { this.pendingFollow = { id, following }; this.login(); return; }
      const epoch = this.epoch; this.followBusy.add(id); this.paintFollows();
      try {
        const data = await this.request('/api/users/' + encodeURIComponent(id) + '/follow', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Follow-Owner': this.owner }, body: JSON.stringify({ following }) });
        if (!this.active() || epoch !== this.epoch) return;
        window.UserFollowEvents?.publish(data);
      } catch (error) {
        if (!this.active() || epoch !== this.epoch) return;
        this.notice(error.status ? error.message : 'Chưa xác nhận kết quả theo dõi. Hãy làm mới Feed để kiểm tra.');
        if (error.status === 401) { this.authenticated(null); this.pendingFollow = { id, following }; this.login(); }
        else if (error.status === 409) this.reconcileSession();
      } finally { if (this.active() && epoch === this.epoch) { this.followBusy.delete(id); this.paintFollows(); } }
    }
    followChanged(data) {
      if (!data || data.userId !== this.owner) return;
      this.followUpdates.set(data.creatorId, { revision: ++this.followRevision, following: data.following, followers: data.followers });
      const person = this.people.get(data.creatorId);
      if (person) { person.following = data.following; person.followers = data.followers; }
      this.paintFollows(); if (this.mode === 'following') this.changed.hidden = false;
    }
    authenticated(id) {
      const pending = this.pendingFollow; this.pendingFollow = null;
      this.reconciling = false; this.sessionUncertain = false;
      this.accountAbort.abort(); this.accountAbort = new AbortController(); this.epoch++;
      this.owner = isId(id) ? id : ''; this.people.clear(); this.followBusy.clear(); this.followUpdates.clear(); this.followRevision = 0;
      this.resetEntries(); this.creators.replaceChildren(); this.changed.hidden = true;
      this.load(); this.loadCreators();
      if (pending && this.owner && this.owner !== pending.id) {
        // Capture the explicit login intent independently of the newly loaded stream.
        this.people.set(pending.id, { id: pending.id, name: '', following: false }); this.setFollowing(pending.id, pending.following);
      }
    }
    async reconcileSession() {
      if (this.reconciling) return;
      this.reconciling = true; this.sessionUncertain = true; this.pendingFollow = null;
      this.accountAbort.abort(); this.accountAbort = new AbortController();
      const epoch = ++this.epoch; ++this.version;
      this.owner = ''; this.people.clear(); this.followBusy.clear(); this.followUpdates.clear(); this.followRevision = 0; this.resetEntries(); this.cursor = null;
      this.creators.replaceChildren(); this.changed.hidden = true; this.empty.hidden = true; this.retry.hidden = true;
      this.more.hidden = true; this.loading.hidden = false; this.busy = true;
      this.root.setAttribute('aria-busy', 'true'); this.status.textContent = 'Đang xác nhận tài khoản hiện tại…';
      try {
        const response = await fetch('/auth/session', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal: this.signal() });
        const data = await response.json();
        if (!response.ok || !data.success || (data.authenticated && !isId(data.user?.id))) throw new Error();
        if (!this.active() || epoch !== this.epoch) return;
        const user = data.authenticated ? data.user : null;
        const slot = document.getElementById('navAuthControls');
        if (slot && typeof data.nav === 'string') {
          // Escaped account markup supplied by our own session endpoint, as in login_popup.js.
          slot.innerHTML = data.nav;
          slot.querySelectorAll('[data-avatar-fallback]').forEach(img => img.addEventListener('error', () => { img.src = img.dataset.avatarFallback; }, { once: true }));
        } else if (slot && !user) {
          const link = node('a', 'btn btn-outline-warning', 'Login'); link.href = '/auth/signin'; link.dataset.openLogin = ''; slot.replaceChildren(link);
        }
        window.dispatchEvent(new CustomEvent('mediahz:authenticated', { detail: { user } }));
        this.send({ type: 'authChanged', userId: user?.id || null });
      } catch {
        if (!this.active() || epoch !== this.epoch) return;
        this.reconciling = false; this.busy = false; this.loading.hidden = true; this.retry.hidden = false;
        this.root.setAttribute('aria-busy', 'false'); this.status.textContent = 'Chưa xác nhận được phiên đăng nhập. Bấm Thử lại để kết nối lại.';
      }
    }
    notice(message) { if (window.UserFollowEvents) window.UserFollowEvents.notify(message); else this.status.textContent = message; }
    login() { if (window.MediaHzLogin) window.MediaHzLogin.open(); else location.assign('/auth/signin'); }
    click(event) {
      const target = event.target.closest('button,a,[data-feed-waveform]'); if (!target || !this.root.contains(target)) return;
      if (target.matches('[data-feed-tab]')) { this.mode = target.dataset.feedTab; if (this.mode === 'following') this.sort = 'newest'; this.load(); return; }
      if (target.matches('[data-feed-refresh],[data-feed-changed]')) { this.load(); this.loadCreators(); return; }
      if (target.matches('[data-feed-more]')) { this.load(true); return; }
      if (target.matches('[data-feed-retry]')) { if (this.sessionUncertain) this.reconcileSession(); else this.load(this.failedAppend); return; }
      if (target.matches('[data-feed-creators-retry]')) { this.loadCreators(); return; }
      if (target.matches('[data-feed-discover]')) { this.mode = 'discover'; this.load(); return; }
      if (target.matches('[data-feed-login]')) { this.login(); return; }
      if (target.matches('[data-feed-follow]')) { this.setFollowing(target.dataset.creatorId, !this.people.get(target.dataset.creatorId)?.following); return; }
      if (target.matches('[data-feed-message]')) {
        const person = this.people.get(target.dataset.creatorId); if (person && window.MediaHzMail) window.MediaHzMail.composeTo(person);
        else this.notice('Không thể mở hộp thư. Vui lòng tải lại trang.'); return;
      }
      if (target.matches('[data-feed-link]')) {
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0 && window.navigateMediaHz) { event.preventDefault(); window.navigateMediaHz(target.getAttribute('href'), true); } return;
      }
      const item = this.entries.get(target.closest('[data-feed-entry]')?.dataset.feedEntry); if (!item) return;
      // Previous cover overlay action:
      // if (target.matches('[data-feed-play]')) { this.pendingSeek = null; this.toggle(item.song); }
      if (target.matches('[data-feed-queue]')) this.enqueue(item.song, target);
      if (target.matches('[data-feed-waveform]')) {
        const bounds = target.getBoundingClientRect(), ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
        if (this.playback.songId === item.song.id) this.send({ type: 'trackSeek', songId: item.song.id, seconds: ratio * (this.playback.duration || item.song.waveform.duration) });
        else { this.pendingSeek = { id: item.song.id, ratio }; this.toggle(item.song); }
      }
    }
    keydown(event) {
      const tab = event.target.closest('[data-feed-tab]');
      if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); const mode = event.key === 'Home' ? 'following' : event.key === 'End' ? 'discover' : this.mode === 'following' ? 'discover' : 'following';
        const next = this.root.querySelector('[data-feed-tab="' + mode + '"]'); next.click(); next.focus(); return;
      }
      const wave = event.target.closest('[data-feed-waveform]'), item = this.entries.get(wave?.dataset.feedWaveform);
      if (!item || !['ArrowLeft', 'ArrowRight', 'Home', 'End', ' ', 'Enter'].includes(event.key)) return;
      // Keep a handled waveform key from reaching Home's document-level player shortcuts.
      event.preventDefault(); event.stopPropagation();
      if (event.key === ' ' || event.key === 'Enter') { this.toggle(item.song); return; }
      const duration = item.song.waveform.duration;
      const seconds = event.key === 'Home' ? 0 : event.key === 'End' ? duration : Math.max(0, Math.min(duration, (this.playback.songId === item.song.id ? this.playback.currentTime : 0) + (event.key === 'ArrowLeft' ? -5 : 5)));
      if (this.playback.songId === item.song.id) this.send({ type: 'trackSeek', songId: item.song.id, seconds });
      else { this.pendingSeek = { id: item.song.id, ratio: seconds / duration }; this.toggle(item.song); }
    }
    toggle(song) { this.send({ type: 'trackToggle', songId: song.id, name: song.name, categoryId: typeof song.categoryId === 'string' ? song.categoryId : song.categoryId?._id }); }
    enqueue(song, target) {
      if (target.disabled) return;
      const requestId = crypto.randomUUID(); target.disabled = true;
      const timer = setTimeout(() => { this.queuePending.delete(requestId); if (this.active()) { target.disabled = false; this.notice('Chưa nhận được xác nhận từ player. Hãy kiểm tra Next Up.'); } }, 10000);
      this.queuePending.set(requestId, { id: song.id, target, timer });
      this.send({ type: 'queueAdd', requestId, song: { id: song.id, name: song.name, artist: song.artist, image: song.image, url: song.url } });
    }
    message(event) {
      if (event.origin !== location.origin || event.source !== document.getElementById('mediaPlayerFrame')?.contentWindow) return;
      const data = event.data;
      if (data?.type === 'queueAdded') {
        const pending = this.queuePending.get(data.requestId); if (!pending || pending.id !== data.songId) return;
        clearTimeout(pending.timer); this.queuePending.delete(data.requestId); pending.target.disabled = false;
        this.notice(data.success ? 'Đã thêm vào Next Up.' : 'Không thể thêm bài hát vào Next Up.');
      }
      if (data?.type !== 'trackPlayback') return;
      if (data.songId !== this.playback.songId || data.currentTime !== this.playback.currentTime || data.status !== this.playback.status
          || data.advancing !== this.playback.advancing || data.playbackRate !== this.playback.playbackRate || this.awaitingState) this.playbackAt = performance.now();
      this.awaitingState = false;
      this.playback = data;
      if (this.pendingSeek?.id === data.songId && data.duration > 0 && ['playing', 'paused', 'ready'].includes(data.status)) {
        const seek = this.pendingSeek; this.pendingSeek = null; this.send({ type: 'trackSeek', songId: seek.id, seconds: seek.ratio * data.duration });
      }
      this.paintPlayback();
    }
    paintPlayback() {
      this.entries.forEach(({ song, entry }) => {
        const selected = this.playback.songId === song.id, playing = selected && this.playback.status === 'playing';
        entry.dataset.playing = String(playing);
        // Previous cover overlay synchronization:
        // const play = entry.querySelector('[data-feed-play]');
        // play.setAttribute('aria-label', (playing ? 'Tạm dừng ' : 'Phát ') + song.name); play.setAttribute('aria-busy', String(selected && this.playback.status === 'loading'));
        // play.firstChild.className = 'mh-feed-icon mh-feed-icon-' + (playing ? 'pause' : 'play');
        // Previous: selected ? Number(this.playback.currentTime) || 0 : 0;
        this.paintTime(song, entry, selected ? this.playbackTime(song) : 0);
      });
      this.visible.forEach(wave => this.draw(wave));
      this.syncAnimation();
    }
    paintTime(song, entry, seconds) {
      const label = entry.querySelector('.mh-feed-time'), text = clock(seconds);
      if (label.textContent !== text) label.textContent = text;
      const wave = entry.querySelector('[data-feed-waveform]'); if (!wave) return;
      const duration = this.playback.songId === song.id && this.playback.duration > 0 ? this.playback.duration : song.waveform.duration;
      for (const [key, value] of [['aria-valuemax', String(Math.round(duration))], ['aria-valuenow', String(Math.round(seconds))], ['aria-valuetext', text + ' / ' + clock(duration)]]) {
        if (wave.getAttribute(key) !== value) wave.setAttribute(key, value);
      }
    }
    clockRunning() {
      return this.playback.status === 'playing' && this.playback.advancing !== false && !this.awaitingState
        && !document.hidden && !this.motionPreference.matches;
    }
    playbackTime(song) {
      if (this.playback.songId !== song.id) return 0;
      const duration = this.playback.duration > 0 ? this.playback.duration : song.waveform?.duration || Number(song.duration) || 0;
      const rate = Number.isFinite(this.playback.playbackRate) && this.playback.playbackRate > 0 ? this.playback.playbackRate : 1;
      // Bound prediction if the player stops sending samples, e.g. a stalled connection.
      const delta = this.clockRunning() ? Math.min(.5, Math.max(0, (performance.now() - this.playbackAt) / 1000)) * rate : 0;
      return Math.min(duration, Math.max(0, (Number(this.playback.currentTime) || 0) + delta));
    }
    stopAnimation() { if (this.animation != null) cancelAnimationFrame(this.animation); this.animation = null; }
    syncAnimation() {
      this.stopAnimation();
      if (!this.active() || !this.clockRunning() || performance.now() - this.playbackAt >= 500) return;
      const wave = this.entries.get(this.playback.songId)?.entry.querySelector('[data-feed-waveform]');
      if (!wave || !this.visible.has(wave)) return;
      this.animation = requestAnimationFrame(() => {
        this.animation = null;
        if (!this.active() || !this.clockRunning() || !this.visible.has(wave)) return;
        const item = this.entries.get(this.playback.songId); if (!item) return;
        this.paintTime(item.song, item.entry, this.playbackTime(item.song)); this.draw(wave); this.syncAnimation();
      });
    }
    prepareWave(wave, song) {
      const bounds = wave.getBoundingClientRect(); if (!bounds.width || !bounds.height) return null;
      const dpr = Math.min(devicePixelRatio || 1, 2), width = Math.round(bounds.width), height = Math.round(bounds.height);
      const base = document.createElement('canvas'), played = document.createElement('canvas'), canvas = wave.firstChild;
      for (const layer of [base, played, canvas]) { layer.width = Math.round(width * dpr); layer.height = Math.round(height * dpr); }
      const grey = base.getContext('2d'), orange = played.getContext('2d');
      grey.scale(dpr, dpr); orange.scale(dpr, dpr); grey.fillStyle = '#686868'; orange.fillStyle = '#ff5500';
      const bars = Math.max(1, Math.floor(width / 3)), peaks = song.waveform.peaks;
      for (let i = 0; i < bars; i++) {
        const start = Math.floor(i * peaks.length / bars), end = Math.max(start + 1, Math.floor((i + 1) * peaks.length / bars));
        let peak = 0; for (let j = start; j < end; j++) peak = Math.max(peak, peaks[j]);
        const h = Math.max(1, peak / 255 * (height - 2)), x = i * width / bars, barWidth = Math.max(1, width / bars - 1);
        grey.fillRect(x, height - h, barWidth, h); orange.fillRect(x, height - h, barWidth, h);
      }
      const cache = { base, played, progress: null }; this.waveCache.set(wave, cache); return cache;
    }
    draw(wave) {
      const song = this.entries.get(wave.dataset.feedWaveform)?.song; if (!song?.waveform || !wave.isConnected) return;
      const cache = this.waveCache.get(wave) || this.prepareWave(wave, song); if (!cache) return;
      const duration = this.playback.songId === song.id && this.playback.duration > 0 ? this.playback.duration : song.waveform.duration;
      const progress = Math.max(0, Math.min(1, this.playbackTime(song) / duration));
      if (cache.progress === progress) return;
      const canvas = wave.firstChild, context = canvas.getContext('2d');
      context.resetTransform(); context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(cache.base, 0, 0);
      if (progress > 0) {
        context.save(); context.beginPath(); context.rect(0, 0, canvas.width * progress, canvas.height); context.clip(); context.drawImage(cache.played, 0, 0); context.restore();
      }
      cache.progress = progress;
    }
    // Previous draw(wave) rebuilt every peak on each player message and colored whole bars:
    // const progress = selected ? currentTime / duration : 0;
    // for (let i = 0; i < bars; i++) {
    //   const start = Math.floor(i * peaks.length / bars), end = Math.max(start + 1, Math.floor((i + 1) * peaks.length / bars));
    //   let peak = 0; for (let j = start; j < end; j++) peak = Math.max(peak, peaks[j]);
    //   const h = Math.max(1, peak / 255 * (height - 2));
    //   context.fillStyle = i / bars < progress ? '#ff5500' : '#686868';
    //   context.fillRect(i * width / bars, height - h, Math.max(1, width / bars - 1), h);
    // }
    destroy() {
      this.stopAnimation(); this.visible.clear(); this.waveCache = new WeakMap();
      this.abort.abort(); this.accountAbort.abort(); this.readAbort?.abort(); this.resize.disconnect(); this.visibility.disconnect();
      this.queuePending.forEach(pending => clearTimeout(pending.timer)); this.queuePending.clear(); this.pendingFollow = null; this.pendingSeek = null;
    }
  }
  window.initFeedView = function () {
    const root = document.querySelector('[data-feed-view]'); if (current?.root === root && current.active()) return;
    current?.destroy(); current = root ? new Feed(root) : null;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.initFeedView, { once: true }); else window.initFeedView();
})();
