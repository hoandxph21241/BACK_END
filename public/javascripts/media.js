document.addEventListener("DOMContentLoaded", () => {
    let playlist = [];
    let filteredPlaylist = [];
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
    const volumeBtn = document.getElementById('volumeBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const seekbar = document.getElementById('seekbar');
    const currentTimeDisplay = document.getElementById('currentTime');
    const endTimeDisplay = document.getElementById('endTime');

    console.log({ nextBtn, backBtn, playPauseBtn });

    console.log("volumeBtn:", volumeBtn);
    console.log("volumeSlider:", volumeSlider);
    console.log("audioPlayer:", audioPlayer);

    window.handleItemClick = function (mp3Id, mp3Name, categoryId) {
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

                updateTimeline(window.audioPlayer, window.seekbar, window.currentTimeDisplay, window.endTimeDisplay);
            })
            .catch(error => {
                console.error("Error fetching or playing audio:", error);
            });
    };



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

    audioPlayer.addEventListener('ended', function () {
        if (filteredPlaylist.length === 0) {
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
                    filteredPlaylist = songs.map(song => ({ id: song._id, title: song.name || song.title }));

                    console.log('Danh sách bài hát cùng thể loại:', filteredPlaylist);
                    console.log(songs)


                    console.log("Render playlist với:", filteredPlaylist);
                    renderPlaylist(filteredPlaylist);


                    if (filteredPlaylist.length > 0) {
                        const nextSong = filteredPlaylist.shift();
                        fetchAndPlayNextSong(nextSong.id);
                    }
                })
                .catch(error => {
                    console.error('Lỗi khi lấy danh sách bài hát:', error);
                });
        } else {
            const nextSong = filteredPlaylist.shift();
            fetchAndPlayNextSong(nextSong.id);
        }
    });

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

    function renderPlaylist(songs) {
        const listContainer = document.getElementById('playlist');
        const fallbackContainer = document.getElementById('playlistItems');

        if (fallbackContainer) {
            fallbackContainer.style.display = 'none';
        }

        if (!listContainer) return;

        listContainer.innerHTML = '';

        songs.forEach(song => {
            const li = document.createElement('li');
            li.textContent = song.title;
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => {
                fetchAndPlayNextSong(song.id);
            });
            listContainer.appendChild(li);
        });
    }

    nextBtn.addEventListener("click", function () {
        if (currentSongIndex < playlist.length - 1) {
            currentSongIndex++;
        } else {
            currentSongIndex = 0;
        }
        var nextSong = playlist[currentSongIndex];
        handleItemClick(nextSong.id, nextSong.name, nextSong.categoryId);
    });

    backBtn.addEventListener("click", function () {
        if (currentSongIndex > 0) {
            currentSongIndex--;
        } else {
            currentSongIndex = playlist.length - 1;
        }
        var previousSong = playlist[currentSongIndex];
        handleItemClick(previousSong.id, previousSong.name, previousSong.categoryId);
    });

    playPauseBtn.addEventListener("click", function () {
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

    const volumeSliderContainer = document.getElementById('volumeSliderContainer');
    const otherBtns = document.querySelectorAll('.other-btn');

    let volumeVisible = false;

    volumeBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        volumeVisible = !volumeVisible;

        if (volumeVisible) {
            volumeSliderContainer.style.display = 'block';
            volumeSliderContainer.classList.add('active');
            otherBtns.forEach(btn => btn.style.visibility = 'hidden');
        } else {
            volumeSliderContainer.classList.remove('active');
            setTimeout(() => {
                volumeSliderContainer.style.display = 'none';
            }, 300);
            otherBtns.forEach(btn => btn.style.visibility = 'visible');
        }
    });


    document.addEventListener('click', (e) => {
        if (volumeVisible && !volumeSliderContainer.contains(e.target) && !volumeBtn.contains(e.target)) {
            volumeVisible = false;
            volumeSliderContainer.classList.remove('active');
            setTimeout(() => {
                volumeSliderContainer.style.display = 'none';
            }, 300);
            otherBtns.forEach(btn => btn.style.visibility = 'visible');
        }
    });

    const audio = document.getElementById('audioPlayer');

    volumeSlider.addEventListener('input', () => {
        if (audio) {
            audio.volume = parseFloat(volumeSlider.value);
        }
    });




    const togglePlaylistBtn = document.getElementById('togglePlaylistBtn');
    const playlistPopup = document.getElementById('playlistPopup');
    const playlistItems = document.getElementById('playlistItems');

    togglePlaylistBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (playlistPopup.style.display === 'block') {
        playlistPopup.style.display = 'none';
      } else {
        renderPlaylistItems();
        playlistPopup.style.display = 'block';
      }
    });
    playlistPopup.addEventListener('click', (e) => {
        e.stopPropagation();
      });

    document.addEventListener('click', () => {
        playlistPopup.style.display = 'none';
    });
    

    function renderPlaylistItems() {
        playlistItems.innerHTML = '';
        if (!window.filteredPlaylist || window.filteredPlaylist.length === 0) {
            playlistItems.innerHTML = '<li>Không có bài hát trong danh sách</li>';
            return;
        }
        window.filteredPlaylist.forEach(song => {
            const li = document.createElement('li');
            li.textContent = song.name || `Bài hát ID: ${song.id}`;
            li.style.userSelect = 'none';

            li.addEventListener('click', () => {
                fetchAndPlayNextSong(song.id);
                playlistPopup.style.display = 'none';
            });

            playlistItems.appendChild(li);
        });
    }


})