// const audioPlayer = document.getElementById("audioPlayer");
// const songNameElement = document.querySelector(".song-name");
// const mediaControlBar = document.querySelector(".media-control-bar");
// const playPauseBtn = document.getElementById("playPauseBtn");
// const playPauseIcon = document.getElementById("playPauseIcon");
// const nextBtn = document.getElementById("nextBtn");
// const backBtn = document.getElementById("backBtn");
// const otherControls = document.querySelector('.other-btn');
// const volumeBtn = document.getElementById('volumeBtn');
// const volumeSlider = document.getElementById('volumeSlider');
// const volumeSliderContainer = document.getElementById('volumeSliderContainer');
// const seekbar = document.getElementById('seekbar');
// const currentTimeDisplay = document.getElementById('currentTime');
// const endTimeDisplay = document.getElementById('endTime');

// const togglePlaylistBtn = document.getElementById('togglePlaylistBtn');
// const playlistHeader = document.getElementById('playlist-header');
// const playlistPopup = document.getElementById('playlistPopup');
// const playlistItems = document.getElementById('playlistItems');
// const accordionContainer = document.getElementById("playlistAccordion");
// const albumCoverElement = document.getElementById('albumCover');

// const repeatBtn = document.getElementById("repeatBtn");
// const shuffleBtn = document.getElementById("shuffleBtn");

// window.audioPlayer = audioPlayer;
// window.songNameElement = songNameElement;
// window.mediaControlBar = mediaControlBar;
// window.playPauseBtn = playPauseBtn;
// window.playPauseIcon = playPauseIcon;
// window.nextBtn = nextBtn;
// window.backBtn = backBtn;
// window.otherControls = otherControls;
// window.volumeBtn = volumeBtn;
// window.volumeSlider = volumeSlider;
// window.volumeSliderContainer = volumeSliderContainer;
// window.seekbar = seekbar;
// window.currentTimeDisplay = currentTimeDisplay;
// window.endTimeDisplay = endTimeDisplay;

// window.togglePlaylistBtn = togglePlaylistBtn;
// window.playlistHeader = playlistHeader;
// window.playlistPopup = playlistPopup;
// window.playlistItems = playlistItems;
// window.accordionContainer = accordionContainer;
// window.albumCover = albumCover;

// window.repeatBtn = repeatBtn;
// window.shuffleBtn = shuffleBtn;


// document.addEventListener("DOMContentLoaded", function () {
//     const items = document.querySelectorAll(".song-item");
//     items.forEach(item => {
//         item.addEventListener("click", () => {
//             const mp3Id = item.dataset.id;
//             const mp3Name = item.dataset.name;
//             const categoryId = item.dataset.category;
//             if (typeof handleItemClick === "function") {
//                 handleItemClick(mp3Id, mp3Name, categoryId);
//             } else {
//                 console.error("handleItemClick is not defined");
//             }
//         });
//     });


//     window.addEventListener('message', event => {
//         const data = event.data;
//         if (data && data.mp3Id) {
//             handleItemClick(data.mp3Id, data.mp3Name, data.categoryId);
//         }
//     });


//     if (togglePlaylistBtn && playlistPopup) {
//         togglePlaylistBtn.addEventListener("click", () => {
//             const isHidden = playlistPopup.style.display === "none";
//             playlistPopup.style.display = isHidden ? "block" : "none";
//         });
//     }
    
// });

const audioPlayer = document.getElementById("audioPlayer");
const songNameElement = document.querySelector(".song-name");
const mediaControlBar = document.querySelector(".media-control-bar");

const playPauseBtn = document.getElementById("playPauseBtn");
const playPauseIcon = document.getElementById("playPauseIcon");
const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");

const otherControls = document.querySelector(".other-btn");
const volumeBtn = document.getElementById("volumeBtn");
const volumeSlider = document.getElementById("volumeSlider");
const volumeSliderContainer = document.getElementById("volumeSliderContainer");

const seekbar = document.getElementById("seekbar");
const currentTimeDisplay = document.getElementById("currentTime");
const endTimeDisplay = document.getElementById("endTime");

const togglePlaylistBtn = document.getElementById("togglePlaylistBtn");
const playlistHeader = document.getElementById("playlist-header");
const playlistPopup = document.getElementById("playlistPopup");
const playlistItems = document.getElementById("playlistItems");
const accordionContainer = document.getElementById("playlistAccordion");
const albumCoverElement = document.getElementById("albumCover");

const repeatBtn = document.getElementById("repeatBtn");
const shuffleBtn = document.getElementById("shuffleBtn");

// Chia sẻ các phần tử giao diện với những script điều khiển trình phát.
window.audioPlayer = audioPlayer;
window.songNameElement = songNameElement;
window.mediaControlBar = mediaControlBar;

window.playPauseBtn = playPauseBtn;
window.playPauseIcon = playPauseIcon;
window.nextBtn = nextBtn;
window.backBtn = backBtn;

window.otherControls = otherControls;
window.volumeBtn = volumeBtn;
window.volumeSlider = volumeSlider;
window.volumeSliderContainer = volumeSliderContainer;

window.seekbar = seekbar;
window.currentTimeDisplay = currentTimeDisplay;
window.endTimeDisplay = endTimeDisplay;

window.togglePlaylistBtn = togglePlaylistBtn;
window.playlistHeader = playlistHeader;
window.playlistPopup = playlistPopup;
window.playlistItems = playlistItems;
window.accordionContainer = accordionContainer;
window.albumCover = albumCoverElement;

window.repeatBtn = repeatBtn;
window.shuffleBtn = shuffleBtn;

document.addEventListener("DOMContentLoaded", function () {
    // Chỉ nhận thông điệp chọn bài hát từ cửa sổ cha.
    // Không gắn thêm click listener cho .song-item ở đây,
    // vì danh sách bài hát được xử lý ở trang Home.
    window.addEventListener("message", function (event) {
        const data = event.data;

        if (
            event.source !== window.parent ||
            !data ||
            data.type !== "songSelected" ||
            !data.mp3Id
        ) {
            return;
        }

        if (typeof window.handleItemClick !== "function") {
            console.error(
                "handleItemClick chưa được định nghĩa trong media_controls.js"
            );
            return;
        }

        window.handleItemClick(
            data.mp3Id,
            data.mp3Name || "Unknown Song",
            data.categoryId || null
        );
    });

    // Đóng/mở danh sách phát.
    if (togglePlaylistBtn && playlistPopup) {
        togglePlaylistBtn.addEventListener("click", function () {
            const isHidden =
                window.getComputedStyle(playlistPopup).display === "none";

            playlistPopup.style.display = isHidden ? "block" : "none";
        });
    }
});

