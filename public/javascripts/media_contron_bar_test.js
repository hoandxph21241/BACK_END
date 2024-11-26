var currentSongIndex = 0; // Biến lưu chỉ số bài hát hiện tại
var playlist = []; // Lưu danh sách các bài hát
var isPlaying = true;

var filteredPlaylist = [];


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

// function handleItemClick(mp3Data, mp3Name, index) {
//     var audioPlayer = document.getElementById("audioPlayer");
//     var songNameElement = document.querySelector(".song-name");
//     var mediaControlBar = document.querySelector(".media-control-bar");

//     if (!playlist.some(song => song.data === mp3Data && song.name === mp3Name)) {
//         playlist.push({ data: mp3Data, name: mp3Name });
//     }

//     currentSongIndex = index;
//     audioPlayer.querySelector("source").src = "data:audio/mpeg;base64," + mp3Data;
//     songNameElement.textContent = mp3Name;
//     audioPlayer.load();
//     audioPlayer.play();
//     mediaControlBar.classList.add("active");

//     var seekbar = document.getElementById('seekbar');
//     var currentTimeDisplay = document.getElementById('currentTime');
//     var endTimeDisplay = document.getElementById('endTime');

//     updateTimeline(audioPlayer, seekbar, currentTimeDisplay, endTimeDisplay);
// }

// Tự động phát bài tiếp theo khi bài hát hiện tại kết thúc


// function handleItemClick(mp3Id, mp3Name) {
//     var audioPlayer = document.getElementById("audioPlayer");
//     var songNameElement = document.querySelector(".song-name");
//     var mediaControlBar = document.querySelector(".media-control-bar");
  
//     console.log(`Fetching data for mp3Id: ${mp3Id}`); 

//     fetch(`/home/find/${mp3Id}`)
//       .then(response => {
//         console.log(`Fetch response for ID ${mp3Id}:`, response); 
//         if (!response.ok) {
//           throw new Error(`Failed to fetch audio data for ID: ${mp3Id}`);
//         }
//         return response.json();
//       })
//       .then(data => {
//         console.log(`Fetched data for mp3Id ${mp3Id}:`, data); 
  
//         if (!playlist.some(song => song.id === mp3Id && song.name === mp3Name)) {
//           playlist.push({ id: mp3Id, data: data.data, name: data.name });
//           console.log("Updated playlist:", playlist);
//         }
 
//         audioPlayer.querySelector("source").src = "data:audio/mpeg;base64," + data.data;
//         songNameElement.textContent = data.name;
//         audioPlayer.load();
//         audioPlayer.play();
//         mediaControlBar.classList.add("active");
//         var seekbar = document.getElementById('seekbar');
//         var currentTimeDisplay = document.getElementById('currentTime');
//         var endTimeDisplay = document.getElementById('endTime');
    
//         updateTimeline(audioPlayer, seekbar, currentTimeDisplay, endTimeDisplay);

//       })
//       .catch(error => {
//         console.error("Error fetching or playing audio:", error);
//       });
//   }
  
// function handleItemClick(mp3Id, mp3Name) {
//     var audioPlayer = document.getElementById("audioPlayer");
//     var songNameElement = document.querySelector(".song-name");
//     var mediaControlBar = document.querySelector(".media-control-bar");
  
//     console.log(`Đang fetch dữ liệu cho mp3Id: ${mp3Id}`);
  
//     fetch(`/home/find/${mp3Id}`)
//       .then(response => {
//         console.log(`Kết quả fetch cho ID ${mp3Id}:`, response);
//         if (!response.ok) {
//           throw new Error(`Không thể fetch dữ liệu âm thanh cho ID: ${mp3Id}`);
//         }
//         return response.json();
//       })
//       .then(data => {
//         console.log(`Dữ liệu fetch được cho mp3Id ${mp3Id}:`, data);
  
//         // Lưu dữ liệu âm thanh vào playlist
//         if (!playlist.some(song => song.id === mp3Id && song.name === mp3Name)) {
//           playlist.push({ id: mp3Id, data: data.data, name: data.name });
//           console.log("Cập nhật playlist:", playlist);
//         }
  
//         // Cập nhật source audio player
//         audioPlayer.querySelector("source").src = "data:audio/mpeg;base64," + data.data;
//         songNameElement.textContent = data.name;
//         audioPlayer.load();
//         audioPlayer.play();
//         mediaControlBar.classList.add("active");
  
//         var seekbar = document.getElementById('seekbar');
//         var currentTimeDisplay = document.getElementById('currentTime');
//         var endTimeDisplay = document.getElementById('endTime');
  
//         updateTimeline(audioPlayer, seekbar, currentTimeDisplay, endTimeDisplay);
//       })
//       .catch(error => {
//         console.error("Lỗi khi fetch hoặc phát âm thanh:", error);
//       });
//   }
  
