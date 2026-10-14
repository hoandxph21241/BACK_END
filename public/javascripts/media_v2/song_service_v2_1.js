(function (window) {
  "use strict";

  const config = {
    apiBaseUrl: "/api/songs",
    // Endpoint cũ khi còn mount api_Rounters:
    // streamPathTemplate: "/mp3/{id}/stream",
    streamPathTemplate: "/{id}/stream",
  };
  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  function normalizeSong(response) {
    const song = response?.data ?? response;

    if (!song || typeof song !== "object") {
      throw new Error("Dữ liệu bài hát không hợp lệ.");
    }

    const id = song._id ?? song.id ?? song.songID;

    if (!id) {
      throw new Error("Metadata không có ID bài hát.");
    }

    return {
      id: String(id),
      // name: song.name ?? "Unknown Song",
      name: song.name ?? song.title ?? "Unknown Song",
      artist: song.artist ?? "Unknown Artist",
      // image: normalizeImage(song.image),
      image: normalizeImage(song.image ?? song.albumCover ?? song.thumbnail ?? song.cover),
      categoryId:
        song.categoryId?._id ??
        song.categoryId ??
        song.category?._id ??
        (typeof song.category === "string" ? song.category : null) ??
        null,
      duration: song.duration ?? null,
      fileSize: song.fileSize ?? null,
      uploadDate: song.uploadDate ?? null,
    };
  }

  function normalizeImage(image) {
    if (!image) return null;

    if (typeof image === "string") {
      return image;
    }

    if (typeof image.url === "string") {
      return image.url;
    }

    if (typeof image.secure_url === "string") {
      return image.secure_url;
    }

    return null;
  }

  async function getSongById(songId) {
    if (!songId || typeof songId !== "string") {
      throw new Error("songId không hợp lệ.");
    }

    const id = encodeURIComponent(songId);
    // Endpoint cũ khi còn mount api_Rounters:
    // const url = `${config.apiBaseUrl}/mp3/${id}`;
    const url = `${config.apiBaseUrl}/${id}`;

    const response = await requestJson(url);

    if (response?.status && response.status !== "success") {
      throw new Error(
        response.message || "Không thể lấy thông tin bài hát."
      );
    }

    return normalizeSong(response);
  }

  async function getSongsByCategory(categoryId) {
    if (!categoryId) return [];
    const response = await requestJson(`${config.apiBaseUrl}/category/${encodeURIComponent(categoryId)}`);
    const items = response?.data ?? response;
    if (!Array.isArray(items)) throw new Error("Invalid category playlist response.");
    return items.map(item => ({ ...normalizeSong(item), categoryId: String(categoryId) }));
  }

  function getStreamUrl(songId) {
    if (!songId || typeof songId !== "string") {
      throw new Error("songId không hợp lệ.");
    }

    const id = encodeURIComponent(songId);
    const path = config.streamPathTemplate.replace("{id}", id);

    return `${config.apiBaseUrl}${path}`;
  }
  function configure(options = {}) {
    if (typeof options.apiBaseUrl === "string") {
      config.apiBaseUrl = options.apiBaseUrl.replace(/\/+$/, "");
    }

    if (typeof options.streamPathTemplate === "string") {
      config.streamPathTemplate = options.streamPathTemplate;
    }
  }

  window.SongServiceV2_1 = Object.freeze({
    getSongById,
    getSongsByCategory,
    getStreamUrl,
    configure,
  });
})(window);
