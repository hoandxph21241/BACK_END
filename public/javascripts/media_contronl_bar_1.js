var currentSongIndex = 0; // Biến lưu chỉ số bài hát hiện tại
var playlist = []; // Lưu danh sách các bài hát
var isPlaying = true;

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

// Nút Back
var backBtn = document.getElementById("backBtn");
if (backBtn) {
    backBtn.addEventListener("click", function() {
        if (currentSongIndex > 0) {
            currentSongIndex--; // Quay về bài trước
        } else {
            currentSongIndex = playlist.length - 1; // Quay về bài cuối nếu ở bài đầu
        }
        var previousSong = playlist[currentSongIndex];
        handleItemClick(previousSong.data, previousSong.name, currentSongIndex);
    });
}


const playPauseBtn = document.getElementById("playPauseBtn");
const playPauseIcon = document.getElementById("playPauseIcon");

playPauseBtn.addEventListener("click", function() {
    if (isPlaying) {
        audioPlayer.pause();
        console.log("Paused");
        playPauseIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                <path d="M6.271 5.055a.5.5 0 0 1 .52.038l3.5 2.5a.5.5 0 0 1 0 .814l-3.5 2.5A.5.5 0 0 1 6 10.5v-5a.5.5 0 0 1 .271-.445"/>
            </svg>`;
        isPlaying = false;
    } else {
        audioPlayer.play();
        console.log("Playing");
        playPauseIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                <path d="M5 6.25a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0zm3.5 0a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0z"/>
            </svg>`;
        isPlaying = true;
    }
});

const volumeBtn = document.getElementById("volumeBtn");
const volumeSlider = document.getElementById("volumeSlider");

volumeBtn.addEventListener("mouseenter", () => {
    volumeSlider.style.display = "block"; // Hiển thị thanh slider khi di chuột vào nút
});

volumeBtn.addEventListener("mouseleave", () => {
    volumeSlider.style.display = "none"; // Ẩn thanh slider khi không còn di chuột vào nút
});

// Cập nhật âm lượng của audio khi thay đổi thanh slider
volumeSlider.addEventListener("input", (event) => {
    const audioPlayer = document.getElementById("audioPlayer");
    audioPlayer.volume = event.target.value; // Cập nhật âm lượng
});


