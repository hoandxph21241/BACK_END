// const audioPlayer = document.getElementById("audioPlayer");
// const songNameElement = document.querySelector(".song-name");
// const mediaControlBar = document.querySelector(".media-control-bar");
// const playPauseBtn = document.getElementById("playPauseBtn");
// const playPauseIcon = document.getElementById("playPauseIcon");
// const nextBtn = document.getElementById("nextBtn");
// const backBtn = document.getElementById("backBtn");
// const otherControls = document.querySelector('.other-btn');
// const volumeBtn = document.getElementById('volumeBtn');
// const volumeSlider = document.getElementById('volumeSlider');
// const volumeSliderContainer = document.getElementById('volumeSliderContainer');
// const seekbar = document.getElementById('seekbar');
// const currentTimeDisplay = document.getElementById('currentTime');
// const endTimeDisplay = document.getElementById('endTime');

// const togglePlaylistBtn = document.getElementById('togglePlaylistBtn');
// const playlistHeader = document.getElementById('playlist-header');
// const playlistPopup = document.getElementById('playlistPopup');
// const playlistItems = document.getElementById('playlistItems');
// const accordionContainer = document.getElementById("playlistAccordion");
// const albumCoverElement = document.getElementById('albumCover');

// const repeatBtn = document.getElementById("repeatBtn");
// const shuffleBtn = document.getElementById("shuffleBtn");

// window.audioPlayer = audioPlayer;
// window.songNameElement = songNameElement;
// window.mediaControlBar = mediaControlBar;
// window.playPauseBtn = playPauseBtn;
// window.playPauseIcon = playPauseIcon;
// window.nextBtn = nextBtn;
// window.backBtn = backBtn;
// window.otherControls = otherControls;
// window.volumeBtn = volumeBtn;
// window.volumeSlider = volumeSlider;
// window.volumeSliderContainer = volumeSliderContainer;
// window.seekbar = seekbar;
// window.currentTimeDisplay = currentTimeDisplay;
// window.endTimeDisplay = endTimeDisplay;

// window.togglePlaylistBtn = togglePlaylistBtn;
// window.playlistHeader = playlistHeader;
// window.playlistPopup = playlistPopup;
// window.playlistItems = playlistItems;
// window.accordionContainer = accordionContainer;
// window.albumCover = albumCover;

// window.repeatBtn = repeatBtn;
// window.shuffleBtn = shuffleBtn;
const audioPlayer = document.getElementById("audioPlayer");
const songNameElement = document.querySelector(".song-name");
const mediaControlBar = document.querySelector(".media-control-bar");

const playPauseBtn = document.getElementById("playPauseBtn");
const playPauseIcon = document.getElementById("playPauseIcon");
const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");

const otherControls = document.querySelector(".other-btn");
const volumeBtn = document.getElementById("volumeBtn");
const volumeSlider = document.getElementById("volumeSlider");
const volumeSliderContainer = document.getElementById("volumeSliderContainer");

const seekbar = document.getElementById("seekbar");
const currentTimeDisplay = document.getElementById("currentTime");
const endTimeDisplay = document.getElementById("endTime");

const togglePlaylistBtn = document.getElementById("togglePlaylistBtn");
const playlistHeader = document.getElementById("playlist-header");
const playlistPopup = document.getElementById("playlistPopup");
const playlistItems = document.getElementById("playlistItems");
const accordionContainer = document.getElementById("playlistAccordion");
const albumCoverElement = document.getElementById("albumCover");

const repeatBtn = document.getElementById("repeatBtn");
const shuffleBtn = document.getElementById("shuffleBtn");

// Chia sẻ các phần tử giao diện với những script điều khiển trình phát.
window.audioPlayer = audioPlayer;
window.songNameElement = songNameElement;
window.mediaControlBar = mediaControlBar;

window.playPauseBtn = playPauseBtn;
window.playPauseIcon = playPauseIcon;
window.nextBtn = nextBtn;
window.backBtn = backBtn;

window.otherControls = otherControls;
window.volumeBtn = volumeBtn;
window.volumeSlider = volumeSlider;
window.volumeSliderContainer = volumeSliderContainer;

