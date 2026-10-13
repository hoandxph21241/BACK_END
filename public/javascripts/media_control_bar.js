// var audioPlayer = document.getElementById("audioPlayer");

// function handleItemClick(mp3Data, mp3Name, audioPlayer) {
//   var audioPlayer = document.getElementById("audioPlayer");
//   var songNameElement = document.querySelector(".song-name");
//   var mediaControlBar = document.querySelector(".media-control-bar");
//   audioPlayer.querySelector("source").src = "data:audio/mpeg;base64," + mp3Data;
//   songNameElement.textContent = mp3Name;
//   songNameElement.setAttribute("data-text", mp3Name);
//   audioPlayer.load();
//   audioPlayer.play();
//   mediaControlBar.classList.add("active");
// }
// function closeMediaControlBar() {
//   var mediaControlBar = document.querySelector(".media-control-bar");
//   mediaControlBar.classList.add("hidden");
// }


var audioPlayer = document.getElementById("audioPlayer");

function handleItemClick(mp3Id, mp3Name, categoryId) {
  const audio = document.getElementById("audioPlayer");
  const songNameElement = document.querySelector(".song-name");
  const mediaControlBar = document.querySelector(".media-control-bar");

  if (!audio || !songNameElement || !mediaControlBar) {
    console.error("Không tìm thấy thành phần trình phát nhạc.");
    return;
  }

  if (!mp3Id) {
    console.error("Thiếu ID bài hát.");
    return;
  }

  // Phát trực tiếp từ API GridFS Stream, không dùng Base64.
  audio.src = `/api/songs/${encodeURIComponent(mp3Id)}/stream`;

  songNameElement.textContent = mp3Name || "Unknown Song";
  songNameElement.setAttribute("data-text", mp3Name || "Unknown Song");

  mediaControlBar.classList.remove("hidden");
  mediaControlBar.classList.add("active");

  audio.load();

  audio.play().catch((error) => {
    console.error("Không thể phát bài hát:", error);
  });
}

window.handleItemClick = handleItemClick;

function closeMediaControlBar() {
  const mediaControlBar = document.querySelector(".media-control-bar");

  if (mediaControlBar) {
    mediaControlBar.classList.add("hidden");
    mediaControlBar.classList.remove("active");
  }
}

window.closeMediaControlBar = closeMediaControlBar;