/**
 * MediaHz V2.1
 * File: public/javascripts/media_v2/playlist_controller_v2_1.js
 *
 * Nhiệm vụ:
 * - Quản lý danh sách phát.
 * - Theo dõi bài hát hiện tại.
 * - Chuyển bài tiếp theo / trước đó.
 * - Không gọi API và không thao tác trực tiếp với HTMLAudioElement.
 */
(function (window) {
  "use strict";

  let songs = [];
  let currentIndex = -1;
  let originalOrder = [];
  let shuffle = false;
  let repeat = "none";

  const listeners = new Set();

  function getState() {
    return {
      songs: songs.map((song) => ({ ...song })),
      currentIndex,
      shuffle,
      repeat,
      currentSong:
        currentIndex >= 0 && currentIndex < songs.length
          ? { ...songs[currentIndex] }
          : null,
      length: songs.length,
    };
  }

  function emitState() {
    const snapshot = getState();

    listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error(
          "[PlaylistControllerV2_1] Listener error:",
          error
        );
      }
    });
  }

  function setPlaylist(items, options = {}) {
    if (!Array.isArray(items)) {
      throw new Error("Danh sách phát phải là một mảng.");
    }

    songs = items.filter(
      (song) =>
        song &&
        typeof song === "object" &&
        (song.id || song._id || song.songID)
    ).map((song) => ({
      ...song,
      id: String(song.id ?? song._id ?? song.songID),
      name: song.name || "Unknown Song",
      artist: song.artist || "Unknown Artist",
    }));

    const latest = new Map(songs.map(song => [song.id, song]));
    const sameMembers = originalOrder.length === songs.length && originalOrder.every(song => latest.has(song.id));
    originalOrder = sameMembers
      ? originalOrder.map(song => ({ ...latest.get(song.id) }))
      : songs.map(song => ({ ...song }));

    const requestedId = options.currentSongId
      ? String(options.currentSongId)
      : null;

    if (requestedId) {
      currentIndex = songs.findIndex((song) => song.id === requestedId);
    } else {
      currentIndex = songs.length > 0 ? 0 : -1;
    }

    if (shuffle && !sameMembers) arrangeShuffled(requestedId);
    emitState();
    return getState();
  }

  function setCurrentSong(songId) {
    if (!songId) {
      throw new Error("songId không hợp lệ.");
    }

    const index = songs.findIndex(
      (song) => song.id === String(songId)
    );

    if (index === -1) {
      throw new Error("Bài hát không nằm trong danh sách phát.");
    }

    currentIndex = index;
    emitState();

    return getState();
  }

  function arrangeShuffled(currentId) {
    const current = songs.find(song => song.id === currentId);
    const rest = songs.filter(song => song.id !== currentId);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    songs = current ? [current, ...rest] : rest;
    currentIndex = current ? 0 : (songs.length ? 0 : -1);
  }

  function setShuffle(enabled) {
    if (shuffle === Boolean(enabled)) return getState();
    const currentId = songs[currentIndex]?.id;
    shuffle = Boolean(enabled);
    if (shuffle) arrangeShuffled(currentId);
    else {
      songs = originalOrder.map(song => ({ ...song }));
      const index = songs.findIndex(song => song.id === currentId);
      // V2 restores the original order, with the current song at the top.
      if (index > 0) songs.unshift(...songs.splice(index, 1));
      currentIndex = songs.length ? 0 : -1;
    }
    emitState();
    return getState();
  }

  function cycleRepeat() {
    repeat = repeat === "none" ? "one" : repeat === "one" ? "all" : "none";
    emitState();
    return getState();
  }

  function getNextSong(options = {}) {
    if (songs.length === 0) return null;

    const repeat = options.repeat === true;

    if (currentIndex < 0) {
      return { ...songs[0], index: 0 };
    }

    const nextIndex = currentIndex + 1;

    if (nextIndex >= songs.length) {
      if (!repeat) return null;

      return { ...songs[0], index: 0 };
    }

    return { ...songs[nextIndex], index: nextIndex };
  }

//   function getPreviousSong() {
//     if (songs.length === 0) return null;
//
//     if (currentIndex <= 0) {
//       return null;
//     }
//
//     const previousIndex = currentIndex - 1;
//
//     return {
//       ...songs[previousIndex],
//       index: previousIndex,
//     };
//   }
  function getPreviousSong(options = {}) {
    if (!songs.length) return null;
    const previousIndex = currentIndex <= 0
      ? (options.repeat ? songs.length - 1 : -1)
      : currentIndex - 1;
    return previousIndex < 0 ? null : { ...songs[previousIndex], index: previousIndex };
  }
  function moveTo(index) {
    if (!Number.isInteger(index) || index < 0 || index >= songs.length) {
      throw new Error("Vị trí bài hát không hợp lệ.");
    }

    currentIndex = index;
    emitState();

    return getState();
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new Error("listener phải là một function.");
    }

    listeners.add(listener);
    listener(getState());

    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  function clear() {
    songs = [];
    originalOrder = [];
    currentIndex = -1;
    emitState();
  }

  window.PlaylistControllerV2_1 = Object.freeze({
    setPlaylist,
    setShuffle,
    cycleRepeat,
    setCurrentSong,
    getNextSong,
    getPreviousSong,
    moveTo,
    getState,
    subscribe,
    clear,
  });
})(window);