window.seekbar = seekbar;
window.currentTimeDisplay = currentTimeDisplay;
window.endTimeDisplay = endTimeDisplay;

window.togglePlaylistBtn = togglePlaylistBtn;
window.playlistHeader = playlistHeader;
window.playlistPopup = playlistPopup;
window.playlistItems = playlistItems;
window.accordionContainer = accordionContainer;
window.albumCover = albumCoverElement;

window.repeatBtn = repeatBtn;
window.shuffleBtn = shuffleBtn;
let volumeHovered = false;
let playlistOpen = false;
let playlistCloseTimer;
let mediaV2Initialized = false;
let repeatMode = "none";
let shuffleEnabled = false;

// function setPlaylistOpen(open) {
//     if (!playlistPopup) return;
//     playlistOpen = open;
//     clearTimeout(playlistCloseTimer);
//     playlistPopup.classList.toggle("is-open", open);
//     playlistPopup.setAttribute("aria-hidden", String(!open));
//     playlistPopup.inert = !open;
//     togglePlaylistBtn?.setAttribute("aria-expanded", String(open));
//     const notify = () => window.parent.postMessage({
//         type: "playlistState", isExpanded: open,
//     }, window.location.origin);
//     if (open) notify();
//     else playlistCloseTimer = setTimeout(notify, 220);
// }
//
// function renderPlaylist(state) {
//     const list = document.getElementById("playlist");
//     if (!list) return;
//     const fragment = document.createDocumentFragment();
//     state.songs.forEach((song, index) => {
//         const row = document.createElement("li");
//         row.className = "queue-row";
//         row.dataset.songId = song.id;
//         const button = document.createElement("button");
//         button.type = "button";
//         button.className = "queue-track";
//         button.setAttribute("aria-label", `Phat ${song.name}`);
//         const number = document.createElement("span");
//         number.className = "queue-number";
//         number.textContent = String(index + 1);
//         const cover = document.createElement("img");
//         cover.src = song.image || "/images/chibi.gif";
//         cover.alt = "";
//         cover.addEventListener("error", () => { cover.src = "/images/chibi.gif"; }, { once: true });
//         const info = document.createElement("span");
//         info.className = "queue-info";
//         const artist = document.createElement("span");
//         artist.className = "queue-artist";
//         artist.textContent = song.artist || "Unknown Artist";
//         const title = document.createElement("span");
//         title.className = "queue-title";
//         title.textContent = song.name;
//         info.append(artist, title);
//         const duration = document.createElement("span");
//         duration.className = "queue-duration";
//         duration.textContent = Number(song.duration) > 0
//             ? window.PlayerUIV2_1.formatTime(Number(song.duration)) : "";
//         button.append(number, cover, info, duration);
//         button.addEventListener("click", () => {
//             playPlaylistSong(song).catch(error => console.error("Cannot play queued song:", error));
//         });
//         row.append(button);
//         fragment.append(row);
//     });
//     if (!state.songs.length) {
//         const empty = document.createElement("li");
//         empty.className = "queue-empty";
//         empty.textContent = "Danh sach phat trong";
//         fragment.append(empty);
//     }
//     list.replaceChildren(fragment);
//     const count = document.getElementById("queueCount");
//     if (count) count.textContent = String(state.length);
//     updateQueuePlayback(window.PlayerControllerV2_1.getState());
// }
//
// function updateQueuePlayback(state) {
//     document.querySelectorAll("#playlist .queue-row").forEach(row => {
//         const current = row.dataset.songId === state.currentSong?.id;
//         row.classList.toggle("is-current", current);
//         row.classList.toggle("is-playing", current && state.status === "playing");
//         const button = row.querySelector("button");
//         if (current) button.setAttribute("aria-current", "true");
//         else button.removeAttribute("aria-current");
//     });
// }
let lastQueuePlaybackKey = "";
function sendQueueState() {
    const queue = window.PlaylistControllerV2_1.getState();
    const playback = window.PlayerControllerV2_1.getState();
    window.parent.postMessage({
        type: "queueData",
        songs: queue.songs,
        currentSongId: playback.currentSong?.id || null,
        status: playback.status,
        duration: playback.duration,
    }, window.location.origin);
}