function handleItemClick(mp3Id, mp3Name, categoryId) {
    var audioPlayer = document.getElementById("audioPlayer");
    var songNameElement = document.querySelector(".song-name");
    var mediaControlBar = document.querySelector(".media-control-bar");
  
    console.log(`Fetching data for mp3Id: ${mp3Id}`); 
  
    fetch(`/home/find/${mp3Id}`)
      .then(response => {
        console.log(`Fetch response for ID ${mp3Id}:`, response); 
        if (!response.ok) {
          throw new Error(`Failed to fetch audio data for ID: ${mp3Id}`);
        }
        return response.json();
      })
      .then(data => {
        console.log(`Fetched data for mp3Id ${mp3Id}:`, data); 
  
        // Cập nhật danh sách phát nếu bài hát chưa có
        if (!playlist.some(song => song.id === mp3Id && song.name === mp3Name)) {
          playlist.push({ id: mp3Id, data: data.data, name: mp3Name });
          console.log("Updated playlist:", playlist);
        }
  
        // Cập nhật trình phát
        audioPlayer.querySelector("source").src = "data:audio/mpeg;base64," + data.data;
        songNameElement.textContent = data.name;
        audioPlayer.load();
        audioPlayer.play();
        mediaControlBar.classList.add("active");
  
        // Cập nhật bài hát hiện tại
        currentSong = { id: mp3Id, name: mp3Name, categoryId: categoryId };
  
        // Cập nhật thanh tiến trình
        var seekbar = document.getElementById('seekbar');
        var currentTimeDisplay = document.getElementById('currentTime');
        var endTimeDisplay = document.getElementById('endTime');
        updateTimeline(audioPlayer, seekbar, currentTimeDisplay, endTimeDisplay);
      })
      .catch(error => {
        console.error("Error fetching or playing audio:", error);
      });
  }
  

// var audioPlayer = document.getElementById("audioPlayer");
// audioPlayer.addEventListener('ended', function() {
//     if (currentSongIndex < playlist.length - 1) {
//         currentSongIndex++; // Chuyển sang bài tiếp theo
//     } else {
//         currentSongIndex = 0; // Quay về bài đầu tiên nếu hết playlist
//     }
//     var nextSong = playlist[currentSongIndex];
//     handleItemClick(nextSong.data, nextSong.name, currentSongIndex);
// });

// audioPlayer.addEventListener('ended', function () {
//     if (currentSongIndex < playlist.length - 1) {
//       currentSongIndex++; // Chuyển sang bài hát tiếp theo
//     } else {
//       currentSongIndex = 0; // Quay lại bài đầu tiên nếu hết playlist
//     }
//     var nextSong = playlist[currentSongIndex];
//     console.log("Đang phát bài hát tiếp theo:", nextSong);
//     handleItemClick(nextSong.id, nextSong.name); // Dùng id để fetch lại dữ liệu
//   });
  


// audioPlayer.addEventListener('ended', function () {
//     if (!filteredPlaylist || filteredPlaylist.length === 0) {
//       const currentCategoryId = currentSong.categoryId; // Lấy categoryId của bài hát hiện tại
  
//       console.log(`Fetching data for mp3Id: ${categoryId}`); 
//       // Gửi yêu cầu để lấy danh sách các bài hát cùng thể loại
//       fetch(`/home/category/${currentCategoryId}`)
//         .then(response => {
//           if (!response.ok) {
//             throw new Error('Không thể lấy danh sách bài hát cùng thể loại');
//           }
//           return response.json();
//         })
//         .then(songs => {
//           // Lưu danh sách id của các bài hát cùng thể loại
//           filteredPlaylist = songs.map(song => ({ id: song._id, name: song.name }));
  
//           console.log('Danh sách bài hát cùng thể loại:', filteredPlaylist);
  
//           // Phát bài hát đầu tiên trong danh sách
//           if (filteredPlaylist.length > 0) {
//             const nextSong = filteredPlaylist.shift(); // Lấy bài hát đầu tiên và xóa khỏi mảng
//             playNextSong(nextSong.id, nextSong.name);
//           }
//         })
//         .catch(error => {
//           console.error('Lỗi khi lấy danh sách bài hát:', error);
//         });
//     } else {
//       // Nếu đã có danh sách filteredPlaylist, phát bài hát tiếp theo
//       const nextSong = filteredPlaylist.shift(); // Lấy bài hát tiếp theo và xóa khỏi mảng
//       playNextSong(nextSong.id, nextSong.name);
//     }
//   });

// audioPlayer.addEventListener('ended', function () {
//   // Nếu danh sách filteredPlaylist rỗng, fetch danh sách mới từ server
//   if (filteredPlaylist.length === 0) {
//       const currentCategoryId = currentSong.categoryId;

//       fetch(`/home/category/${currentCategoryId}`)
//           .then(response => {
//               if (!response.ok) {
//                   throw new Error('Không thể lấy danh sách bài hát cùng thể loại');
//               }
//               return response.json();
//           })
//           .then(songs => {
//               // Gắn danh sách bài hát vào filteredPlaylist
//               filteredPlaylist = songs.map(song => ({ id: song._id, name: song.name, data: song.data }));
//               console.log('Danh sách bài hát cùng thể loại:', filteredPlaylist);

