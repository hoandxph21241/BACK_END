document.addEventListener("DOMContentLoaded", () => {
  let playlist = [];
  let filteredPlaylist = [];
  let originalPlaylistOrder = [];
  let currentSong = null;
  let currentSongIndex = -1;
  let isPlaying = false;

  const audioPlayer = document.getElementById("audioPlayer");
  const songNameElement = document.querySelector(".song-name");
  const mediaControlBar = document.querySelector(".media-control-bar");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const playPauseIcon = document.getElementById("playPauseIcon");
  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");
  const volumeBtn = document.getElementById("volumeBtn");
  const volumeSlider = document.getElementById("volumeSlider");
  const seekbar = document.getElementById("seekbar");
  const currentTimeDisplay = document.getElementById("currentTime");
  const endTimeDisplay = document.getElementById("endTime");
  const albumCoverElement = document.getElementById("albumCover");
  console.log({ nextBtn, backBtn, playPauseBtn });

  console.log("volumeBtn:", volumeBtn);
  console.log("volumeSlider:", volumeSlider);
  console.log("audioPlayer:", audioPlayer);

  // Cập nhật function handleItemClick để xử lý ảnh album cover
  window.handleItemClick = function (mp3Id, mp3Name, categoryId) {
    console.log(`Fetching data for mp3Id: ${mp3Id}`);

    fetch(`/home/find/${mp3Id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch audio data for ID: ${mp3Id}`);
        }
        return response.json();
      })
      .then((data) => {
        // Cập nhật playlist
        if (!playlist.some((song) => song.id === mp3Id)) {
          playlist.push({
            id: mp3Id,
            data: data.data,
            name: mp3Name,
            categoryId: categoryId,
          });
          currentSongIndex = playlist.length - 1;
          console.log("Updated playlist:", playlist);
        } else {
          currentSongIndex = playlist.findIndex((song) => song.id === mp3Id);
        }

        // ===== XỬ LÝ ẢNH ALBUM COVER =====
        const albumCoverElement = document.getElementById("albumCover");
        if (albumCoverElement) {
          // Kiểm tra các trường hợp khác nhau mà DB có thể trả về
          let imageUrl = "/images/chibi.gif"; // Ảnh mặc định
          console.log(data);

          if (data.image) {
            // Trường hợp 1: data.image.url
            if (data.image.url) {
              imageUrl = data.image.url;
              console.log("imageUrl:", imageUrl);
            }
            // Trường hợp 2: data.image là string trực tiếp
            else if (typeof data.image === "string") {
              imageUrl = data.image;
              console.log("imageUrl:", imageUrl);
            }
          }
          // Trường hợp 3: data.albumCover
          else if (data.albumCover) {
            imageUrl = data.albumCover;
          }
          // Trường hợp 4: data.thumbnail
          else if (data.thumbnail) {
            imageUrl = data.thumbnail;
          }
          // Trường hợp 5: data.cover
          else if (data.cover) {
            imageUrl = data.cover;
          }

          // Cập nhật src cho album cover
          albumCoverElement.src = imageUrl;

          // Xử lý lỗi nếu ảnh không load được
          albumCoverElement.onerror = function () {
            console.warn("Không thể load ảnh album:", imageUrl);
            this.src = "/images/chibi.gif"; // Fallback về ảnh mặc định
            console.log("imageUrl: ERR");
          };

          console.log("Album cover updated:", imageUrl);
        }

        // Xử lý audio
        const source = document.createElement("source");
        source.src = "data:audio/mpeg;base64," + data.data;
        source.type = "audio/mpeg";

        // Cập nhật tên bài hát
        if (window.songNameElement) {
          window.songNameElement.textContent = data.name;
        } else {
          console.warn("Không tìm thấy phần tử .song-name");
        }

        // Cập nhật audio player
        if (window.audioPlayer) {
          const audio = window.audioPlayer;
          audio.innerHTML = "";
          audio.appendChild(source);
          audio.load();
          audio.play();
        }

        // Hiển thị media control bar
        if (window.mediaControlBar) {
          window.mediaControlBar.classList.add("active");
        }

        // Cập nhật thông tin bài hát hiện tại
        currentSong = {
          id: mp3Id,
          name: data.name,
          categoryId: data.categoryId,
        };
        isPlaying = true;
        updatePlayPauseIcon();
        currentSongIndex = filteredPlaylist.findIndex(song => song.id === mp3Id);
        updateCurrentSongHighlight(mp3Id);
        updateTimeline(
          window.audioPlayer,
          window.seekbar,
          window.currentTimeDisplay,
          window.endTimeDisplay
        );
      })
      .catch((error) => {
        console.error("Error fetching or playing audio:", error);
      });
  };

  function updateTimeline(
    audioPlayer,
    seekbar,
    currentTimeDisplay,
    endTimeDisplay
  ) {
    if (!audioPlayer || !seekbar || !currentTimeDisplay || !endTimeDisplay) {
      console.warn(
        "Không tìm thấy phần tử audioPlayer hoặc seekbar hoặc thời gian hiển thị."
      );
      return;
    }

    audioPlayer.addEventListener("timeupdate", () => {
      seekbar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      currentTimeDisplay.innerText = formatTime(audioPlayer.currentTime);
    });

    audioPlayer.addEventListener("loadedmetadata", () => {
      endTimeDisplay.innerText = formatTime(audioPlayer.duration);
    });

    seekbar.addEventListener("input", () => {
      const seekTime = (seekbar.value / 100) * audioPlayer.duration;
      audioPlayer.currentTime = seekTime;
    });
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  }

