var currentSongIndex = 0; // Biến lưu chỉ số bài hát hiện tại
var playlist = []; // Lưu danh sách các bài hát
var isPlaying = false;

// Hàm cập nhật thời gian và thanh timeline
function updateTimeline(audioPlayer, seekbar, currentTimeDisplay, endTimeDisplay) {
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

// Hàm format thời gian
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function handleItemClick(mp3Data, mp3Name, index) {
    var audioPlayer = document.getElementById("audioPlayer");
    var songNameElement = document.querySelector(".song-name");
    var mediaControlBar = document.querySelector(".media-control-bar");

    if (!playlist.some(song => song.data === mp3Data && song.name === mp3Name)) {
        playlist.push({ data: mp3Data, name: mp3Name });
    }

    currentSongIndex = index;
    audioPlayer.querySelector("source").src = "data:audio/mpeg;base64," + mp3Data;
    songNameElement.textContent = mp3Name;
    audioPlayer.load();
    audioPlayer.play();
    mediaControlBar.classList.add("active");

    var seekbar = document.getElementById('seekbar');
    var currentTimeDisplay = document.getElementById('currentTime');
    var endTimeDisplay = document.getElementById('endTime');

    updateTimeline(audioPlayer, seekbar, currentTimeDisplay, endTimeDisplay);
}

// Tự động phát bài tiếp theo khi bài hát hiện tại kết thúc
var audioPlayer = document.getElementById("audioPlayer");
audioPlayer.addEventListener('ended', function() {
    if (currentSongIndex < playlist.length - 1) {
        currentSongIndex++; // Chuyển sang bài tiếp theo
    } else {
        currentSongIndex = 0; // Quay về bài đầu tiên nếu hết playlist
    }
    var nextSong = playlist[currentSongIndex];
    handleItemClick(nextSong.data, nextSong.name, currentSongIndex);
});

// Nút Next
var nextBtn = document.getElementById("nextBtn");
if (nextBtn) {
    nextBtn.addEventListener("click", function() {
        if (currentSongIndex < playlist.length - 1) {
            currentSongIndex++;
        } else {
            currentSongIndex = 0;
        }
        var nextSong = playlist[currentSongIndex];
        handleItemClick(nextSong.data, nextSong.name, currentSongIndex);
    });
}

// Nút Play/Pause
var playPauseBtn = document.getElementById("playPauseBtn");
if (playPauseBtn) {
    playPauseBtn.addEventListener("click", function() {
        if (isPlaying) {
            audioPlayer.pause();
            playPauseBtn.textContent = "Play";
        } else {
            audioPlayer.play();
            playPauseBtn.textContent = "Pause";
        }
        isPlaying = !isPlaying;
    });
}
