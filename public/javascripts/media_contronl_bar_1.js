var currentSongIndex = 0; // Biến lưu chỉ số bài hát hiện tại
var playlist = []; // Lưu danh sách các bài hát

// Hàm cập nhật thời gian và thanh timeline
function updateTimeline(audioPlayer, seekbar, currentTimeDisplay, endTimeDisplay) {
    // Cập nhật thời gian hiện tại và thanh progress
    audioPlayer.addEventListener('timeupdate', () => {
        seekbar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        currentTimeDisplay.innerText = formatTime(audioPlayer.currentTime);
    });

    // Khi audio tải xong, cập nhật tổng thời gian của bài hát
    audioPlayer.addEventListener('loadedmetadata', () => {
        endTimeDisplay.innerText = formatTime(audioPlayer.duration);
    });

    // Cho phép người dùng tua bài hát bằng cách kéo trên thanh seekbar
    seekbar.addEventListener('input', () => {
        const seekTime = (seekbar.value / 100) * audioPlayer.duration;
        audioPlayer.currentTime = seekTime; // Cập nhật thời gian hiện tại của audio
    });
}

// Hàm format thời gian từ giây thành "phút:giây"
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Hàm xử lý khi click vào bài hát
function handleItemClick(mp3Data, mp3Name, index) {
    var audioPlayer = document.getElementById("audioPlayer");
    var songNameElement = document.querySelector(".song-name");
    var mediaControlBar = document.querySelector(".media-control-bar");

    // Gán bài hát và phát nhạc
    audioPlayer.querySelector("source").src = "data:audio/mpeg;base64," + mp3Data;
    songNameElement.textContent = mp3Name;
    songNameElement.setAttribute("data-text", mp3Name);
    audioPlayer.load();
    audioPlayer.play();
    
    // Hiển thị thanh điều khiển
    mediaControlBar.classList.add("active");

    // Cập nhật chỉ số bài hát hiện tại
    currentSongIndex = index;

    // Cập nhật timeline sau khi nhạc được tải
    var seekbar = document.getElementById('seekbar');
    var currentTimeDisplay = document.getElementById('currentTime');
    var endTimeDisplay = document.getElementById('endTime');

    updateTimeline(audioPlayer, seekbar, currentTimeDisplay, endTimeDisplay);
}

// Sự kiện khi click vào nút "Next"
var nextBtn = document.getElementById("nextBtn");
nextBtn.addEventListener("click", function() {
    // Kiểm tra xem có bài tiếp theo trong playlist không
    if (currentSongIndex < playlist.length - 1) {
        currentSongIndex++; // Chuyển sang bài tiếp theo
    } else {
        currentSongIndex = 0; // Quay về bài đầu tiên nếu hết playlist
    }

    // Lấy bài hát tiếp theo từ playlist
    var nextSong = playlist[currentSongIndex];
    handleItemClick(nextSong.data, nextSong.name, currentSongIndex);
});


// Hàm để đóng thanh điều khiển
function closeMediaControlBar() {
    var mediaControlBar = document.querySelector(".media-control-bar");
    mediaControlBar.classList.add("hidden");
}