//   audioPlayer.addEventListener("ended", function () {
//     if (filteredPlaylist.length === 0) {
//       if (!currentSong || !currentSong.categoryId) {
//         console.error("currentSong không tồn tại hoặc thiếu categoryId");
//         return;
//       }
//       const currentCategoryId = String(currentSong.categoryId);
//       fetch(`/home/category/${currentCategoryId}`)
//         .then((response) => {
//           if (!response.ok)
//             throw new Error("Không thể lấy danh sách bài hát cùng thể loại");
//           return response.json();
//         })
//         .then((songs) => {
//           filteredPlaylist = songs.map((song) => ({
//             id: song._id,
//             title: song.name || song.title,
//             image: song.image,
//           }));

//           console.log("Danh sách bài hát cùng thể loại:", filteredPlaylist);
//           renderPlaylist(filteredPlaylist);

//           if (filteredPlaylist.length > 0) {
//             const nextSong = filteredPlaylist.shift();
//             fetchAndPlayNextSong(nextSong.id);
//           }
//         })
//         .catch((error) => {
//           console.error("Lỗi khi lấy danh sách bài hát:", error);
//         });
//     } else {
//       const nextSong = filteredPlaylist.shift();
//       fetchAndPlayNextSong(nextSong.id);
//     }
//   });

  // audioPlayer.addEventListener('ended', async function () {
  //     try {
  //         if (filteredPlaylist.length === 0) {
  //             if (!currentSong || !currentSong.categoryId) {
  //                 console.error("currentSong không tồn tại hoặc thiếu categoryId");
  //                 return;
  //             }

  //             const currentCategoryId = String(currentSong.categoryId);
  //             filteredPlaylist = await fetchAndPlayNextSong(currentCategoryId);

  //             if (filteredPlaylist.length === 0) {
  //                 console.warn("Không có bài hát nào trong danh sách cùng thể loại.");
  //                 return;
  //             }
  //         }

  //         const nextSong = filteredPlaylist.shift();
  //         if (nextSong) {
  //             await fetchAndPlayNextSong(nextSong.id);
  //         } else {
  //             console.warn("Không có bài hát tiếp theo để phát.");
  //         }
  //     } catch (error) {
  //         console.error("Lỗi khi xử lý sự kiện kết thúc bài hát:", error);
  //     }
  // });

  function fetchAndPlayNextSong(mp3Id) {
    fetch(`/home/find/${mp3Id}`)
      .then((response) => {
        if (!response.ok)
          throw new Error(`Không thể lấy dữ liệu bài hát với ID: ${mp3Id}`);
        return response.json();
      })
      .then((data) => {
        audioPlayer.querySelector("source").src =
          "data:audio/mpeg;base64," + data.data;
        songNameElement.textContent = data.name;
        audioPlayer.load();
        audioPlayer.play();
        // Cập nhật lại currentSongIndex
        currentSongIndex = filteredPlaylist.findIndex(song => song.id === mp3Id);


        const albumCoverElement = document.getElementById("albumCover");
        if (albumCoverElement) {
          let imageUrl = "/images/chibi.gif";

          if (data.image) {
            if (data.image.url) {
              imageUrl = data.image.url;
            } else if (typeof data.image === "string") {
              imageUrl = data.image;
            }
          } else if (data.albumCover) {
            imageUrl = data.albumCover;
          } else if (data.thumbnail) {
            imageUrl = data.thumbnail;
          } else if (data.cover) {
            imageUrl = data.cover;
          }

          albumCoverElement.src = imageUrl;
          albumCoverElement.onerror = function () {
            console.warn("Không thể load ảnh album:", imageUrl);
            this.src = "/images/chibi.gif";
          };
        }

        currentSong = {
          id: data._id,
          name: data.name,
          categoryId: data.categoryId,
        };
        isPlaying = true;
        updatePlayPauseIcon();
        updateCurrentSongHighlight(data._id);
      })
      .catch((error) => {
        console.error("Lỗi khi fetch và phát bài hát:", error);
      });
  }

  function renderPlaylist(songs) {
    const listContainer = document.getElementById("playlist");
    const fallbackContainer = document.getElementById("playlistItems");

    if (!listContainer) return;

    listContainer.innerHTML = "";

    if (!songs || songs.length === 0) {
      listContainer.classList.remove("has-data");
      if (fallbackContainer) {
        fallbackContainer.classList.remove("has-data");
      }
      return;
    }

    listContainer.classList.add("has-data");
    if (fallbackContainer) {
      fallbackContainer.classList.remove("has-data");
    }

    songs.forEach((song) => {
      console.log("song.image");
      console.log(song.image);

      const li = document.createElement("li");
      li.className =
        "playlist-item d-flex align-items-center mb-2 p-2 rounded hover-bg";
      li.style.cursor = "pointer";
      li.setAttribute("data-song-id", song.id);

      if (currentSong && currentSong.id === song.id) {
        li.classList.add("current-playing");
      }

      li.innerHTML = `
                <img src="${
                  (song.image && song.image.url) ||
                  "https://i.pinimg.com/236x/ff/5f/b3/ff5fb33001497b403cb86db7978b7943.jpg"
                }"
                     alt="Thumbnail"
                     class="rounded me-2"
                     style="height: 50px; width: 50px; object-fit: cover;">
                <div class="text-truncate text-light">
                    <div class="song-title fw-semibold">${
                      song.title || "Song Title ERROR"
                    }</div>
                    <div class="text-muted small">${song.artist || ""}</div>
                </div>
            `;

      li.addEventListener("click", () => {
        document
          .querySelectorAll(".playlist-item.current-playing")
          .forEach((item) => item.classList.remove("current-playing"));

        li.classList.add("current-playing");
        fetchAndPlayNextSong(song.id);
      });

      listContainer.appendChild(li);
    });
    // applyScrollIfNeeded();
  }

  function updateCurrentSongHighlight(songId) {
    document
      .querySelectorAll(".playlist-item.current-playing")
      .forEach((item) => item.classList.remove("current-playing"));
    const currentItem = document.querySelector(`[data-song-id="${songId}"]`);
    if (currentItem) {
      currentItem.classList.add("current-playing");
    }
  }

  // nextBtn.addEventListener("click", function () {
  //   if (currentSongIndex < playlist.length - 1) {
  //     currentSongIndex++;
  //   } else {
  //     currentSongIndex = 0;
  //   }
  //   var nextSong = playlist[currentSongIndex];
  //   handleItemClick(nextSong.id, nextSong.name, nextSong.categoryId);
  // });

  // backBtn.addEventListener("click", function () {
  //   if (currentSongIndex > 0) {
  //     currentSongIndex--;
  //   } else {
  //     currentSongIndex = playlist.length - 1;
  //   }
  //   var previousSong = playlist[currentSongIndex];
  //   handleItemClick(
  //     previousSong.id,
  //     previousSong.name,
  //     previousSong.categoryId
  //   );
  // });

