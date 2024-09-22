let offset = 0;
const limit = 6;
let viewSongs = [];
let isLoading = false;

function fetchData() {
  if (isLoading) return;
  isLoading = true;
  fetch(`/home/fetch?offset=${offset}`)
    .then((response) => response.json())
    .then((data) => {
      viewSongs = viewSongs.concat(data);
      renderSongs();
      offset += limit;
      isLoading = false;
    });
}

// function renderSongs() {
//   const rowElement = document.querySelector(".row");
//   viewSongs.forEach((mp3) => {
//     const mp3Element = document.createElement("div");
//     mp3Element.className = "col-md-4 mb-3";
//     mp3Element.innerHTML = `

//     <div role="heading">
//     <div class="row p-5">
//         <div class="col-md-4 mb-3">
//                 <div class="card h-100 d-flex justify-content-center" style="width: 21rem">
//                     <img src="https://i.pinimg.com/236x/ff/5f/b3/ff5fb33001497b403cb86db7978b7943.jpg"
//                         class="card-img-top" style="height: 100%; width: 100%;" />

//                     <div class="card-body bg-dark-subtle">
//                         <h5 class="card-title text-center">
//                             <%= mp3.name %>
//                         </h5>

//                         <div class="flex-shrink-0">

//                         </div>

//                     </div>
//                 </div>

//             </div>
//     </div>
//     </div>`;
//     rowElement.appendChild(mp3Element);
//   });
// }

function renderSongs() {
  const rowElement = document.querySelector('.row');
  viewSongs.forEach(mp3 => {
      const mp3Element = `
          <div class="col-md-4 mb-3"
              onclick="handleItemClick('${mp3.data}', '${mp3.name}')">
              <div class="card h-100 d-flex justify-content-center" style="width: 21rem">
                  <img src="https://i.pinimg.com/236x/ff/5f/b3/ff5fb33001497b403cb86db7978b7943.jpg"
                      class="card-img-top" style="height: 100%; width: 100%;" />
                  <div class="card-body bg-dark-subtle">
                      <h5 class="card-title text-center">
                          ${mp3.name}
                      </h5>
                  </div>
              </div>
          </div>`;
      rowElement.insertAdjacentHTML('beforeend', mp3Element);
  });
}


function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
function handleScroll() {
  // Lấy phần tử cuối cùng trong danh sách bài hát
  const songs = document.querySelectorAll(".col-md-4.mb-3");
  const lastSong = songs[songs.length - 1];

  // Kiểm tra khoảng cách từ phần tử cuối cùng đến cuối trang
  const lastSongOffset = lastSong.offsetTop + lastSong.clientHeight;
  const pageOffset = window.pageYOffset + window.innerHeight;
  const bottomOffset = 20; // Ngưỡng để kích hoạt tải thêm dữ liệu

  // Nếu người dùng cuộn đến gần cuối trang, gọi hàm fetchData
  if (pageOffset > lastSongOffset - bottomOffset) {
    fetchData();
  }
}

// Thêm sự kiện cuộn trang
window.addEventListener("scroll", handleScroll);
