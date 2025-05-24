let playlist = [];
let filteredPlaylist = [];
let currentSong = null;
let currentSongIndex = -1;
let isPlaying = false;

// const audioPlayer = document.getElementById("audioPlayer");
// const songNameElement = document.querySelector(".song-name");
// const mediaControlBar = document.querySelector(".media-control-bar");
// const playPauseBtn = document.getElementById("playPauseBtn");
// const playPauseIcon = document.getElementById("playPauseIcon");
// const nextBtn = document.getElementById("nextBtn");
// const backBtn = document.getElementById("backBtn");
// const volumeBtn = document.getElementById('volumeBtn');
// const volumeSlider = document.getElementById('volumeSlider');
// const seekbar = document.getElementById('seekbar');
// const currentTimeDisplay = document.getElementById('currentTime');
// const endTimeDisplay = document.getElementById('endTime');

const audioPlayer = window.audioPlayer;
const songNameElement = window.songNameElement;
const mediaControlBar = window.mediaControlBar;
const playPauseBtn = window.playPauseBtn;
const playPauseIcon = window.playPauseIcon;
const nextBtn = window.nextBtn;
const backBtn = window.backBtn;
const volumeBtn = window.volumeBtn;
const volumeSlider = window.volumeSlider;
const seekbar = window.seekbar;
const currentTimeDisplay = window.currentTimeDisplay;
const endTimeDisplay = window.endTimeDisplay;

console.log({ nextBtn, backBtn, playPauseBtn });



function updateTimeline(audioPlayer, seekbar, currentTimeDisplay, endTimeDisplay) {
  if (!audioPlayer || !seekbar || !currentTimeDisplay || !endTimeDisplay) {
      console.warn("Không tìm thấy phần tử audioPlayer hoặc seekbar hoặc thời gian hiển thị.");
      return;
  }

  audioPlayer.addEventListener('timeupdate', () => {
      seekbar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      currentTimeDisplay.innerText = formatTime(audioPlayer.currentTime);
  });

  audioPlayer.addEventListener('loadedmetadata', () => {
      endTimeDisplay.innerText = formatTime(audioPlayer.duration);
  });

  seekbar.addEventListener('input', () => {
      const seekTime = (seekbar.value / 100) * audioPlayer.duration;
      audioPlayer.currentTime = seekTime;
  });
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function handleItemClick(mp3Id, mp3Name, categoryId) {
  console.log(`Fetching data for mp3Id: ${mp3Id}`);

  fetch(`/home/find/${mp3Id}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch audio data for ID: ${mp3Id}`);
      }
      return response.json();
    })
    .then(data => {
      if (!playlist.some(song => song.id === mp3Id)) {
        playlist.push({ id: mp3Id, data: data.data, name: mp3Name, categoryId: categoryId });
        currentSongIndex = playlist.length - 1;
        console.log("Updated playlist:", playlist);
      } else {
        currentSongIndex = playlist.findIndex(song => song.id === mp3Id);
      }

      const source = document.createElement("source");
      source.src = "data:audio/mpeg;base64," + data.data;
      source.type = "audio/mpeg";

      if (window.songNameElement) {
        window.songNameElement.textContent = data.name;
      } else {
        console.warn("Không tìm thấy phần tử .song-name");
      }

      if (window.audioPlayer) {
        const audio = window.audioPlayer;
        audio.innerHTML = "";
        audio.appendChild(source);
        audio.load();
        audio.play();
      }

      if (window.mediaControlBar) {
        window.mediaControlBar.classList.add("active");
      }

      currentSong = { id: mp3Id, name: data.name, categoryId: data.categoryId };
      isPlaying = true;
      updatePlayPauseIcon();

      // Gọi updateTimeline đúng biến toàn cục đã gán vào window
      updateTimeline(window.audioPlayer, window.seekbar, window.currentTimeDisplay, window.endTimeDisplay);
    })
    .catch(error => {
      console.error("Error fetching or playing audio:", error);
    });
}



