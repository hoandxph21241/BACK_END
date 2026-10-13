// function initializeDynamicContent() {
//   if (document.getElementById('uploadForm')) {
//     if (typeof window.initUploadForm === 'function') {
//       window.initUploadForm();
//     }
//     else {
//       const scripts = document.getElementById('main').querySelectorAll('script');
//       scripts.forEach(script => {
//         try {
//           eval(script.textContent || script.innerHTML);
//         } catch (e) {
//           console.error('Error executing script:', e);
//         }
//       });
//     }
//   }
// }


// document.querySelectorAll('.song-item').forEach(item => {
//   item.addEventListener('click', () => {
//     const mp3Id = item.dataset.id;
//     const mp3Name = item.dataset.name;
//     const categoryId = item.dataset.category;

//     const iframe = document.getElementById('mediaPlayerFrame');
//     if (iframe && iframe.contentWindow) {
//       iframe.contentWindow.postMessage(
//         { mp3Id, mp3Name, categoryId },
//         '*'  // bạn có thể thay '*' bằng domain iframe nếu muốn an toàn hơn
//       );
//     }
//   });
// });

// window.addEventListener('message', function (event) {
//   if (event.data && event.data.type === 'playlistState') {
//     window.isExpanded = event.data.isExpanded;
//     const iframeContainer = document.getElementById('iframeContainer');
//     if (iframeContainer) {
//       if (window.isExpanded) {
//         iframeContainer.style.height = '67%';
//       } else {
//         iframeContainer.style.height = '20%';
//       }
//     }
//   }
// });

// document.querySelectorAll('.nav-link').forEach(link => {
//   link.addEventListener('click', function (e) {
//     e.preventDefault();
//     const url = this.dataset.url;
//     document.getElementById('main').innerHTML = '';
//     fetch(url)
//       .then(res => res.text())
//       .then(html => {
//         document.getElementById('main').innerHTML = html;
//         setTimeout(() => {
//           initializeDynamicContent();
//         }, 100);
//         history.pushState(null, '', url);
//       })
//       .catch(err => console.error('Lỗi tải trang:', err));
//   });
// });

// window.addEventListener('popstate', () => {
//   fetch(location.pathname)
//     .then(res => res.text())
//     .then(html => {
//       document.getElementById('main').innerHTML = html;
//       setTimeout(() => {
//         initializeDynamicContent();
//       }, 100);
//     });
// });

// document.getElementById('main').addEventListener('click', function (event) {
//   let target = event.target;
//   while (target && !target.classList.contains('song-item')) {
//     target = target.parentElement;
//   }
//   if (target && target.classList.contains('song-item')) {
//     const mp3Id = target.dataset.id;
//     const mp3Name = target.dataset.name;
//     const categoryId = target.dataset.category;

//     const iframe = document.getElementById('mediaPlayerFrame');
//     if (iframe && iframe.contentWindow) {
//       iframe.contentWindow.postMessage(
//         { mp3Id, mp3Name, categoryId },
//         '*'
//       );
//     }
//   }
// });



(function () {
  const main = document.getElementById('main');

  // Khởi tạo nội dung động sau khi tải trang.
  function initializeDynamicContent() {
    if (!main) return;

    const uploadForm = main.querySelector('#uploadForm');

    if (uploadForm) {
      if (typeof window.initUploadForm === 'function') {
        window.initUploadForm();
      } else {
        // Chỉ dùng để tương thích với script nội tuyến của nội dung tải động.
        const scripts = main.querySelectorAll('script');

        scripts.forEach((script) => {
          if (script.src || script.dataset.executed === 'true') return;

          try {
            script.dataset.executed = 'true';
            // Giữ hành vi cũ cho các script nội tuyến.
            // Lưu ý: eval có giới hạn và không nên dùng với nội dung không đáng tin cậy.
            (0, eval)(script.textContent || script.innerHTML);
          } catch (error) {
            console.error('Lỗi khởi tạo script:', error);
          }
        });
      }
    }
  }

  // Gửi thông tin bài hát sang iframe trình phát.
  function sendSongToPlayer(item) {
    if (!item) return;

    const iframe = document.getElementById('mediaPlayerFrame');

    if (!iframe || !iframe.contentWindow) {
      console.error('Không tìm thấy iframe trình phát nhạc.');
      return;
    }

    const mp3Id = item.dataset.id;

    if (!mp3Id) {
      console.error('Bài hát không có ID.');
      return;
    }

    const targetOrigin = new URL(iframe.src, window.location.href).origin;

    iframe.contentWindow.postMessage(
      {
        type: 'songSelected',
        mp3Id: mp3Id,
        mp3Name: item.dataset.name || 'Unknown Song',
        categoryId: item.dataset.category || null
      },
      targetOrigin
    );
  }

  // Tải trang vào vùng main mà không tải lại toàn bộ website.
  async function loadPage(url, updateHistory = true) {
    if (!main || !url) return;

    try {
      const response = await fetch(url, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      main.innerHTML = html;

      initializeDynamicContent();

      if (updateHistory) {
        history.pushState({ url }, '', url);
      }
    } catch (error) {
      console.error('Lỗi tải trang:', error);
    }
  }

  // Một listener duy nhất xử lý bài hát trong cả nội dung tải động.
  if (main) {
    main.addEventListener('click', function (event) {
      const songItem = event.target.closest('.song-item');

      if (songItem && main.contains(songItem)) {
        sendSongToPlayer(songItem);
        return;
      }

      const navLink = event.target.closest('.nav-link');

      if (navLink && main.contains(navLink)) {
        event.preventDefault();

        const url = navLink.dataset.url || navLink.getAttribute('href');

        if (url) {
          loadPage(url);
        }
      }
    });
  }

  // Nhận trạng thái playlist từ iframe.
  window.addEventListener('message', function (event) {
    const iframe = document.getElementById('mediaPlayerFrame');

    // Chỉ chấp nhận thông điệp từ iframe trình phát.
    if (!iframe || event.source !== iframe.contentWindow) return;

    const data = event.data;

    if (data && data.type === 'playlistState') {
      window.isExpanded = Boolean(data.isExpanded);

      const iframeContainer = document.getElementById('iframeContainer');

      if (iframeContainer) {
        iframeContainer.style.height = window.isExpanded ? '67%' : '20%';
      }
    }
  });

  // Hỗ trợ nút Back/Forward của trình duyệt.
  window.addEventListener('popstate', function () {
    loadPage(window.location.pathname + window.location.search, false);
  });

  // Khởi tạo nội dung ban đầu nếu có form upload.
  initializeDynamicContent();
})();