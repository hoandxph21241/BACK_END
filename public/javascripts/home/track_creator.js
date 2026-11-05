(function () {
  'use strict';
  let current;
  const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
  class Creator {
    constructor(root, card) {
      this.root = root; this.card = card; this.abort = new AbortController(); this.version = 0;
      this.follow = card.querySelector('[data-creator-follow]');
      this.actions = card.querySelector('[data-creator-actions]');
      this.status = card.querySelector('[data-creator-status]');
      this.owner = ''; this.ready = false; this.busy = false; this.following = false;
      this.previous = { plays: Number(card.dataset.currentPlays) || 0, likes: Number(card.dataset.currentLikes) || 0 };
      const options = { signal: this.abort.signal };
      this.follow.addEventListener('click', () => {
        if (!this.ready) { this.refresh(); return; }
        if (!this.owner) {
          this.pendingFollow = true;
          if (window.MediaHzLogin) window.MediaHzLogin.open(); else location.assign('/auth/signin');
        } else this.setFollowing(!this.following);
      }, options);
      card.querySelector('[data-creator-message]').addEventListener('click', () => {
        const recipient = { id: card.dataset.creatorId, name: card.dataset.creatorName,
          avatar: card.dataset.creatorAvatar, tag: card.dataset.creatorTag };
        if (!window.MediaHzMail?.composeTo) this.status.textContent = 'Không thể mở hộp thư. Vui lòng tải lại trang.';
        else window.MediaHzMail.composeTo(recipient);
      }, options);
      window.addEventListener('mediahz:authenticated', async () => {
        const resume = this.pendingFollow;
        this.pendingFollow = false; this.version++; this.ready = false;
        this.owner = ''; this.self = false; this.following = false;
        await this.refresh();
        if (resume && this.ready && this.owner && !this.self) this.setFollowing(true);
      }, options);
      document.getElementById('loginPopup')?.addEventListener('close', () => {
        if (!this.owner) this.pendingFollow = false;
      }, options);
      window.addEventListener('songStats', event => this.updateTotals(event.detail), options);
      window.addEventListener('userFollowChanged', event => {
        const data = event.detail;
        if (data?.creatorId !== this.card.dataset.creatorId) return;
        if (this.owner && this.owner !== data.userId) this.refresh();
        else { this.apply(data); this.paint(); }
      }, options);
      this.refresh();
    }
    paint() {
      this.actions.hidden = Boolean(this.self);
      this.follow.disabled = this.busy;
      this.follow.textContent = this.following ? 'Following' : 'Follow';
      this.follow.setAttribute('aria-pressed', String(this.following));
      this.follow.setAttribute('aria-label', (this.following ? 'Bỏ theo dõi ' : 'Theo dõi ') + this.card.dataset.creatorName);
      this.follow.setAttribute('aria-busy', String(this.busy));
    }
    async request(following) {
      const writing = typeof following === 'boolean';
      const response = await fetch('/api/users/' + encodeURIComponent(this.card.dataset.creatorId) + '/follow', {
        method: writing ? 'PUT' : 'GET', credentials: 'same-origin', cache: 'no-store',
        headers: { Accept: 'application/json', ...(writing ? { 'Content-Type': 'application/json', 'X-Follow-Owner': this.owner } : {}) },
        ...(writing ? { body: JSON.stringify({ following }) } : {}),
        signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(10000)]),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw Object.assign(new Error(result.message || 'Không thể cập nhật theo dõi.'), { status: response.status });
      return result.data;
    }
    apply(data) {
      this.owner = data.userId || ''; this.following = Boolean(data.following); this.self = Boolean(data.isSelf); this.ready = true;
      this.card.querySelector('[data-creator-followers]').textContent = Math.max(0, Number(data.followers) || 0).toLocaleString('vi-VN');
    }
    async refresh() {
      const version = ++this.version;
      this.busy = true; this.paint();
      try {
        const data = await this.request();
        if (version === this.version && !this.abort.signal.aborted) { this.apply(data); this.status.textContent = ''; }
      } catch (error) {
        if (version !== this.version || this.abort.signal.aborted) return;
        if (error.status === 401) { this.owner = ''; this.following = false; this.self = false; this.ready = true; }
        else this.status.textContent = error.status ? error.message : 'Không thể tải trạng thái theo dõi. Bấm Follow để thử lại.';
      } finally {
        if (version === this.version && !this.abort.signal.aborted) { this.busy = false; this.paint(); }
      }
    }
    async setFollowing(following) {
      if (this.busy || this.self || !this.owner) return;
      const version = this.version;
      this.busy = true; this.status.textContent = ''; this.paint();
      try {
        const data = await this.request(following);
        if (version === this.version && !this.abort.signal.aborted) {
          this.apply(data); window.UserFollowEvents?.publish(data);
        }
      } catch (error) {
        if (version !== this.version || this.abort.signal.aborted) return;
        this.status.textContent = error.status ? error.message : 'Chưa xác nhận kết quả theo dõi. Vui lòng kiểm tra lại.';
        if (error.status === 401) {
          this.owner = ''; this.pendingFollow = following;
          if (window.MediaHzLogin) window.MediaHzLogin.open(); else location.assign('/auth/signin');
        } else if (error.status === 409 || !error.status) await this.refresh();
      } finally {
        if (version === this.version && !this.abort.signal.aborted) { this.busy = false; this.paint(); }
      }
    }
    updateTotals(stats) {
      if (stats?.songId !== this.root.dataset.songId) return;
      for (const [key, field] of [['plays', 'playCount'], ['likes', 'likeCount']]) {
        const next = stats[field], node = this.card.querySelector(`[data-creator-total="${key}"]`);
        if (!Number.isFinite(next) || next < 0 || !node) continue;
        const total = Math.max(0, Number(node.dataset.total) + next - this.previous[key]);
        this.previous[key] = next; node.dataset.total = String(total);
        node.textContent = compact.format(total); node.title = total.toLocaleString('vi-VN');
      }
    }
    destroy() { this.abort.abort(); this.pendingFollow = false; }
  }
  window.TrackCreator = {
    mount(root) {
      current?.destroy();
      const card = root?.querySelector('[data-track-creator]');
      current = card ? new Creator(root, card) : null;
    },
  };
})();
