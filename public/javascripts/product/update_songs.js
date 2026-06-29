document.addEventListener('DOMContentLoaded', function () {
  const maxImageSize = 5 * 1024 * 1024;

  document.querySelectorAll('.song-editor').forEach(function (editor) {
    const input = editor.querySelector('.update-image-input');
    const coverWrap = editor.querySelector('.cover-wrap');
    if (!input || !coverWrap) return;

    input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please choose a valid image file.');
        input.value = '';
        return;
      }

      if (file.size > maxImageSize) {
        alert('Image is too large. Maximum size is 5MB.');
        input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = function (event) {
        let img = coverWrap.querySelector('img');
        const placeholder = coverWrap.querySelector('.cover-placeholder');

        if (!img) {
          img = document.createElement('img');
          img.className = 'cover-preview';
          img.alt = 'Image preview';
          coverWrap.innerHTML = '';
          coverWrap.appendChild(img);
        }

        if (placeholder) {
          placeholder.remove();
        }

        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  });
});
