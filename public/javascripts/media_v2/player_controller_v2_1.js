/**
 * MediaHz V2.1
 * File: public/javascripts/media_v2/player_controller_v2_1.js
 *
 * Nhiệm vụ:
 * - Điều khiển phát, tạm dừng và chuyển bài.
 * - Quản lý tiến trình, âm lượng và trạng thái audio.
 * - Nhận metadata từ SongServiceV2_1.
 *
 * Chưa phụ thuộc vào giao diện EJS cụ thể.
 */
(function (window) {
  "use strict";

  let audio = null;
  let initialized = false;
  let currentSong = null;
  let requestId = 0;

  const listeners = new Set();

  const state = {
    status: "idle",
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    error: null,
  };

  function getState() {
    return {
      ...state,
      currentSong: currentSong ? { ...currentSong } : null,
    };
  }

  function emitState() {
    const snapshot = getState();

    listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("[PlayerControllerV2_1] State listener error:", error);
      }
    });
  }

  function updateState(patch) {
    Object.assign(state, patch);
    emitState();
  }

  function requireInitialized() {
    if (!initialized || !audio) {
      throw new Error("PlayerControllerV2_1 chưa được khởi tạo.");
    }
  }

  function handleTimeUpdate() {
    if (!audio) return;

    updateState({
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
    });
  }

  function handleMetadataLoaded() {
    if (!audio) return;

    updateState({
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
    });
  }

  function handlePlay() {
    updateState({ status: "playing", error: null });
  }

  function handlePause() {
    if (!audio) return;

    // Không ghi đè trạng thái ended thành paused.
    if (!audio.ended) {
      updateState({ status: "paused" });
    }
  }

  function handleEnded() {
    updateState({
      status: "ended",
      currentTime: state.duration || state.currentTime,
    });
  }

  function handleError() {
    updateState({
      status: "error",
      error: "Không thể phát bài hát. Hãy kiểm tra dữ liệu audio hoặc kết nối.",
    });
  }

  function handleVolumeChange() {
    if (!audio) return;

    updateState({
      volume: audio.volume,
      muted: audio.muted,
    });
  }

  function init(options = {}) {
    if (initialized) {
      return getState();
    }

    const audioElement = options.audioElement;

    if (!(audioElement instanceof HTMLAudioElement)) {
      throw new Error(
        "Cần truyền một HTMLAudioElement hợp lệ vào init()."
      );
    }

    if (!window.SongServiceV2_1) {
      throw new Error("Chưa tải SongServiceV2_1.");
    }

    audio = audioElement;

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleMetadataLoaded);
    audio.addEventListener("durationchange", handleMetadataLoaded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("volumechange", handleVolumeChange);

    initialized = true;

    updateState({
      status: audio.paused ? "idle" : "playing",
      currentTime: audio.currentTime || 0,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      volume: audio.volume,
      muted: audio.muted,
      error: null,
    });

    return getState();
  }

  async function playSong(songId) {
    requireInitialized();

    if (!songId || typeof songId !== "string") {
      throw new Error("songId không hợp lệ.");
    }

    const thisRequestId = ++requestId;

    updateState({
      status: "loading",
      error: null,
    });

    try {
      const song = await window.SongServiceV2_1.getSongById(songId);

      // Bỏ qua yêu cầu cũ nếu người dùng đã chọn bài khác.
      if (thisRequestId !== requestId) return null;

      const streamUrl = window.SongServiceV2_1.getStreamUrl(song.id);

      currentSong = song;

      // Gán URL trực tiếp cho audio thay vì tải Base64 vào bộ nhớ.
      audio.pause();
      audio.src = streamUrl;
      audio.load();

      updateState({
        status: "loading",
        currentTime: 0,
        duration: 0,
        error: null,
      });

      await audio.play();

      if (thisRequestId !== requestId) return null;

      return getState();
    } catch (error) {
      if (thisRequestId !== requestId) return null;

      // play() có thể bị trình duyệt từ chối hoặc bị ngắt khi đổi bài.
      if (error?.name === "AbortError") {
        return null;
      }

      const message =
        error?.message || "Không thể phát bài hát.";

      updateState({
        status: "error",
        error: message,
      });

      throw error;
    }
  }

  async function resume() {
    requireInitialized();

    if (!audio.src) {
      throw new Error("Chưa có bài hát để phát.");
    }

    try {
      await audio.play();
    } catch (error) {
      updateState({
        status: "error",
        error: error?.message || "Không thể tiếp tục phát nhạc.",
      });

      throw error;
    }
  }

  function pause() {
    requireInitialized();
    audio.pause();
  }

  async function togglePlayPause() {
    requireInitialized();

    if (audio.paused) {
      return resume();
    }

    pause();
    return getState();
  }

  function seek(seconds) {
    requireInitialized();

    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new Error("Vị trí seek không hợp lệ.");
    }

    if (!Number.isFinite(audio.duration)) return;

    audio.currentTime = Math.min(seconds, audio.duration);
  }

  function setVolume(value) {
    requireInitialized();

    if (!Number.isFinite(value)) {
      throw new Error("Âm lượng không hợp lệ.");
    }

    audio.volume = Math.max(0, Math.min(1, value));
  }

  function toggleMute() {
    requireInitialized();
    audio.muted = !audio.muted;
    return audio.muted;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new Error("listener phải là một function.");
    }

    listeners.add(listener);

    // Gửi trạng thái hiện tại ngay khi đăng ký.
    listener(getState());

    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  function destroy() {
    if (!initialized || !audio) return;

    // Vô hiệu hóa những yêu cầu playSong() đang chờ.
    requestId++;

    audio.pause();
    audio.removeEventListener("timeupdate", handleTimeUpdate);
    audio.removeEventListener("loadedmetadata", handleMetadataLoaded);
    audio.removeEventListener("durationchange", handleMetadataLoaded);
    audio.removeEventListener("play", handlePlay);
    audio.removeEventListener("pause", handlePause);
    audio.removeEventListener("ended", handleEnded);
    audio.removeEventListener("error", handleError);
    audio.removeEventListener("volumechange", handleVolumeChange);

    audio = null;
    currentSong = null;
    initialized = false;

    updateState({
      status: "idle",
      currentTime: 0,
      duration: 0,
      error: null,
    });
  }

  window.PlayerControllerV2_1 = Object.freeze({
    init,
    playSong,
    resume,
    pause,
    togglePlayPause,
    seek,
    setVolume,
    toggleMute,
    getState,
    subscribe,
    destroy,
  });
})(window);