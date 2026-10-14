/**
 * MediaHz V2.1
 * File: public/javascripts/media_v2/history_service_v2_1.js
 *
 * Nhiệm vụ:
 * - Ghi nhận bài hát vừa phát.
 * - Lưu lịch sử tạm thời trong phiên trình duyệt.
 * - Cung cấp lịch sử cho giao diện.
 *
 * Lưu ý:
 * Đây là bản lưu tạm ở trình duyệt, chưa ghi vào MongoDB.
 * Khi xác nhận API lịch sử hiện có, ta sẽ thay phần lưu trữ
 * bằng lời gọi backend mà không cần sửa Player Controller.
 */
(function (window) {
  "use strict";

  const MAX_HISTORY = 100;
  let history = [];
  const listeners = new Set();

  function normalizeSong(song) {
    if (!song || typeof song !== "object") {
      throw new Error("Thông tin bài hát không hợp lệ.");
    }

    const id = song.id ?? song._id ?? song.songID;

    if (!id) {
      throw new Error("Bài hát không có ID.");
    }

    return {
      id: String(id),
      name: song.name ?? "Unknown Song",
      artist: song.artist ?? "Unknown Artist",
      image: song.image ?? null,
      playedAt: new Date().toISOString(),
    };
  }

  function getState() {
    return history.map((item) => ({ ...item }));
  }

  function emitState() {
    const snapshot = getState();

    listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("[HistoryServiceV2_1] Listener error:", error);
      }
    });
  }

  function recordPlayed(song) {
    const item = normalizeSong(song);

    // Nếu bài đã có trong lịch sử, đưa bản ghi cũ lên đầu.
    history = history.filter((entry) => entry.id !== item.id);
    history.unshift(item);

    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }

    emitState();
    return { ...item };
  }

  function getHistory(limit = MAX_HISTORY) {
    const safeLimit = Number.isInteger(limit) && limit >= 0
      ? limit
      : MAX_HISTORY;

    return getState().slice(0, safeLimit);
  }

  function clearHistory() {
    history = [];
    emitState();
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new Error("listener phải là một function.");
    }

    listeners.add(listener);
    listener(getState());

    return () => listeners.delete(listener);
  }

  window.HistoryServiceV2_1 = Object.freeze({
    recordPlayed,
    getHistory,
    clearHistory,
    subscribe,
  });
})(window);