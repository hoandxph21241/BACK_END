var audioPlayer = document.getElementById("audioPlayer");

function handleItemClick(mp3Data, mp3Name, audioPlayer) {
  var audioPlayer = document.getElementById("audioPlayer");
  var songNameElement = document.querySelector(".song-name");
  var mediaControlBar = document.querySelector(".media-control-bar");
  audioPlayer.querySelector("source").src = "data:audio/mpeg;base64," + mp3Data;
  songNameElement.textContent = mp3Name;
  songNameElement.setAttribute("data-text", mp3Name);
  audioPlayer.load();
  audioPlayer.play();
  mediaControlBar.classList.add("active");
}
function closeMediaControlBar() {
  var mediaControlBar = document.querySelector(".media-control-bar");
  mediaControlBar.classList.add("hidden");
}