function setPlaylistOpen(open) {
    playlistOpen = open;
    togglePlaylistBtn?.setAttribute("aria-expanded", String(open));
    const rect = togglePlaylistBtn?.getBoundingClientRect();
    sendQueueState();
    window.parent.postMessage({
        type: "queuePopup", open,
        buttonRect: rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } : null,
    }, window.location.origin);
}

function renderPlaylist() {
    sendQueueState();
}

function updateQueuePlayback(state) {
    const key = JSON.stringify([state.currentSong?.id, state.status, state.duration]);
    if (key !== lastQueuePlaybackKey) {
        lastQueuePlaybackKey = key;
        sendQueueState();
    }
}

function updateModeButtons() {
    if (shuffleBtn) {
        shuffleBtn.classList.toggle("active", shuffleEnabled);
        shuffleBtn.setAttribute("aria-pressed", String(shuffleEnabled));
        shuffleBtn.title = shuffleEnabled ? "Tat phat ngau nhien" : "Bat phat ngau nhien";
        shuffleBtn.setAttribute("aria-label", shuffleBtn.title);
    }
    if (repeatBtn) {
        repeatBtn.classList.toggle("active", repeatMode !== "none");
        repeatBtn.dataset.repeatMode = repeatMode;
        repeatBtn.setAttribute("aria-pressed", String(repeatMode !== "none"));
        repeatBtn.title = { none: "Khong lap", all: "Lap tat ca", one: "Lap mot bai" }[repeatMode];
        repeatBtn.setAttribute("aria-label", repeatBtn.title);
        const icon = document.getElementById("repeatIcon");
        if (icon) icon.dataset.mode = repeatMode;
    }
}

function updateVolumeIcon(state) {
    if (!volumeBtn) return;
    const silent = state.muted || state.volume === 0;
    volumeBtn.title = silent ? "Bat am thanh" : "Tat am thanh";
    volumeBtn.setAttribute("aria-label", volumeBtn.title);
    volumeBtn.setAttribute("aria-pressed", String(silent));
    volumeBtn.classList.toggle("is-muted", silent);
    const icon = document.getElementById("volumeIcon");
    if (icon) icon.dataset.level = silent ? "mute" : state.volume <= 0.5 ? "down" : "up";
}

