function initializeDynamicContent() {
  if (document.getElementById('uploadForm')) {
    if (typeof window.initUploadForm === 'function') {
      window.initUploadForm();
    }
    else {
      const scripts = document.getElementById('main').querySelectorAll('script');
      scripts.forEach(script => {
        try {
          eval(script.textContent || script.innerHTML);
        } catch (e) {
          console.error('Error executing script:', e);
        }
      });
    }
  }
}

document.querySelectorAll('.song-item').forEach(item => {
  item.addEventListener('click', () => {
    const mp3Id = item.dataset.id;
    const mp3Name = item.dataset.name;
    const categoryId = item.dataset.category;

    const iframe = document.getElementById('mediaPlayerFrame');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { mp3Id, mp3Name, categoryId },
        '*'  // bạn có thể thay '*' bằng domain iframe nếu muốn an toàn hơn
      );
    }
  });
});

window.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'playlistState') {
    window.isExpanded = event.data.isExpanded;
    const iframeContainer = document.getElementById('iframeContainer');
    if (iframeContainer) {
      if (window.isExpanded) {
        iframeContainer.style.height = '67%';
      } else {
        iframeContainer.style.height = '20%';
      }
    }
  }
});

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    const url = this.dataset.url;
    document.getElementById('main').innerHTML = '';
    fetch(url)
      .then(res => res.text())
      .then(html => {
        document.getElementById('main').innerHTML = html;
        setTimeout(() => {
          initializeDynamicContent();
        }, 100);
        history.pushState(null, '', url);
      })
      .catch(err => console.error('Lỗi tải trang:', err));
  });
});

window.addEventListener('popstate', () => {
  fetch(location.pathname)
    .then(res => res.text())
    .then(html => {
      document.getElementById('main').innerHTML = html;
      setTimeout(() => {
        initializeDynamicContent();
      }, 100);
    });
});

document.getElementById('main').addEventListener('click', function (event) {
  let target = event.target;
  while (target && !target.classList.contains('song-item')) {
    target = target.parentElement;
  }
  if (target && target.classList.contains('song-item')) {
    const mp3Id = target.dataset.id;
    const mp3Name = target.dataset.name;
    const categoryId = target.dataset.category;

    const iframe = document.getElementById('mediaPlayerFrame');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { mp3Id, mp3Name, categoryId },
        '*'
      );
    }
  }
});
