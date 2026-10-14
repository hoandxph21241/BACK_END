(function () {
    "use strict";
    const frame = document.getElementById("mediaPlayerFrame");
    const popup = document.getElementById("parentPlaylistPopup");
    const list = document.getElementById("parentQueueList");
    // const count = document.getElementById("parentQueueCount");
    if (!frame || !popup || !list) return;
    let open = false;
    let anchor = null;
    let songs = [];
    let playback = {};
    let signature = "";
    const send = data => frame.contentWindow?.postMessage(data, window.location.origin);
//     const formatTime = value => {
//         const seconds = Math.floor(Number(value));
//         return Number.isFinite(seconds) && seconds > 0
//             ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "";
//     };
    const favorites = new Set();
    let menuTrigger = null;
    const menu = document.createElement("div");
    menu.id = "parentQueueItemMenu";
    menu.className = "queue-item-menu";
    menu.hidden = true;
    menu.setAttribute("role", "group");
    menu.setAttribute("aria-label", "Thao tac bai hat");
    document.body.append(menu);

    function closeItemMenu(restoreFocus = false) {
        menu.hidden = true;
        if (menuTrigger) {
            menuTrigger.setAttribute("aria-expanded", "false");
            if (restoreFocus) menuTrigger.focus();
        }
        menuTrigger = null;
    }
    function updateFavorite(button, song) {
        const liked = favorites.has(song.id);
        button.setAttribute("aria-pressed", String(liked));
        button.title = liked ? "Bo yeu thich" : "Yeu thich";
        button.setAttribute("aria-label", `${button.title}: ${song.name}`);
    }
    function toggleFavorite(button, song) {
        if (favorites.has(song.id)) favorites.delete(song.id);
        else favorites.add(song.id);
        updateFavorite(button, song);
    }
    function showItemMenu(trigger, favoriteButton, song) {
        const wasOpen = menuTrigger === trigger && !menu.hidden;
        closeItemMenu();
        if (wasOpen) return;
        menuTrigger = trigger;
        trigger.setAttribute("aria-expanded", "true");
        const play = document.createElement("button");
        play.type = "button";
        play.textContent = "Phat bai nay";
        play.addEventListener("click", () => {
            send({ type: "queueSelect", songId: song.id });
            closeItemMenu(true);
        });
        const favorite = document.createElement("button");
        favorite.type = "button";
        favorite.textContent = favorites.has(song.id) ? "Bo yeu thich" : "Yeu thich";
        favorite.addEventListener("click", () => {
            toggleFavorite(favoriteButton, song);
            closeItemMenu(true);
        });
        menu.replaceChildren(play, favorite);
        menu.hidden = false;
        const rect = trigger.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.min(window.innerWidth - menu.offsetWidth - 8, rect.right - menu.offsetWidth))}px`;
        const top = rect.bottom + 4 + menu.offsetHeight < window.innerHeight - 8
            ? rect.bottom + 4 : rect.top - menu.offsetHeight - 4;
        menu.style.top = `${Math.max(8, top)}px`;
        play.focus();
    }

    function position() {
        if (!anchor) return;
        const rect = frame.getBoundingClientRect();
        const width = popup.offsetWidth;
        const height = popup.offsetHeight;
        const left = rect.left + anchor.right - width;
        popup.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, left))}px`;
        popup.style.top = `${Math.max(8, rect.top + anchor.top - height - 10)}px`;
    }
    function setOpen(value) {
        open = value;
        if (!value) closeItemMenu();
        popup.classList.toggle("is-open", value);
        popup.setAttribute("aria-hidden", String(!value));
        popup.inert = !value;
        if (value) position();
    }
    function close(restoreFocus = false) {
        setOpen(false);
        send({ type: "queueClose", restoreFocus });
    }
    function updatePlayback() {
        list.querySelectorAll(".queue-row").forEach(row => {
            const current = row.dataset.songId === playback.currentSongId;
            row.classList.toggle("is-current", current);
            row.classList.toggle("is-playing", current && playback.status === "playing");
            const button = row.querySelector("button");
            if (current) button.setAttribute("aria-current", "true");
            else button.removeAttribute("aria-current");
            // const song = songs.find(item => item.id === row.dataset.songId);
            // row.querySelector(".queue-duration").textContent = formatTime(current && playback.duration > 0 ? playback.duration : song?.duration);
        });
    }
    function render() {
        closeItemMenu();
        const fragment = document.createDocumentFragment();
        songs.forEach((song, index) => {
            const row = document.createElement("li");
            row.className = "queue-row";
            row.dataset.songId = song.id;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "queue-track";
            button.setAttribute("aria-label", `Phat ${song.name}`);
            // const number = document.createElement("span");
            // number.className = "queue-number";
            // number.textContent = String(index + 1);
            const wave = document.createElement("span");
            wave.className = "queue-wave";
            wave.setAttribute("aria-hidden", "true");
            for (let barIndex = 0; barIndex < 4; barIndex++) {
                const bar = document.createElement("span");
                wave.append(bar);
            }
            const cover = document.createElement("img");
            cover.src = song.image || "/images/chibi.gif";
            cover.alt = "";
            cover.addEventListener("error", () => { cover.src = "/images/chibi.gif"; }, { once: true });
            const info = document.createElement("span");
            info.className = "queue-info";
            const artist = document.createElement("span");
            artist.className = "queue-artist";
            artist.textContent = song.artist || "Unknown Artist";
            const title = document.createElement("span");
            title.className = "queue-title";
            title.textContent = song.name || "Unknown Song";
            info.append(artist, title);
            // const duration = document.createElement("span");
            // duration.className = "queue-duration";
            // button.append(number, cover, info, duration);
            // button.append(wave, cover, info, duration);
            button.append(wave, cover, info);
            const actions = document.createElement("span");
            actions.className = "queue-actions";
            const favorite = document.createElement("button");
            favorite.type = "button";
            favorite.className = "queue-action queue-favorite";
            const heart = document.createElement("span");
            heart.className = "queue-heart-icon";
            heart.setAttribute("aria-hidden", "true");
            favorite.append(heart);
            updateFavorite(favorite, song);
            favorite.addEventListener("click", () => toggleFavorite(favorite, song));
            const more = document.createElement("button");
            more.type = "button";
            more.className = "queue-action queue-more";
            more.title = "Them thao tac";
            more.setAttribute("aria-label", `Them thao tac: ${song.name}`);
            more.setAttribute("aria-haspopup", "true");
            more.setAttribute("aria-expanded", "false");
            const dots = document.createElement("span");
            dots.className = "queue-dots-icon";
            dots.setAttribute("aria-hidden", "true");
            more.append(dots);
            more.addEventListener("click", () => showItemMenu(more, favorite, song));
            actions.append(favorite, more);
            button.addEventListener("click", () => send({ type: "queueSelect", songId: song.id }));
            // row.append(button);
            row.append(button, actions);
            fragment.append(row);
        });
        if (!songs.length) {
            const empty = document.createElement("li");
            empty.className = "queue-empty";
            empty.textContent = "No Song";
            fragment.append(empty);
        }
        list.replaceChildren(fragment);
        // count.textContent = String(songs.length);
        updatePlayback();
    }
    window.addEventListener("message", event => {
        if (event.source !== frame.contentWindow || event.origin !== window.location.origin) return;
        const data = event.data;
        if (data?.type === "queueData" && Array.isArray(data.songs)) {
            playback = data;
            const nextSignature = JSON.stringify(data.songs);
            if (signature !== nextSignature) {
                signature = nextSignature;
                songs = data.songs;
                render();
            } else updatePlayback();
        }
        if (data?.type === "queuePopup") {
            anchor = data.buttonRect || anchor;
            setOpen(Boolean(data.open));
        }
    });
    document.getElementById("parentCloseQueueBtn").addEventListener("click", () => close(true));
    document.addEventListener("pointerdown", event => {
        if (!menu.hidden && !menu.contains(event.target) && !menuTrigger?.contains(event.target)) closeItemMenu();
        if (open && !popup.contains(event.target) && !menu.contains(event.target)) close();
    });
    document.addEventListener("keydown", event => {
        // if (open && event.key === "Escape") close(true);
        if (open && event.key === "Escape") {
            if (!menu.hidden) closeItemMenu(true);
            else close(true);
        }
    });
    // window.addEventListener("resize", position);
    window.addEventListener("resize", () => { closeItemMenu(); position(); });
    list.parentElement.addEventListener("scroll", () => closeItemMenu(), { passive: true });
    frame.addEventListener("load", () => { setOpen(false); send({ type: "queueReady" }); });
    send({ type: "queueReady" });
})();