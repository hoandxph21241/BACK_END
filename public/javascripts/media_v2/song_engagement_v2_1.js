(function () {
    "use strict";
    const cache = new Map(), requests = new Map(), busy = new Set();
    let run = null, lastSong = null;
    let authVersion = 0;
    function paint() {
        document.querySelectorAll("[data-song-like]").forEach(button => {
            const id = button.dataset.songLike, stats = cache.get(id)?.stats;
            button.disabled = !id || busy.has(id);
            button.setAttribute("aria-pressed", String(Boolean(stats?.liked)));
            button.setAttribute("aria-label", stats?.liked ? "Bỏ yêu thích" : "Yêu thích");
        });
        for (const [attribute, key] of [["data-song-plays", "playCount"], ["data-song-likes", "likeCount"]]) {
            document.querySelectorAll(`[${attribute}]`).forEach(node => {
                const stats = cache.get(node.getAttribute(attribute))?.stats;
                if (stats) node.textContent = Number(stats[key]).toLocaleString("vi-VN");
            });
        }
    }
    function publish(stats, broadcast = true) {
        cache.set(stats.songId, { stats, time: Date.now() });
        paint();
        window.dispatchEvent(new CustomEvent("songStats", { detail: stats }));
        if (!broadcast) return;
        const target = window.parent !== window ? window.parent : document.getElementById("mediaPlayerFrame")?.contentWindow;
        target?.postMessage({ type: "songStats", stats }, location.origin);
    }
    async function request(id, method = "GET", action = "stats", body) {
        const response = await fetch(`/api/songs/${encodeURIComponent(id)}/${action}`, {
            method, headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = await response.json();
        // Previous error did not preserve the HTTP status for the login popup:
        // if (!response.ok || !data.success) throw new Error(response.status === 401 ? "Vui lòng đăng nhập để yêu thích bài hát." : data.message || "Không thể cập nhật thống kê.");
        if (!response.ok || !data.success) {
            const error = new Error(data.message || "Không thể cập nhật thống kê.");
            error.status = response.status;
            throw error;
        }
        return data.data;
    }
    function get(id) {
        if (cache.has(id) && Date.now() - cache.get(id).time < 30000) return Promise.resolve(cache.get(id).stats);
        // Previous in-flight key was only the song ID and could publish anonymous stats after login.
        // if (!requests.has(id)) requests.set(id, request(id).then(stats => { publish(stats); return stats; }).finally(() => requests.delete(id)));
        // return requests.get(id);
        const version = authVersion, key = version + ':' + id;
        if (!requests.has(key)) requests.set(key, request(id).then(stats => {
            if (version === authVersion) publish(stats);
            return stats;
        }).finally(() => requests.delete(key)));
        return requests.get(key);
    }
    function notify(message) {
        let toast = document.getElementById("songEngagementStatus");
        if (!toast) { toast = document.createElement("div"); toast.id = "songEngagementStatus"; toast.setAttribute("role", "status"); document.body.append(toast); }
        toast.textContent = message; toast.hidden = false;
        clearTimeout(notify.timer); notify.timer = setTimeout(() => { toast.hidden = true; }, 4000);
    }
    // Previous: async function toggle(id) {
    async function toggle(id, liked) {
        if (!id || busy.has(id)) return;
        busy.add(id); paint();
        try {
            const current = await get(id);
            // Previous: const stats = await request(id, "PUT", "like", { liked: !current.liked });
            const stats = await request(id, "PUT", "like", { liked: typeof liked === "boolean" ? liked : !current.liked });
            publish(stats);
        // Previous: } catch (error) { notify(error.message); }
        } catch (error) {
            if (error.status === 401) {
                if (window.parent !== window) window.parent.postMessage({ type: "authRequired", songId: id }, location.origin);
                else if (window.MediaHzLogin) window.MediaHzLogin.open({ songId: id });
                else location.assign("/auth/signin");
            } else notify(error.message);
        }
        finally { busy.delete(id); paint(); }
    }
    const observed = new Set();
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target); observed.delete(entry.target);
            const id = entry.target.dataset.songLike;
            if (id) get(id).catch(() => {});
        });
    }) : null;
    function bind(root = document) {
        for (const element of observed) if (!element.isConnected) { observer?.unobserve(element); observed.delete(element); }
        root.querySelectorAll("[data-song-like]").forEach(button => {
            const id = button.dataset.songLike;
            if (!id || observed.has(button)) return;
            if (cache.has(id) || !observer) get(id).catch(() => {});
            else { observed.add(button); observer.observe(button); }
        });
        paint();
    }
    async function recordListen(id, playbackId) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try { publish(await request(id, "POST", "listen", { playbackId })); return; }
            catch (error) { if (attempt === 1) console.warn("Cannot record listen:", error.message); else await new Promise(resolve => setTimeout(resolve, 1500)); }
        }
    }
    function observePlayback(state) {
        const id = state.currentSong?.id;
        if (id !== lastSong) {
            lastSong = id;
            const button = document.getElementById("mediaLikeBtn");
            if (button) button.dataset.songLike = id || "";
            if (id) get(id).catch(() => {});
            paint();
        }
        if (!id || ["idle", "loading", "ended", "error"].includes(state.status)) { run = null; return; }
        const now = performance.now(), position = Number(state.currentTime) || 0;
        if (!run || run.id !== id) run = { id, playbackId: crypto.randomUUID(), seconds: 0, last: now, position, playing: false, counted: false };
        if (state.status === "playing" && run.playing) {
            run.seconds += Math.max(0, Math.min(2, (now - run.last) / 1000, position - run.position));
        }
        run.last = now; run.position = position; run.playing = state.status === "playing";
        const threshold = state.duration > 0 ? Math.min(10, state.duration / 2) : 10;
        if (!run.counted && run.seconds >= threshold) { run.counted = true; recordListen(id, run.playbackId); }
    }
    document.addEventListener("click", event => {
        const button = event.target.closest("[data-song-like]");
        if (!button) return;
        event.preventDefault(); toggle(button.dataset.songLike);
    });
    function authenticationChanged() { authVersion++; cache.clear(); bind(); }
    window.addEventListener("mediahz:authenticated", authenticationChanged);
    window.addEventListener("message", event => {
        const source = window.parent !== window ? window.parent : document.getElementById("mediaPlayerFrame")?.contentWindow;
        // Previous: if (event.origin !== location.origin || event.source !== source || event.data?.type !== "songStats") return;
        if (event.origin !== location.origin || event.source !== source) return;
        if (event.data?.type === "authChanged") { authenticationChanged(); return; }
        if (event.data?.type !== "songStats") return;
        const stats = event.data.stats;
        if (stats && typeof stats.songId === "string" && Number.isFinite(stats.playCount) && Number.isFinite(stats.likeCount)) publish(stats, false);
    });
    window.SongEngagementV2_1 = Object.freeze({ get, toggle, bind, observePlayback });
    document.addEventListener("DOMContentLoaded", () => bind());
})();
