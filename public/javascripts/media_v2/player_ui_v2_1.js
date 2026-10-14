/**
 * MediaHz V2.1
 * File: public/javascripts/media_v2/player_ui_v2_1.js
 *
 * Nhiệm vụ:
 * - Kết nối PlayerControllerV2_1 với các phần tử giao diện.
 * - Cập nhật tên bài hát, trạng thái phát và thanh tiến trình.
 * - Không tự gọi API và không xử lý dữ liệu audio.
 */
(function (window, document) {
  "use strict";

  let unsubscribe = null;
  let controller = null;
  let elements = {};
  let initialized = false;

  function findElements(selectors) {
    const result = {};

    Object.entries(selectors).forEach(([key, selector]) => {
      result[key] = document.querySelector(selector);
    });

    return result;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  function updateProgress(value) {
    if (!elements.progress) return;
    const percentage = Number.isFinite(value)
      ? Math.max(0, Math.min(100, value))
      : 0;
    elements.progress.value = percentage;
    const progressValue = `${percentage}%`;
    elements.progress.style.setProperty("--progress", progressValue);
    elements.progress.parentElement?.style.setProperty("--progress", progressValue);
  }

  function render(state) {
    if (elements.songName) {
      elements.songName.textContent =
        state.currentSong?.name || "Chưa chọn bài hát";
    }

    if (elements.artist) {
      elements.artist.textContent =
        state.currentSong?.artist || "Unknown Artist";
    }

    if (elements.cover && state.currentSong?.image) {
      elements.cover.src = state.currentSong.image;
    }

    if (elements.playButton) {
      const isPlaying = state.status === "playing";

      elements.playButton.setAttribute(
        "aria-label",
        isPlaying ? "Tạm dừng" : "Phát nhạc"
      );

      elements.playButton.dataset.playerStatus = state.status;
    }

    if (elements.currentTime) {
      elements.currentTime.textContent = formatTime(state.currentTime);
    }

    if (elements.duration) {
      elements.duration.textContent = formatTime(state.duration);
    }

    // Previous update only moved the thumb, without updating the CSS fill:
    // if (elements.progress && state.duration > 0) {
    //   elements.progress.value = Math.min(
    //     100,
    //     (state.currentTime / state.duration) * 100
    //   );
    // } else if (elements.progress) {
    //   elements.progress.value = 0;
    // }
    updateProgress(state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0);

    if (elements.volume) {
      elements.volume.value = String(state.volume);
    }

    if (elements.muteButton) {
      elements.muteButton.setAttribute(
        "aria-pressed",
        String(state.muted)
      );
    }

    if (elements.error) {
      elements.error.textContent = state.error || "";
      elements.error.hidden = !state.error;
    }
  }

  function bindEvents() {
    if (elements.playButton) {
      elements.playButton.addEventListener("click", async () => {
        try {
          await controller.togglePlayPause();
        } catch (error) {
          console.error("[PlayerUIV2_1] Play/pause error:", error);
        }
      });
    }

    if (elements.progress) {
      elements.progress.addEventListener("input", () => {
        updateProgress(Number(elements.progress.value));
        const state = controller.getState();

        if (state.duration > 0) {
          controller.seek(
            (Number(elements.progress.value) / 100) * state.duration
          );
        }
      });
    }

    if (elements.volume) {
      elements.volume.addEventListener("input", () => {
        controller.setVolume(Number(elements.volume.value));
      });
    }

    if (elements.muteButton) {
      elements.muteButton.addEventListener("click", () => {
        controller.toggleMute();
      });
    }
  }

  function init(options = {}) {
    if (initialized) return;

    controller = window.PlayerControllerV2_1;

    if (!controller) {
      throw new Error("Chưa tải PlayerControllerV2_1.");
    }

    const selectors = {
      songName: options.songNameSelector || "[data-player-song-name]",
      artist: options.artistSelector || "[data-player-artist]",
      cover: options.coverSelector || "[data-player-cover]",
      playButton: options.playButtonSelector || "[data-player-play]",
      progress: options.progressSelector || "[data-player-progress]",
      currentTime: options.currentTimeSelector || "[data-player-current-time]",
      duration: options.durationSelector || "[data-player-duration]",
      volume: options.volumeSelector || "[data-player-volume]",
      muteButton: options.muteButtonSelector || "[data-player-mute]",
      error: options.errorSelector || "[data-player-error]",
    };

    elements = findElements(selectors);

    bindEvents();
    unsubscribe = controller.subscribe(render);
    initialized = true;
  }

  function destroy() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    initialized = false;
    controller = null;
    elements = {};
  }

  window.PlayerUIV2_1 = Object.freeze({
    init,
    destroy,
    formatTime,
  });
})(window, document);