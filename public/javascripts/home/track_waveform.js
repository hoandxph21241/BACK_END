(function () {
  "use strict";
  let current;
  const cache = new Map();
  const format = value => { const n = Math.max(0, Math.floor(value || 0)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
  class Waveform {
    constructor(root, send, ready) {
      this.root = root; this.send = send; this.ready = ready;
      this.element = root.querySelector('[data-track-waveform]');
      this.canvas = root.querySelector('[data-waveform-canvas]');
      this.status = root.querySelector('[data-waveform-status]');
      this.label = root.querySelector('[data-waveform-label]');
      this.retry = root.querySelector('[data-waveform-retry]');
      const colors = getComputedStyle(this.element);
      this.playedColor = colors.getPropertyValue('--track-waveform-played').trim() || '#ff5500';
      this.unplayedColor = colors.getPropertyValue('--track-waveform-unplayed').trim() || '#dee3e1';
      this.abort = new AbortController(); this.state = {}; this.peaks = []; this.duration = Number(root.dataset.duration) || 0;
      const options = { signal: this.abort.signal };
      this.element.addEventListener('pointerdown', event => {
        if (!this.enabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault(); this.element.focus(); this.pointer = event.pointerId;
        this.element.setPointerCapture(event.pointerId); this.preview(event);
      }, options);
      this.element.addEventListener('pointermove', event => {
        if (this.pointer === event.pointerId) this.preview(event);
        else if (this.enabled) this.tooltip(event);
      }, options);
      this.element.addEventListener('pointerup', event => {
        if (this.pointer !== event.pointerId) return;
        this.preview(event); const seconds = this.previewTime;
        this.pointer = null; this.element.releasePointerCapture(event.pointerId); this.seek(seconds);
      }, options);
      const cancel = () => { this.pointer = null; this.previewTime = null; this.label.hidden = true; this.draw(); };
      this.element.addEventListener('pointercancel', cancel, options);
      this.element.addEventListener('lostpointercapture', () => { if (this.pointer != null) cancel(); }, options);
      this.element.addEventListener('pointerleave', () => { if (this.pointer == null) this.label.hidden = true; }, options);
      this.element.addEventListener('keydown', event => {
        if (!this.enabled) return;
        const seconds = this.time();
        const keys = { ArrowLeft: seconds - 5, ArrowRight: seconds + 5, ArrowDown: seconds - 5,
          ArrowUp: seconds + 5, Home: 0, End: this.duration, PageDown: seconds - 10, PageUp: seconds + 10 };
        if (!(event.key in keys)) return;
        event.preventDefault(); this.seek(keys[event.key]);
      }, options);
      this.retry.addEventListener('click', () => this.load(), options);
      this.resize = new ResizeObserver(() => this.draw()); this.resize.observe(this.element);
      this.load();
    }
    async load() {
      this.status.hidden = false; this.status.textContent = 'Đang tạo waveform...'; this.retry.hidden = true;
      this.element.classList.add('is-loading'); this.element.setAttribute('aria-busy', 'true');
      try {
        const id = this.root.dataset.songId;
        let data = cache.get(id);
        if (!data) {
          const response = await fetch('/api/songs/' + encodeURIComponent(id) + '/waveform', { signal: this.abort.signal });
          const json = await response.json();
          if (!response.ok || !json.success) throw new Error(json.message || 'Không thể tải waveform.');
          data = json.data;
          if (!data || !Array.isArray(data.peaks) || data.peaks.length !== 480 || !data.peaks.every(n => Number.isFinite(n) && n >= 0 && n <= 255) || !(data.duration > 0)) throw new Error('Dữ liệu waveform không hợp lệ.');
          if (cache.size >= 12) cache.delete(cache.keys().next().value);
          cache.set(id, data);
        }
        if (this.abort.signal.aborted || !this.root.isConnected) return;
        this.peaks = data.peaks; this.duration = data.duration; this.root.dataset.duration = String(data.duration);
        this.status.hidden = true; this.element.classList.remove('is-loading');
        this.ready(); this.draw();
      } catch (error) {
        if (this.abort.signal.aborted) return;
        this.element.classList.remove('is-loading');
        this.status.textContent = error.message || 'Không thể tải waveform.'; this.retry.hidden = false;
      } finally { this.element.removeAttribute('aria-busy'); }
    }
    update(state) {
      this.state = state; this.updatedAt = performance.now();
      const active = state.songId === this.root.dataset.songId;
      if (active && state.duration > 0) this.duration = state.duration;
      this.enabled = active && this.duration > 0 && this.peaks.length > 0 && !['idle', 'loading', 'error'].includes(state.status);
      if (this.previewTime != null && this.pointer == null &&
          (!active || Math.abs((state.currentTime || 0) - this.previewTime) < 1 || performance.now() - this.seekAt > 1000)) this.previewTime = null;
      this.element.setAttribute('aria-disabled', String(!this.enabled));
      this.element.tabIndex = this.enabled ? 0 : -1;
      this.element.setAttribute('aria-valuemax', String(this.duration || 0));
      // Previous tooltip: this.element.title = this.enabled ? 'Tua bài hát' : 'Phát bài hát để tua';
      this.element.removeAttribute('title');
      cancelAnimationFrame(this.animation); this.draw();
      if (active && state.status === 'playing') this.tick();
    }
    time() {
      if (this.previewTime != null) return this.previewTime;
      if (this.state.songId !== this.root.dataset.songId) return 0;
      const delta = this.state.status === 'playing' && !document.hidden ? Math.min(1, (performance.now() - this.updatedAt) / 1000) : 0;
      return Math.min(this.duration, Math.max(0, (this.state.currentTime || 0) + delta));
    }
    tick() {
      if (this.abort.signal.aborted || !this.root.isConnected) return;
      this.animation = requestAnimationFrame(() => { this.draw(); this.tick(); });
    }
    tooltip(event) {
      const bounds = this.element.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width)));
      this.label.hidden = false; this.label.textContent = format(ratio * this.duration);
      this.label.style.left = Math.max(24, Math.min(bounds.width - 24, ratio * bounds.width)) + 'px';
      return ratio * this.duration;
    }
    preview(event) {
      this.previewTime = this.tooltip(event); this.draw();
      this.root.querySelector('[data-track-time]').textContent = format(this.previewTime);
    }
    seek(seconds) {
      this.previewTime = Math.max(0, Math.min(this.duration, seconds)); this.seekAt = performance.now();
      this.send({ type: 'trackSeek', songId: this.root.dataset.songId, seconds: this.previewTime });
      // Previous timeline sync: const input = this.root.querySelector('[data-track-seek]'); input.value = this.previewTime;
      this.root.querySelector('[data-track-time]').textContent = format(this.previewTime); this.draw();
    }
    draw() {
      // Previous sizing rounded CSS dimensions before accounting for the display scale:
      // const width = this.element.clientWidth, height = this.element.clientHeight;
      const bounds = this.element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const scale = Math.min(devicePixelRatio || 1, 2);
      // Previous backing size: Math.round(width * scale), Math.round(height * scale).
      const pixelWidth = Math.max(1, Math.round(bounds.width * scale)), pixelHeight = Math.max(1, Math.round(bounds.height * scale));
      if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
        this.canvas.width = pixelWidth; this.canvas.height = pixelHeight;
      }
      const width = this.canvas.width, height = this.canvas.height;
      const ctx = this.canvas.getContext('2d');
      // Previous: ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.clearRect(0, 0, width, height);
      ctx.resetTransform(); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // Previous: ctx.setTransform(scale, 0, 0, scale, 0, 0);
      // Draw in backing pixels so every bar and gap has the same integer width.
      if (!this.peaks.length) return;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, width, height); ctx.clip();
      // Previous fractional grid:
      // const count = Math.min(this.peaks.length, Math.max(1, Math.floor(width / 4)));
      // const step = width / count, played = this.duration > 0 ? width * this.time() / this.duration : 0;
      const step = Math.max(2, Math.round(4 * scale), Math.ceil(width / this.peaks.length));
      const gap = Math.max(1, Math.round(1.5 * scale)), barWidth = Math.min(width, Math.max(1, step - gap));
      const count = Math.min(this.peaks.length, Math.max(1, Math.floor((width + gap) / step)));
      const inset = Math.floor((width - ((count - 1) * step + barWidth)) / 2);
      const played = this.duration > 0 ? width * this.time() / this.duration : 0;
      for (let i = 0; i < count; i++) {
        const from = Math.floor(i * this.peaks.length / count), to = Math.max(from + 1, Math.floor((i + 1) * this.peaks.length / count));
        let peak = 0; for (let j = from; j < to; j++) peak = Math.max(peak, this.peaks[j]);
        // Previous mirrored waveform: const bar = Math.max(2, Math.sqrt(peak / 255) * (height - 24));
        // const x = i * step, y = (height - bar) / 2, barWidth = Math.max(1, step - 1.5);
        // Previous two-layer rendering retained for reference:
        // const bar = Math.max(1, Math.sqrt(peak / 255) * (height - 12));
        // const x = i * step, y = height - bar, barWidth = Math.max(1, step - 1.5);
        // ctx.fillStyle = '#a9b3af'; ctx.fillRect(x, y, barWidth, bar);
        // if (played > x) { ctx.fillStyle = '#ff5500'; ctx.fillRect(x, y, Math.min(barWidth, played - x), bar); }
        if (peak <= 0) continue;
        // Previous independently rounded edges produced alternating 2px/3px bars:
        // const bar = Math.max(1, Math.sqrt(peak / 255) * (height - 12));
        // const x = Math.round(i * step * scale) / scale;
        // const right = Math.round((i * step + Math.max(1, step - 1.5)) * scale) / scale;
        // const y = Math.round((height - bar) * scale) / scale;
        // const split = Math.max(x, Math.min(right, Math.round(played * scale) / scale));
        const bar = Math.max(1, Math.round(Math.sqrt(peak / 255) * Math.max(0, height - 12 * scale)));
        const x = inset + i * step, right = x + barWidth, y = height - bar;
        const split = Math.max(x, Math.min(right, Math.round(played)));
        // Previous fixed colors: played '#ff5500', unplayed '#a9b3af'.
        if (split > x) { ctx.fillStyle = this.playedColor; ctx.fillRect(x, y, split - x, height - y); }
        if (split < right) { ctx.fillStyle = this.unplayedColor; ctx.fillRect(split, y, right - split, height - y); }
      }
      ctx.restore();
      this.element.setAttribute('aria-valuenow', String(Math.round(this.time())));
      this.element.setAttribute('aria-valuetext', format(this.time()) + ' / ' + format(this.duration));
    }
    destroy() { this.abort.abort(); cancelAnimationFrame(this.animation); this.resize.disconnect(); }
  }
  window.TrackWaveform = {
    mount(root, send, ready) { current?.destroy(); current = root?.querySelector('[data-track-waveform]') ? new Waveform(root, send, ready) : null; },
    update(state) { current?.update(state); },
  };
})();