function initializeMediaV2() {
    if (mediaV2Initialized) return true;

    if (
        !audioPlayer ||
        !window.SongServiceV2_1 ||
        !window.PlayerControllerV2_1 ||
        !window.PlayerUIV2_1 ||
        !window.PlaylistControllerV2_1
    ) {
        console.error("Thiếu module MediaHz V2.1 hoặc audioPlayer.");
        return false;
    }

    window.PlayerControllerV2_1.init({ audioElement: audioPlayer });

    window.PlayerUIV2_1.init({
        songNameSelector: ".song-name",
        artistSelector: ".artist-name",
        coverSelector: "#albumCover",
        playButtonSelector: "#playPauseBtn",
        progressSelector: "#seekbar",
        currentTimeSelector: "#currentTime",
        durationSelector: "#endTime",
        // PlayerUIV2_1 dùng volume 0..1, HTML hiện tại dùng 0..100 nên xử lý riêng ở media_default.js.
        // volumeSelector: "#volumeSlider",
        volumeSelector: "#mediaV2UnusedVolumeSlider",
        muteButtonSelector: "#volumeBtn",
    });

    window.PlayerControllerV2_1.subscribe(function (state) {
        if (mediaControlBar) {
            mediaControlBar.classList.toggle("active", state.status !== "idle");
            mediaControlBar.classList.toggle("hidden", state.status === "idle");
        }

        updatePlayPauseIcon(state.status === "playing");
        updateTrackTargets(state);
        sendTrackPlayback(state);
        window.SongEngagementV2_1?.observePlayback(state);
        const queue = window.PlaylistControllerV2_1.getState();
        const song = state.currentSong;
        if (song) {
            const stored = queue.songs.find(item => item.id === song.id);
            if (stored && (stored.name !== song.name || stored.artist !== song.artist || stored.image !== song.image || stored.duration !== song.duration)) {
                window.PlaylistControllerV2_1.setPlaylist(
                    queue.songs.map(item => item.id === song.id ? { ...item, ...song } : item),
                    { currentSongId: song.id },
                );
            }
        }
        updateQueuePlayback(state);
        updateVolumeIcon(state);

        if (volumeSlider) {
            // volumeSlider.value = String(Math.round(state.volume * 100));
            const value = state.muted ? 0 : Math.round(state.volume * 100);
            volumeSlider.value = String(value);
            volumeSlider.style.setProperty("--volume-progress", `${value}%`);
//             if (volumeBtn) {
//                 volumeBtn.title = value === 0 ? "Bat am thanh" : "Tat am thanh";
//                 volumeBtn.setAttribute("aria-label", volumeBtn.title);
//                 volumeBtn.classList.toggle("is-muted", value === 0);
//             }
            window.parent.postMessage({ type: "volumeState", value }, window.location.origin);
        }
    });

    // window.PlaylistControllerV2_1.subscribe(renderPlaylist);
    window.PlaylistControllerV2_1.subscribe(state => {
        repeatMode = state.repeat;
        shuffleEnabled = state.shuffle;
        updateModeButtons();
        renderPlaylist(state);
    });
// Previous anchor navigation handler:
//     document.querySelectorAll("[data-track-page]").forEach(link => link.addEventListener("click", event => {
//         const song = window.PlayerControllerV2_1.getState().currentSong;
//         if (!song) { event.preventDefault(); return; }
//         if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
//         event.preventDefault();
//         window.parent.postMessage({ type: "trackNavigate", songId: song.id }, window.location.origin);
//     }));
    document.querySelectorAll("[data-track-page]").forEach(button => button.addEventListener("click", event => {
        event.preventDefault();
        const song = window.PlayerControllerV2_1.getState().currentSong;
        if (!song) return;
        const path = "/home/song/" + encodeURIComponent(song.id);
        if (window.parent.location.pathname.replace(/\/+$/, "") === path) return;
        window.parent.postMessage({ type: "trackNavigate", songId: song.id }, window.location.origin);
    }));
    mediaV2Initialized = true;
    return true;
}

function sendTrackPlayback(state = window.PlayerControllerV2_1.getState()) {
    window.parent.postMessage({ type: "trackPlayback", songId: state.currentSong?.id || null,
        status: state.status, currentTime: state.currentTime, duration: state.duration }, window.location.origin);
}
// Previous href updates for anchor controls:
// function updateTrackLinks(state) {
//     const id = state.currentSong?.id;
//     document.querySelectorAll("[data-track-page]").forEach(link => {
//         link.href = id ? "/home/song/" + encodeURIComponent(id) : "#";
//         link.setAttribute("aria-disabled", String(!id));
//         link.tabIndex = id ? 0 : -1;
//     });
// }
function updateTrackTargets(state) {
    const enabled = Boolean(state.currentSong?.id);
    document.querySelectorAll("[data-track-page]").forEach(button => {
        button.disabled = !enabled;
        button.setAttribute("aria-disabled", String(!enabled));
        button.tabIndex = enabled ? 0 : -1;
    });
}
function updatePlayPauseIcon(isPlaying) {
    if (!playPauseIcon) return;

    playPauseIcon.classList.toggle("bi-play-circle", !isPlaying);
    playPauseIcon.classList.toggle("bi-pause-circle", isPlaying);

    if (isPlaying) {
        playPauseIcon.innerHTML = '<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M5 6.25a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0zm3.5 0a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0z"/>';
    } else {
        playPauseIcon.innerHTML = '<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M6.271 5.055a.5.5 0 0 1 .52.038l3.5 2.5a.5.5 0 0 1 0 .814l-3.5 2.5A.5.5 0 0 1 6 10.5v-5a.5.5 0 0 1 .271-.445"/>';
    }
}