// Xử lý Next button
nextBtn.addEventListener("click", function() {
  if (!currentSong || filteredPlaylist.length === 0) return;
  
  // Tìm vị trí bài hát hiện tại
  const currentIndex = filteredPlaylist.findIndex(song => song.id === currentSong.id);
  
  // Xác định bài tiếp theo
  let nextIndex;
  if (currentIndex === filteredPlaylist.length - 1) {
      nextIndex = 0; // Quay lại đầu danh sách
  } else {
      nextIndex = currentIndex + 1;
  }
  
  // Phát bài tiếp theo
  const nextSong = filteredPlaylist[nextIndex];
  fetchAndPlayNextSong(nextSong.id);
});

// Xử lý Back button
backBtn.addEventListener("click", function() {
  if (!currentSong || filteredPlaylist.length === 0) return;
  
  // Tìm vị trí bài hát hiện tại
  const currentIndex = filteredPlaylist.findIndex(song => song.id === currentSong.id);
  
  // Xác định bài trước đó
  let prevIndex;
  if (currentIndex === 0) {
      prevIndex = filteredPlaylist.length - 1; // Quay lại cuối danh sách
  } else {
      prevIndex = currentIndex - 1;
  }
  
  // Phát bài trước đó
  const prevSong = filteredPlaylist[prevIndex];
  fetchAndPlayNextSong(prevSong.id);
});


  playPauseBtn.addEventListener("click", function () {
    if (isPlaying) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();
    }
  });

  audioPlayer.addEventListener("play", () => {
    isPlaying = true;
    updatePlayPauseIcon();
  });

  audioPlayer.addEventListener("pause", () => {
    isPlaying = false;
    updatePlayPauseIcon();
  });

  function updatePlayPauseIcon() {
    const icon =
      window.playPauseIcon || document.getElementById("playPauseIcon");

    if (!icon) {
      console.warn("Không tìm thấy phần tử #playPauseIcon");
      return;
    }

    if (isPlaying) {
      icon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause-circle" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
              <path d="M5 6.25a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0zm3.5 0a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0z"/>
          </svg>`;
    } else {
      icon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play-circle" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
              <path d="M6.271 5.055a.5.5 0 0 1 .52.038l3.5 2.5a.5.5 0 0 1 0 .814l-3.5 2.5A.5.5 0 0 1 6 10.5v-5a.5.5 0 0 1 .271-.445"/>
          </svg>`;
    }
  }

  // Volume controls
  const volumeSliderContainer = document.getElementById(
    "volumeSliderContainer"
  );
  const otherBtns = document.querySelectorAll(".other-btn");

  let volumeVisible = false;

  volumeBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    volumeVisible = !volumeVisible;

    if (volumeVisible) {
      volumeSliderContainer.style.display = "block";
      volumeSliderContainer.classList.add("active");
      otherBtns.forEach((btn) => (btn.style.visibility = "hidden"));
    } else {
      volumeSliderContainer.classList.remove("active");
      setTimeout(() => {
        volumeSliderContainer.style.display = "none";
      }, 300);
      otherBtns.forEach((btn) => (btn.style.visibility = "visible"));
    }
  });

  document.addEventListener("click", (e) => {
    if (
      volumeVisible &&
      !volumeSliderContainer.contains(e.target) &&
      !volumeBtn.contains(e.target)
    ) {
      volumeVisible = false;
      volumeSliderContainer.classList.remove("active");
      setTimeout(() => {
        volumeSliderContainer.style.display = "none";
      }, 300);
      otherBtns.forEach((btn) => (btn.style.visibility = "visible"));
    }
  });

  const audio = document.getElementById("audioPlayer");

  function getLogarithmicVolume(sliderValue) {
    return (Math.exp(parseFloat(sliderValue)) - 1) / (Math.E - 1);
  }

  if (volumeSliderContainer) {
    volumeSliderContainer.style.display = "none";
  }

  volumeSlider.addEventListener("input", () => {
    const sliderValue = volumeSlider.value;
    const progress = sliderValue * 100;
    volumeSlider.style.setProperty("--progress", progress + "%");
    if (audio) {
      const actualVolume = getLogarithmicVolume(sliderValue);
      audio.volume = actualVolume;
    }
  });

  const togglePlaylistBtn = document.getElementById("togglePlaylistBtn");
  const playlistPopup = document.getElementById("playlistPopup");

  let isAnimating = false;
  let isOpen = false;
  let isInitialized = false;

  function initializePopup() {
    if (isInitialized) return;
    togglePlaylistBtn.removeEventListener("click", togglePlaylistHandler);
    togglePlaylistBtn.addEventListener("click", togglePlaylistHandler);
    playlistPopup.addEventListener("animationend", handleAnimationEnd);
    document.addEventListener("click", handleClickOutside);
    isInitialized = true;
  }

  function togglePlaylistHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (isOpen) {
      closePopup();
    } else {
      openPopup();
    }
  }

  function openPopup() {
    if (window.isExpanded) return;

    isAnimating = true;
    playlistPopup.style.display = "block";
    playlistPopup.classList.remove("hide");
    void playlistPopup.offsetWidth;
    playlistPopup.classList.add("show");

    window.isExpanded = true;
    window.parent.postMessage({ type: "playlistState", isExpanded: true }, "*");
    console.log("openPopup:", window.isExpanded);
  }

  function closePopup() {
    if (!window.isExpanded) return;

    isAnimating = true;
    playlistPopup.classList.remove("show");
    void playlistPopup.offsetWidth;
    playlistPopup.classList.add("hide");

    window.isExpanded = false;
    window.parent.postMessage(
      { type: "playlistState", isExpanded: false },
      "*"
    );
    console.log("closePopup:", window.isExpanded);
  }

  function handleAnimationEnd(e) {
    if (e.target !== playlistPopup) return;
    if (e.animationName === "slideUp") {
      isAnimating = false;
      isOpen = true;
    } else if (e.animationName === "slideDown") {
      playlistPopup.style.display = "none";
      playlistPopup.classList.remove("hide");
      isAnimating = false;
      isOpen = false;
    }
  }

  playlistPopup.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  function handleClickOutside(e) {
    if (
      isOpen &&
      !isAnimating &&
      !playlistPopup.contains(e.target) &&
      e.target !== togglePlaylistBtn
    ) {
      closePopup();
    }
  }
  initializePopup();

  const playlistHeader = document.querySelector(".playlist-header strong");
  const playlistElements = document.querySelectorAll(
    "#playlist, #playlistItems, #playlist li, #playlistItems li"
  );

  function preventActions(e) {
    e.preventDefault();
    return false;
  }

  if (playlistHeader) {
    playlistHeader.addEventListener("contextmenu", preventActions);
    playlistHeader.addEventListener("selectstart", preventActions);
  }

  playlistElements.forEach((el) => {
    el.addEventListener("contextmenu", preventActions);
    el.addEventListener("selectstart", preventActions);
    el.addEventListener("dragstart", preventActions);
  });

  document.addEventListener("keydown", function (e) {
    if (e.target.closest("#playlistPopup")) {
      if (
        (e.ctrlKey && (e.key === "a" || e.key === "c" || e.key === "x")) ||
        e.key === "F12"
      ) {
        e.preventDefault();
        return false;
      }
    }
  });

  window.addEventListener("keydown", function (e) {
    if (e.key === " " || e.keyCode === 32) {
      e.preventDefault();
      if (audioPlayer && currentSong) {
        if (isPlaying) {
          audioPlayer.pause();
        } else {
          audioPlayer.play();
        }
      }
    }

    if (!audioPlayer || !currentSong) return;
    const SKIP_TIME = 5;
    switch(e.key) {
        case "ArrowRight":
            e.preventDefault();
            audioPlayer.currentTime = Math.min(
                audioPlayer.currentTime + SKIP_TIME,
                audioPlayer.duration
            );
            break;

        case "ArrowLeft":
            e.preventDefault();
            audioPlayer.currentTime = Math.max(
                audioPlayer.currentTime - SKIP_TIME,
                0
            );
            break;
    }
    if (seekbar) {
        seekbar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        currentTimeDisplay.innerText = formatTime(audioPlayer.currentTime);
    }

  });
  

  document.addEventListener("click", function (e) {
    if (e.target.closest(".media-control-bar")) {
      mediaControlBar.focus();
    }
  });
  if (mediaControlBar) {
    mediaControlBar.setAttribute("tabindex", "0");
    mediaControlBar.style.outline = "none";
  }

  let repeatMode = 0; // 0: No Repeat, 1: Repeat One, 2: Repeat All

  const repeatBtn = document.getElementById("repeatBtn");


  repeatBtn.addEventListener("click", () => {
    repeatMode = (repeatMode + 1) % 3; // Vòng lặp 0 → 1 → 2 → 0
    updateRepeatButtonUI();
    console.log("repeatBtn:", repeatMode);
  });

  function updateRepeatButtonUI() {
    let svg = "";

    if (repeatMode === 0) {
      svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16">
  <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"/>
  <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"/>
</svg>`;
      repeatBtn.title = "No Repeat";
    } else if (repeatMode === 1) {
      svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-repeat-1" viewBox="0 0 16 16">
  <path d="M11 4v1.466a.25.25 0 0 0 .41.192l2.36-1.966a.25.25 0 0 0 0-.384l-2.36-1.966a.25.25 0 0 0-.41.192V3H5a5 5 0 0 0-4.48 7.223.5.5 0 0 0 .896-.446A4 4 0 0 1 5 4zm4.48 1.777a.5.5 0 0 0-.896.446A4 4 0 0 1 11 12H5.001v-1.466a.25.25 0 0 0-.41-.192l-2.36 1.966a.25.25 0 0 0 0 .384l2.36 1.966a.25.25 0 0 0 .41-.192V13h6a5 5 0 0 0 4.48-7.223Z"/>
  <path d="M9 5.5a.5.5 0 0 0-.854-.354l-1.75 1.75a.5.5 0 1 0 .708.708L8 6.707V10.5a.5.5 0 0 0 1 0z"/>
</svg>`;
      repeatBtn.title = "Repeat One";
    } else if (repeatMode === 2) {
      svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-repeat" viewBox="0 0 16 16">
  <path d="M11 5.466V4H5a4 4 0 0 0-3.584 5.777.5.5 0 1 1-.896.446A5 5 0 0 1 5 3h6V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192m3.81.086a.5.5 0 0 1 .67.225A5 5 0 0 1 11 13H5v1.466a.25.25 0 0 1-.41.192l-2.36-1.966a.25.25 0 0 1 0-.384l2.36-1.966a.25.25 0 0 1 .41.192V12h6a4 4 0 0 0 3.585-5.777.5.5 0 0 1 .225-.67Z"/>
</svg>`;
      repeatBtn.title = "Repeat All";
    }

    repeatBtn.innerHTML = svg;
  }

//   audioPlayer.addEventListener("ended", () => {
//     if (repeatMode === 1) {
//         console.log("repeatBtn: audioPlayer", repeatMode);
//       audioPlayer.currentTime = 0;
//       audioPlayer.play();
//     } else if (repeatMode === 2) {
//         console.log("repeatBtn: audioPlayer", repeatMode);
//       const nextSong = filteredPlaylist.shift();
//       if (nextSong) {
//         fetchAndPlayNextSong(nextSong.id);
//       } else {
//         console.log("repeatBtn: audioPlayer", repeatMode);
//         filteredPlaylist.push(...playlist);
//         const firstSong = filteredPlaylist.shift();
//         fetchAndPlayNextSong(firstSong.id);
//       }
//     } else {
//         console.log("repeatBtn: audioPlayer", repeatMode);
//       const nextSong = filteredPlaylist.shift();
//       if (nextSong) {
//         fetchAndPlayNextSong(nextSong.id);
//       } else {
//         console.log("Danh sách phát đã hết.");
//       }
//     }
//   });


audioPlayer.addEventListener("ended", function () {
  
if (filteredPlaylist.length > 0) {
        // Khi danh sách còn bài
        if (isShuffle || repeatMode === 2 || repeatMode === 0) {
            currentSongIndex = (currentSongIndex + 1) % filteredPlaylist.length;
            const nextSong = filteredPlaylist[currentSongIndex];
            handleItemClick(nextSong.id, nextSong.name || nextSong.title, nextSong.categoryId);
            return;
        }
    }

    // Khi playlist trống → tải lại cùng thể loại
    if (!currentSong || !currentSong.categoryId) {
        console.error("currentSong không tồn tại hoặc thiếu categoryId");
        return;
    }



    if (repeatMode === 1) {
        console.log("Repeat One");
        audioPlayer.currentTime = 0;
        audioPlayer.play();
        return;
    }

    if (repeatMode === 2) {
        console.log("Repeat All");
        const nextSong = filteredPlaylist.shift();
        if (nextSong) {
            fetchAndPlayNextSong(nextSong.id);
        } else {
            if (!currentSong || !currentSong.categoryId) {
                console.error("currentSong không tồn tại hoặc thiếu categoryId");
                return;
            }
            const currentCategoryId = String(currentSong.categoryId);
            fetch(`/home/category/${currentCategoryId}`)
                .then(response => {
                    if (!response.ok) throw new Error('Không thể lấy danh sách bài hát cùng thể loại');
                    return response.json();
                })
                .then(songs => {
                    filteredPlaylist = songs.map(song => ({
                        id: song._id,
                        title: song.name || song.title,
                        image: song.image
                    }));

                    originalPlaylistOrder = [...filteredPlaylist];
                    const songsToRender = isShuffle ? [...filteredPlaylist] : filteredPlaylist;
                    if (isShuffle) {
                      shuffleArrayInPlace(songsToRender);
                    }
                  
                    renderPlaylist(songsToRender);
                    if (songsToRender.length > 0) {
                      const firstSong = songsToRender.shift();
                      fetchAndPlayNextSong(firstSong.id);
                    }
                })
                .catch(error => {
                    console.error('Lỗi khi lấy danh sách bài hát:', error);
                });
        }
        return;
    }
    // repeatMode === 0 (No Repeat)
    console.log("No Repeat");
    const nextSong = filteredPlaylist.shift();
    if (nextSong) {
        fetchAndPlayNextSong(nextSong.id);
    } else {
        console.log("Danh sách phát đã hết.");
    }
});


let isShuffle = false; // Trạng thái Shuffle (false: tắt, true: bật)

window.shuffleBtn = document.getElementById("shuffleBtn");

shuffleBtn.addEventListener("click", () => {
    isShuffle = !isShuffle;
    updateShuffleButtonUI(); 
    if (isShuffle) {
        shufflePlaylistByIndex(); 
    } else {
        resetPlaylistOrder(); 
    }
    console.log("Shuffle state:", isShuffle);
});

function updateShuffleButtonUI() {
  const svgIcon = shuffleBtn.querySelector("svg");

  if (isShuffle) {
    svgIcon.style.fill = "red";
    shuffleBtn.title = "Shuffle On";
  } else {
    svgIcon.style.fill = ""; 
    shuffleBtn.title = "Shuffle Off";
  }
}
function moveCurrentSongToTop() {
  if (!currentSong) return;
  const idx = filteredPlaylist.findIndex(song => song.id === currentSong.id);
  if (idx > 0) {
      const [song] = filteredPlaylist.splice(idx, 1);
      filteredPlaylist.unshift(song);
  }
}

function shufflePlaylist() {
  for (let i = filteredPlaylist.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filteredPlaylist[i], filteredPlaylist[j]] = [filteredPlaylist[j], filteredPlaylist[i]];
  }
  moveCurrentSongToTop();
  console.log("Danh sách phát đã được trộn:", filteredPlaylist);
  updatePlaylistPopup();
}

function shufflePlaylistByIndex() {
    // Bỏ toàn bộ index cũ
    filteredPlaylist.forEach((song, idx) => {
        if (currentSong && song.id === currentSong.id) {
            song._shuffleIndex = -1; // bài hiện tại luôn ở đầu
        } else {
            song._shuffleIndex = Math.random(); // random cho bài khác
        }
    });

    // Sắp xếp lại
    filteredPlaylist.sort((a, b) => a._shuffleIndex - b._shuffleIndex);

    // Cập nhật currentSongIndex
    currentSongIndex = filteredPlaylist.findIndex(song => song.id === currentSong.id);
    

    // Xóa thuộc tính tạm
    filteredPlaylist.forEach(song => delete song._shuffleIndex);

    renderPlaylist(filteredPlaylist);
}


function resetPlaylistOrder() {
  filteredPlaylist = [...originalPlaylistOrder];
  moveCurrentSongToTop();
  console.log("Danh sách phát đã được khôi phục:", filteredPlaylist);
  updatePlaylistPopup();
}
function updatePlaylistPopup() {
  const playlistItems = document.getElementById("playlistItems");
  if (playlistItems) {
    const songsToRender = isShuffle ? [...filteredPlaylist] : filteredPlaylist;
    if (isShuffle) {
      shuffleArrayInPlace(songsToRender);
    }
    renderPlaylist(songsToRender);
  } else {
    console.warn("Không tìm thấy phần tử #playlistItems");
  }
}


  // Lắng nghe sự kiện từ iframe cha
  window.addEventListener("message", (event) => {
    if (event.data.type === "togglePlaylist") {
      togglePlaylistHandler(event);
    }
  });

  const songsToRender = isShuffle ? [...playlist] : playlist;
  if (isShuffle) {
    shuffleArrayInPlace(songsToRender);
  }
  renderPlaylist(songsToRender);
  
  function shuffleArrayInPlace(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  

});