//               // Phát bài hát đầu tiên từ danh sách
//               if (filteredPlaylist.length > 0) {
//                   const nextSong = filteredPlaylist.shift();
//                   playNextSong(nextSong.id, nextSong.name, nextSong.data);
//               }
//           })
//           .catch(error => {
//               console.error('Lỗi khi lấy danh sách bài hát:', error);
//           });
//   } else {
//       // Nếu đã có danh sách, phát bài tiếp theo
//       const nextSong = filteredPlaylist.shift();
//       playNextSong(nextSong.id, nextSong.name, nextSong.data);
//   }
// });

audioPlayer.addEventListener('ended', function () {
  // Nếu filteredPlaylist rỗng, fetch danh sách mới từ server
  if (filteredPlaylist.length === 0) {
    const currentCategoryId = String(currentSong.categoryId);



      fetch(`/home/category/${currentCategoryId}`)
          .then(response => {
              if (!response.ok) {
                  throw new Error('Không thể lấy danh sách bài hát cùng thể loại');
              }
              return response.json();
          })
          .then(songs => {
              // Gắn danh sách bài hát vào filteredPlaylist
              filteredPlaylist = songs.map(song => ({ id: song._id, categoryId: song.categoryId }));
              console.log('Danh sách bài hát cùng thể loại (id và categoryId):', filteredPlaylist);

              // Phát bài hát đầu tiên từ danh sách nếu có
              if (filteredPlaylist.length > 0) {
                  const nextSong = filteredPlaylist.shift();
                  fetchAndPlayNextSong(nextSong.id);
              }
          })
          .catch(error => {
              console.error('Lỗi khi lấy danh sách bài hát:', error);
          });
  } else {
      // Nếu đã có danh sách, phát bài tiếp theo
      const nextSong = filteredPlaylist.shift();
      fetchAndPlayNextSong(nextSong.id);
  }
});


  // function playNextSong(mp3Id, mp3Name) {
  //   fetch(`/home/find/${mp3Id}`)
  //     .then(response => {
  //       if (!response.ok) {
  //         throw new Error(`Không thể fetch dữ liệu cho ID: ${mp3Id}`);
  //       }
  //       return response.json();
  //     })
  //     .then(data => {
  //       console.log(`Dữ liệu bài hát mới (id: ${mp3Id}):`, data);
  
  //       // Cập nhật trình phát
  //       var audioPlayer = document.getElementById("audioPlayer");
  //       var songNameElement = document.querySelector(".song-name");
  
  //       audioPlayer.querySelector("source").src = "data:audio/mpeg;base64," + data.data;
  //       songNameElement.textContent = data.name;
  //       audioPlayer.load();
  //       audioPlayer.play();
  
  //       // Cập nhật bài hát hiện tại
  //       currentSong = { id: mp3Id, name: mp3Name, categoryId: data.categoryId };
  //     })
  //     .catch(error => {
  //       console.error('Lỗi khi phát bài hát tiếp theo:', error);
  //     });
  // }
  


// Nút Next

function fetchAndPlayNextSong(mp3Id) {
  fetch(`/home/find/${mp3Id}`)
      .then(response => {
          if (!response.ok) {
              throw new Error(`Không thể lấy dữ liệu bài hát với ID: ${mp3Id}`);
          }
          return response.json();
      })
      .then(data => {
          console.log(`Dữ liệu bài hát được fetch:`, data);

          // Cập nhật audio player
          audioPlayer.querySelector("source").src = "data:audio/mpeg;base64," + data.data;
          songNameElement.textContent = data.name;
          audioPlayer.load();
          audioPlayer.play();

          // Cập nhật bài hát hiện tại
          currentSong = { id: data._id, name: data.name, categoryId: data.categoryId };
      })
      .catch(error => {
          console.error('Lỗi khi fetch và phát bài hát:', error);
      });
}




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

// const volumeBtn = document.getElementById("volumeBtn");
// const volumeSlider = document.getElementById("volumeSlider");

// volumeBtn.addEventListener("mouseenter", () => {
//     volumeSlider.style.display = "block"; // Hiển thị thanh slider khi di chuột vào nút
// });

// volumeBtn.addEventListener("mouseleave", () => {
//     volumeSlider.style.display = "none"; // Ẩn thanh slider khi không còn di chuột vào nút
// });

const volumeBtn = document.getElementById('volumeBtn');
const volumeSlider = document.getElementById('volumeSlider');

// Hiển thị giá trị mặc định của thanh trượt (0.5)
volumeSlider.addEventListener('input', function() {
  const volumeValue = volumeSlider.value;
  console.log(`Current Volume: ${volumeValue}`); // In giá trị âm lượng ra console
});

// Khi hover vào nút volume, thanh trượt sẽ hiển thị
volumeBtn.addEventListener('mouseenter', () => {
  document.querySelector('.slider-container').style.display = 'block';
});

volumeBtn.addEventListener('mouseleave', () => {
  document.querySelector('.slider-container').style.display = 'none';
});




// Cập nhật âm lượng của audio khi thay đổi thanh slider
volumeSlider.addEventListener("input", (event) => {
    const audioPlayer = document.getElementById("audioPlayer");
    audioPlayer.volume = event.target.value; // Cập nhật âm lượng
});