function addSongToPlaylist(song) {
    const playlistState = window.PlaylistControllerV2_1.getState();
    const songs = playlistState.songs.some((item) => item.id === song.id)
        ? playlistState.songs
        : playlistState.songs.concat(song);

    window.PlaylistControllerV2_1.setPlaylist(songs, {
        currentSongId: song.id,
        restoreSongId: song.id,
    });
}

// async function playPlaylistSong(song) {
//     if (!song) return;
//
//     window.PlaylistControllerV2_1.setCurrentSong(song.id);
//     await window.PlayerControllerV2_1.playSong(song.id);
// }
//
// async function playNextSong() {
//     const nextSong = shuffleEnabled
//         ? getRandomPlaylistSong()
//         : window.PlaylistControllerV2_1.getNextSong({
//             repeat: repeatMode === "all",
//         });
//
//     if (nextSong) {
//         await playPlaylistSong(nextSong);
//     }
// }
//
// async function playPreviousSong() {
//     const previousSong = window.PlaylistControllerV2_1.getPreviousSong();
//
//     if (previousSong) {
//         await playPlaylistSong(previousSong);
//     }
// }
//
// function getRandomPlaylistSong() {
//     const state = window.PlaylistControllerV2_1.getState();
//
//     if (state.songs.length === 0) return null;
//     if (state.songs.length === 1) return state.songs[0];
//
//     let index = state.currentIndex;
//
//     while (index === state.currentIndex) {
//         index = Math.floor(Math.random() * state.songs.length);
//     }
//
//     return state.songs[index];
// }
//
// window.handleItemClick = async function (mp3Id, mp3Name, categoryId) {
//     if (!initializeMediaV2()) return;
//
//     try {
//         const song = {
//             id: String(mp3Id),
//             name: mp3Name || "Unknown Song",
//             categoryId: categoryId || null,
//         };
//
//         addSongToPlaylist(song);
//
//         const state = await window.PlayerControllerV2_1.playSong(song.id, options);
//
//         if (options.autoplay !== false && state?.currentSong && window.HistoryServiceV2_1) {
//             window.HistoryServiceV2_1.recordPlayed(state.currentSong);
//         }
//     } catch (error) {
//         console.error("Không thể phát bài hát bằng MediaHz V2.1:", error);
//     }
// };
let selectionVersion = 0;
// Previous: async function playPlaylistSong(song)
async function playPlaylistSong(song, options = {}) {
    if (!song) return null;
    window.PlaylistControllerV2_1.setCurrentSong(song.id);
    const state = await window.PlayerControllerV2_1.playSong(song.id, options);
    if (options.autoplay !== false && state?.currentSong && window.HistoryServiceV2_1) {
        window.HistoryServiceV2_1.recordPlayed(state.currentSong);
    }
    return state;
}

async function playNextSong(options = {}) {
    // Manual next wraps as in V2; automatic advance only wraps for Repeat All.
    const queue = window.PlaylistControllerV2_1.getState();
    const next = window.PlaylistControllerV2_1.getNextSong({
        repeat: options.automatic ? queue.repeat === "all" : true,
    });
    if (next) await playPlaylistSong(next);
}

async function playPreviousSong() {
    const previous = window.PlaylistControllerV2_1.getPreviousSong({ repeat: true });
    if (previous) await playPlaylistSong(previous);
}

// Previous selection handler reloaded and replaced the whole category on every click.
  // window.handleItemClick = async function (mp3Id, mp3Name, categoryId) {
  //     if (!initializeMediaV2()) return;
  //     const version = ++selectionVersion;
  //     const song = { id: String(mp3Id), name: mp3Name || "Unknown Song", categoryId: categoryId || null };
  //     try {
  //         addSongToPlaylist(song);
  //         const state = await playPlaylistSong(song);
  //         if (version !== selectionVersion || !state?.currentSong) return;
  //         const selected = { ...song, ...state.currentSong };
  //         const category = selected.categoryId || categoryId;
  //         if (!category) return;
  //         try {
  //             const songs = await window.SongServiceV2_1.getSongsByCategory(String(category));
  //             // Ignore a stale category request after another song was selected.
  //             if (version !== selectionVersion || window.PlayerControllerV2_1.getState().currentSong?.id !== selected.id) return;
  //             const items = songs.some(item => item.id === selected.id)
  //                 ? songs.map(item => item.id === selected.id ? selected : item)
  //                 : [selected, ...songs];
  //             window.PlaylistControllerV2_1.setPlaylist(items, { currentSongId: selected.id });
  //         } catch (error) {
  //             console.error("Cannot load category playlist:", error);
  //         }
  //     } catch (error) {
  //         console.error("Cannot play selected song:", error);
  //     }
  // };