// audioPlayer.addEventListener('ended', function () {
//     if (filteredPlaylist.length === 0) {
//         const currentCategoryId = String(currentSong.categoryId);
//         fetch(`/home/category/${currentCategoryId}`)
//           .then(response => {
//               if (!response.ok) throw new Error('Không thể lấy danh sách bài hát cùng thể loại');
//               return response.json();
//           })
//           .then(songs => {
//               filteredPlaylist = songs.map(song => ({ id: song._id, categoryId: song.categoryId }));
//               console.log('Danh sách bài hát cùng thể loại:', filteredPlaylist);
//               if (filteredPlaylist.length > 0) {
//                   const nextSong = filteredPlaylist.shift();
//                   fetchAndPlayNextSong(nextSong.id);
//               }
//           })
//           .catch(error => {
//               console.error('Lỗi khi lấy danh sách bài hát:', error);
//           });
//     } else {
//         const nextSong = filteredPlaylist.shift();
//         fetchAndPlayNextSong(nextSong.id);
//     }
// });

function fetchAndPlayNextSong(mp3Id) {
    fetch(`/home/find/${mp3Id}`)
      .then(response => {
          if (!response.ok) throw new Error(`Không thể lấy dữ liệu bài hát với ID: ${mp3Id}`);
          return response.json();
      })
      .then(data => {
          audioPlayer.querySelector("source").src = "data:audio/mpeg;base64," + data.data;
          songNameElement.textContent = data.name;
          audioPlayer.load();
          audioPlayer.play();

          currentSong = { id: data._id, name: data.name, categoryId: data.categoryId };
          isPlaying = true;
          updatePlayPauseIcon();
      })
      .catch(error => {
          console.error('Lỗi khi fetch và phát bài hát:', error);
      });
}

nextBtn.addEventListener("click", function() {
    if (currentSongIndex < playlist.length - 1) {
        currentSongIndex++;
    } else {
        currentSongIndex = 0;
    }
    var nextSong = playlist[currentSongIndex];
    handleItemClick(nextSong.id, nextSong.name, nextSong.categoryId);
});

backBtn.addEventListener("click", function() {
    if (currentSongIndex > 0) {
        currentSongIndex--;
    } else {
        currentSongIndex = playlist.length - 1;
    }
    var previousSong = playlist[currentSongIndex];
    handleItemClick(previousSong.id, previousSong.name, previousSong.categoryId);
});

playPauseBtn.addEventListener("click", function() {
    if (isPlaying) {
        audioPlayer.pause();
    } else {
        audioPlayer.play();
    }
});

audioPlayer.addEventListener('play', () => {
    isPlaying = true;
    updatePlayPauseIcon();
});

audioPlayer.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayPauseIcon();
});


function updatePlayPauseIcon() {
  const icon = window.playPauseIcon || document.getElementById("playPauseIcon");

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




const volumeControl = document.querySelector('.volume-control');
const sliderContainer = document.querySelector('.slider-container');

  const otherBtns = document.querySelectorAll(".other-btn");

  volumeBtn.addEventListener("click", function (e) {
    e.stopPropagation();

    const isVisible = sliderContainer.style.display === "block";
    sliderContainer.style.display = isVisible ? "none" : "block";

    // Ẩn hoặc hiện các nút khác
    otherBtns.forEach(btn => {
      btn.style.visibility = isVisible ? "visible" : "hidden";
    });
  });

  // Ẩn volume slider khi click ra ngoài
  document.addEventListener("click", function (e) {
    const volumeControl = document.querySelector(".volume-control");
    if (!volumeControl.contains(e.target)) {
      sliderContainer.style.display = "none";
      otherBtns.forEach(btn => (btn.style.visibility = "visible"));
    }
  });

  // Gán giá trị âm lượng
  volumeSlider.addEventListener("input", function () {
    const audio = document.getElementById("audioPlayer"); // Bạn cần có thẻ audio
    if (audio) audio.volume = parseFloat(this.value);
  });


function updateVolumeSlider() {
  const value = volumeSlider.value; // từ 0 đến 1
  const percentage = value * 100;
  volumeSlider.style.backgroundSize = `${percentage}% 100%`;
}

volumeSlider.addEventListener('input', updateVolumeSlider);
updateVolumeSlider(); // khởi tạo lần đầu

const otherControls = document.querySelector(".other-controls");

let visible = false;

volumeBtn.addEventListener("click", () => {
  visible = !visible;

  if (visible) {
    sliderContainer.classList.add("active");
    setTimeout(() => {
      otherControls.classList.add("hidden");
    }, 100);
  } else {
    otherControls.classList.remove("hidden");
    setTimeout(() => {
      sliderContainer.classList.remove("active");
    }, 100);
  }
});
