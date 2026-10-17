(function () {
    "use strict";
    let playback = {};
    const frame = () => document.getElementById("mediaPlayerFrame");
    const send = data => frame()?.contentWindow?.postMessage(data, location.origin);
    const time = value => { const n = Math.max(0, Math.floor(Number(value) || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`; };
    function update() {
        const root = document.querySelector("[data-track-view]");
        if (!root) return;
        const active = playback.songId === root.dataset.songId;
        const playing = active && playback.status === "playing";
        const button = root.querySelector("[data-track-play]");
        button.classList.toggle("is-playing", playing);
        button.disabled = active && playback.status === "loading";
        button.title = playing ? "Tạm dừng" : "Phát bài hát";
        button.setAttribute("aria-label", button.title);
        const duration = active && playback.duration > 0 ? playback.duration : Number(root.dataset.duration);
        // Previous timeline updates retained for reference:
        // const seek = root.querySelector("[data-track-seek]");
        // seek.max = duration || 1;
        // seek.disabled = !active || !duration;
        // if (document.activeElement !== seek) seek.value = active ? playback.currentTime || 0 : 0;
        root.querySelector("[data-track-time]").textContent = time(active ? playback.currentTime : 0);
        root.querySelector("[data-track-duration]").textContent = time(duration);
        window.TrackWaveform?.update(playback);
    }
    window.addEventListener("message", event => {
        if (event.origin !== location.origin || event.source !== frame()?.contentWindow || event.data?.type !== "trackPlayback") return;
        playback = event.data;
        update();
    });
    document.addEventListener("click", event => {
        const link = event.target.closest("a[data-track-navigation]");
        if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !window.navigateMediaHz) return;
        event.preventDefault();
        window.navigateMediaHz(link.getAttribute("href"), true);
    });
    window.initTrackView = function () {
        const root = document.querySelector("[data-track-view]");
        // Previous: if (!root || root.dataset.initialized) return;
        if (!root) { window.TrackWaveform?.mount(null); return; }
        if (root.dataset.initialized) return;
        root.dataset.initialized = "true";
        window.SongEngagementV2_1?.bind(root);
        root.querySelectorAll("[data-track-image]").forEach(image => image.addEventListener("error", () => { image.src = "/images/chibi.gif"; }, { once: true }));
        root.querySelector("[data-track-play]").addEventListener("click", () => send({ type: "trackToggle", songId: root.dataset.songId, name: root.dataset.songName, categoryId: root.dataset.categoryId || null }));
        // Previous timeline listeners retained for reference:
        // const seek = root.querySelector("[data-track-seek]");
        // seek.addEventListener("input", () => { root.querySelector("[data-track-time]").textContent = time(seek.value); });
        // seek.addEventListener("change", () => send({ type: "trackSeek", songId: root.dataset.songId, seconds: Number(seek.value) }));
        root.querySelector("[data-track-share]").addEventListener("click", async () => {
            const status = root.querySelector("[data-track-feedback]");
            try {
                await navigator.clipboard.writeText(new URL("/home/song/" + encodeURIComponent(root.dataset.songId), location.origin).href);
                status.textContent = "Đã sao chép liên kết bài hát.";
            } catch (error) { status.textContent = "Không thể sao chép liên kết."; }
        });
        window.TrackWaveform?.mount(root, send, update);
        update();
        send({ type: "trackStateRequest" });
    };
    document.addEventListener("DOMContentLoaded", window.initTrackView);
})();