window.handleItemClick = async function (mp3Id, mp3Name, categoryId) {
    if (!initializeMediaV2()) return;
    const queue = window.PlaylistControllerV2_1;
    const before = queue.getState();
    const seedQueue = !before.initialized;
    const version = ++selectionVersion;
    const song = { id: String(mp3Id), name: mp3Name || "Unknown Song", categoryId: categoryId || null };
    try {
        // An explicit choice restores only this song, never the entire category.
        addSongToPlaylist(song);
        const state = await playPlaylistSong(song);
        if (!seedQueue || version !== selectionVersion || !state?.currentSong) return;
        const selected = { ...song, ...state.currentSong };
        const category = selected.categoryId || categoryId;
        if (!category) return;
        try {
            const candidates = await window.SongServiceV2_1.getSongsByCategory(String(category));
            const currentQueue = queue.getState();
            // Discard late suggestions after a selection, deletion, reorder or queue reset.
            if (version !== selectionVersion || currentQueue.generation !== before.generation ||
                currentQueue.editVersion !== before.editVersion ||
                window.PlayerControllerV2_1.getState().currentSong?.id !== selected.id) return;
            queue.appendSongs(candidates);
        } catch (error) {
            console.error("Cannot load initial queue suggestions:", error);
        }
    } catch (error) {
        console.error("Cannot play selected song:", error);
    }
};
async function handleKeyboardControl(data) {
    if (!initializeMediaV2()) return;

    const action = data.action;
    const state = window.PlayerControllerV2_1.getState();
    const seconds = Number(data.seconds) || 5;

    try {
        if (action === "togglePlayPause") {
            await window.PlayerControllerV2_1.togglePlayPause();
        } else if (action === "nextSong") {
            await playNextSong();
        } else if (action === "prevSong") {
            await playPreviousSong();
        } else if (action === "seekForward") {
            window.PlayerControllerV2_1.seek(state.currentTime + seconds);
        } else if (action === "seekBackward") {
            window.PlayerControllerV2_1.seek(Math.max(0, state.currentTime - seconds));
        } else if (action === "toggleMute") {
            window.PlayerControllerV2_1.toggleMute();
        } else if (action === "volumeUp") {
            window.PlayerControllerV2_1.setVolume(
                Math.min(1, state.volume + (Number(data.amount) || 10) / 100)
            );
        } else if (action === "volumeDown") {
            window.PlayerControllerV2_1.setVolume(
                Math.max(0, state.volume - (Number(data.amount) || 10) / 100)
            );
        }
    } catch (error) {
        console.error("Không thể xử lý keyboard control:", error);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    initializeMediaV2();
    updateModeButtons();

    if (nextBtn) {
        nextBtn.addEventListener("click", function () {
            playNextSong().catch((error) => {
                console.error("Không thể chuyển bài tiếp theo:", error);
            });
        });
    }

    if (backBtn) {
        backBtn.addEventListener("click", function () {
            playPreviousSong().catch((error) => {
                console.error("Không thể quay lại bài trước:", error);
            });
        });
    }

    if (shuffleBtn) {
        shuffleBtn.addEventListener("click", function () {
            // shuffleEnabled = !shuffleEnabled;
            window.PlaylistControllerV2_1.setShuffle(!window.PlaylistControllerV2_1.getState().shuffle);
            // shuffleBtn.classList.toggle("active", shuffleEnabled);
            updateModeButtons();
        });
    }

    if (volumeBtn) {
        const showVolumePopup = () => {
            volumeHovered = true;
            const rect = volumeBtn.getBoundingClientRect();
            const state = window.PlayerControllerV2_1.getState();
            volumeBtn.setAttribute("aria-expanded", "true");
            window.parent.postMessage({
                type: "volumePopup",
                action: "show",
                volume: state.muted ? 0 : Math.round(state.volume * 100),
                buttonRect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
            }, window.location.origin);
        };
        volumeBtn.addEventListener("mouseenter", showVolumePopup);
        volumeBtn.addEventListener("focus", showVolumePopup);
        const leaveVolumePopup = () => {
            volumeHovered = false;
            volumeBtn.setAttribute("aria-expanded", "false");
            window.parent.postMessage({ type: "volumePopup", action: "hide" }, window.location.origin);
        };
        volumeBtn.addEventListener("mouseleave", leaveVolumePopup);
        volumeBtn.addEventListener("blur", leaveVolumePopup);
    }

    if (volumeSlider) {
        volumeSlider.addEventListener("input", function () {
            // window.PlayerControllerV2_1.setVolume(Number(volumeSlider.value) / 100);
            const value = Number(volumeSlider.value) / 100;
            if (value > 0 && window.PlayerControllerV2_1.getState().muted) {
                window.PlayerControllerV2_1.toggleMute();
            }
            window.PlayerControllerV2_1.setVolume(value);
        });
    }

    if (repeatBtn) {
        repeatBtn.addEventListener("click", function () {
            // repeatMode = repeatMode === "none" ? "all" : "none";
            // repeatBtn.classList.toggle("active", repeatMode !== "none");
            // repeatBtn.title = repeatMode === "all" ? "Repeat All" : "No Repeat";
            // repeatMode = repeatMode === "none" ? "all" : repeatMode === "all" ? "one" : "none";
            window.PlaylistControllerV2_1.cycleRepeat();
            updateModeButtons();
        });
    }

    if (audioPlayer) {
        audioPlayer.addEventListener("ended", function () {
            if (repeatMode === "one") {
                audioPlayer.currentTime = 0;
                // audioPlayer.play();
                audioPlayer.play().catch(error => console.error("Cannot repeat song:", error));
                return;
            }

            playNextSong({ automatic: true }).catch((error) => {
                console.error("Không thể tự động chuyển bài:", error);
            });
        });
    }

    // V2 pauses playback in other tabs when this tab starts playing.
    let audioSyncChannel = null;
    if (typeof window.BroadcastChannel === "function") {
        try {
            audioSyncChannel = new window.BroadcastChannel("audio_sync_channel");
            audioSyncChannel.addEventListener("message", event => {
                if (event.data?.type === "AUDIO_PLAY" && !audioPlayer.paused) audioPlayer.pause();
            });
            audioPlayer.addEventListener("play", () => audioSyncChannel.postMessage({ type: "AUDIO_PLAY" }));
            window.addEventListener("pagehide", () => audioSyncChannel.close(), { once: true });
        } catch (error) {
            console.warn("Cannot synchronize audio tabs:", error);
        }
    }
    document.addEventListener("keydown", event => {
        const target = event.target;
        if (target.closest("input, textarea, select, button, [contenteditable='true']")) return;
        const actions = {
            " ": "togglePlayPause", ArrowRight: "seekForward", ArrowLeft: "seekBackward",
            ArrowUp: "volumeUp", ArrowDown: "volumeDown", m: "toggleMute", M: "toggleMute",
        };
        if (actions[event.key]) {
            event.preventDefault();
            handleKeyboardControl({ action: actions[event.key] });
        }
    });

    // Chỉ nhận thông điệp chọn bài hát từ cửa sổ cha.
    // Không gắn thêm click listener cho .song-item ở đây,
    // vì danh sách bài hát được xử lý ở trang Home.
    window.addEventListener("message", function (event) {
        const data = event.data;

        // if (event.source !== window.parent || !data) {
        if (event.source !== window.parent || event.origin !== window.location.origin || !data) {
            return;
        }

        if (data.type === "trackStateRequest") {
            if (initializeMediaV2()) sendTrackPlayback();
            return;
        }
        if (data.type === "trackToggle" && typeof data.songId === "string") {
            if (!initializeMediaV2()) return;
            if (window.PlayerControllerV2_1.getState().currentSong?.id === data.songId) {
                window.PlayerControllerV2_1.togglePlayPause().catch(error => console.error("Cannot toggle track:", error));
            } else window.handleItemClick(data.songId, data.name, data.categoryId);
            return;
        }
        if (data.type === "trackSeek") {
            if (initializeMediaV2() && window.PlayerControllerV2_1.getState().currentSong?.id === data.songId && Number.isFinite(data.seconds)) {
                window.PlayerControllerV2_1.seek(data.seconds);
            }
            return;
        }
        if (data.type === "queueReady") {
            if (initializeMediaV2()) sendQueueState();
            return;
        }
        if (data.type === "queueMove") {
            if (initializeMediaV2()) window.PlaylistControllerV2_1.moveSong(data.songId, data.toIndex);
            return;
        }
        if (data.type === "queueRemove") {
            if (!initializeMediaV2()) return;
            const queue = window.PlaylistControllerV2_1.getState();
            if (!queue.songs.some(song => song.id === data.songId)) return;
            const player = window.PlayerControllerV2_1;
            const state = player.getState();
            const removingCurrent = queue.currentSong?.id === data.songId || state.currentSong?.id === data.songId;
            if (removingCurrent) {
                selectionVersion++;
                player.stop();
            }
            const next = window.PlaylistControllerV2_1.removeSong(data.songId);
            if (removingCurrent && next.currentSong) {
                playPlaylistSong(next.currentSong, { autoplay: state.status === "playing" || state.status === "loading" })
                    .catch(error => console.error("Cannot play next queued song:", error));
            }
            return;
        }
        if (data.type === "queueSelect") {
            const song = window.PlaylistControllerV2_1.getState().songs.find(item => item.id === data.songId);
            if (song) playPlaylistSong(song).catch(error => console.error("Cannot play queued song:", error));
            return;
        }
        if (data.type === "queueClose") {
            setPlaylistOpen(false);
            if (data.restoreFocus) togglePlaylistBtn?.focus();
            return;
        }

        if (data.type === "songSelected" && data.mp3Id) {
            window.handleItemClick(
                data.mp3Id,
                data.mp3Name || "Unknown Song",
                data.categoryId || null
            );
            return;
        }

        if (data.type === "keyboardControl") {
            handleKeyboardControl(data);
            return;
        }

        if (data.type === "setVolume" && audioPlayer) {
            // window.PlayerControllerV2_1.setVolume(Number(data.value) / 100);
            const value = Number(data.value) / 100;
            if (value > 0 && window.PlayerControllerV2_1.getState().muted) {
                window.PlayerControllerV2_1.toggleMute();
            }
            window.PlayerControllerV2_1.setVolume(value);
            return;
        }

        if (data.type === "checkVolumeHover") {
            window.parent.postMessage({
                type: "volumeHoverResponse",
                // isHovered: false,
                isHovered: volumeHovered,
            }, "*");
        }
    });

//     // Đóng/mở danh sách phát.
//     if (togglePlaylistBtn && playlistPopup) {
//         togglePlaylistBtn.addEventListener("click", function () {
//             const isHidden =
//                 window.getComputedStyle(playlistPopup).display === "none";
//
//             playlistPopup.style.display = isHidden ? "block" : "none";
//
//             window.parent.postMessage({
//                 type: "playlistState",
//                 isExpanded: isHidden,
//             }, "*");
//         });
//     }
    if (playlistPopup) {
        playlistPopup.setAttribute("aria-hidden", "true");
        playlistPopup.inert = true;
    }
    togglePlaylistBtn?.addEventListener("click", () => setPlaylistOpen(!playlistOpen));
    document.getElementById("closeQueueBtn")?.addEventListener("click", () => {
        setPlaylistOpen(false);
        togglePlaylistBtn?.focus();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && playlistOpen) {
            setPlaylistOpen(false);
            togglePlaylistBtn?.focus();
        }
    });
    document.addEventListener("click", event => {
        if (playlistOpen && !playlistPopup.contains(event.target) && !togglePlaylistBtn?.contains(event.target)) {
            setPlaylistOpen(false);
        }
    });
});

