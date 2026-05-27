function initUploadForm() {
  if (window._uploadFormInitialized) {
    console.log('initUploadForm: already initialized');
    return;
  }
  window._uploadFormInitialized = true;
  console.log('initUploadForm: initialized');

  let isUploading = false;

  const uploadForm = document.getElementById('uploadForm');
  const uploadBtn = document.getElementById('uploadBtn');
  const backBtn = document.getElementById('backBtn');
  const progressContainer = document.getElementById('uploadProgressContainer');
  const progressBar = document.getElementById('uploadProgressBar');
  const alertContainer = document.getElementById('alertContainer');
  const spinner = uploadBtn.querySelector('.spinner-border');
  const previewContainer = document.getElementById('previewContainer');
  const previewImg = document.getElementById('previewImg');
  const previewPlaceholder = previewContainer.querySelector('.preview-placeholder');

  // Tách wrapper để remove được
  function handleSubmitWrapper(event) {
    event.preventDefault();
    event.stopPropagation();
    console.log('Form submitted - handling with AJAX');
    handleFormSubmit();
  }

  uploadForm.removeEventListener('submit', handleSubmitWrapper);
  uploadForm.addEventListener('submit', handleSubmitWrapper);

  backBtn.addEventListener('click', function (event) {
    event.preventDefault();
    if (window.parent !== window && window.parent.document.getElementById('main')) {
      loadHomePage();
    } else {
      window.location.href = '/home';
    }
  });

  function loadHomePage() {
    fetch('/home')
      .then(res => res.text())
      .then(html => {
        if (window.parent && window.parent.document) {
          const mainElement = window.parent.document.getElementById('main');
          if (mainElement) {
            mainElement.innerHTML = html;
            window.parent.history.pushState(null, '', '/home');
          }
        }
      })
      .catch(() => {
        window.location.href = '/home';
      });
  }

  function showAlert(message, type = 'danger') {
    alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  }

  document.getElementById('mp3File').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      // Kiểm tra loại file
      const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/m4a'];
      const allowedExtensions = ['.mp3', '.m4a'];
      
      const isValidType = allowedTypes.includes(file.type);
      const isValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (!isValidType && !isValidExtension) {
        showAlert('Chỉ chấp nhận file MP3 hoặc M4A! File của bạn không hợp lệ.');
        e.target.value = '';
        return;
      }
      
      // Kiểm tra kích thước
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        showAlert('File MP3 quá lớn! Vui lòng chọn file nhỏ hơn 50MB.');
        e.target.value = '';
        return;
      }
      alertContainer.innerHTML = '';
    }
  });

  document.getElementById('imageFile').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showAlert('Vui lòng chọn file ảnh hợp lệ!');
        e.target.value = '';
        previewImg.style.display = 'none';
        previewPlaceholder.style.display = 'block';
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        showAlert('File ảnh quá lớn! Vui lòng chọn file nhỏ hơn 5MB.');
        e.target.value = '';
        previewImg.style.display = 'none';
        previewPlaceholder.style.display = 'block';
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        previewImg.src = e.target.result;
        previewImg.style.display = 'block';
        previewPlaceholder.style.display = 'none';
      };
      reader.readAsDataURL(file);
      alertContainer.innerHTML = '';
    } else {
      previewImg.style.display = 'none';
      previewPlaceholder.style.display = 'block';
    }
  });

  function handleFormSubmit() {
    if (isUploading) return;
    isUploading = true;

    const categoryId = document.getElementById('categoryId').value;
    const mp3File = document.getElementById('mp3File').files[0];
    const imageFile = document.getElementById('imageFile').files[0];

    if (!categoryId) {
      showAlert('Vui lòng chọn danh mục!');
      isUploading = false;
      return;
    }

    if (!mp3File) {
      showAlert('Vui lòng chọn file MP3!');
      isUploading = false;
      return;
    }

    const formData = new FormData();
    formData.append('name', document.getElementById('mp3Name').value);
    formData.append('categoryId', categoryId);
    formData.append('mp3File', mp3File);
    if (imageFile) formData.append('imageFile', imageFile);

    alertContainer.innerHTML = '';
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.innerText = '0%';
    progressBar.className = 'progress-bar progress-bar-striped bg-info progress-bar-animated';

    uploadBtn.disabled = true;
    backBtn.disabled = true;
    spinner.classList.remove('d-none');

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', function (e) {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = percent + '%';
        progressBar.innerText = percent + '%';
        progressBar.setAttribute('aria-valuenow', percent);
      }
    });

    xhr.upload.addEventListener('loadstart', function () {
      progressBar.style.width = '1%';
      progressBar.innerText = '1%';
      progressBar.setAttribute('aria-valuenow', 1);
    });

    xhr.upload.addEventListener('load', function () {
      progressBar.style.width = '100%';
      progressBar.innerText = 'Đang xử lý...';
      progressBar.setAttribute('aria-valuenow', 100);
    });

    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        isUploading = false;
        uploadBtn.disabled = false;
        backBtn.disabled = false;
        spinner.classList.add('d-none');

        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && response.success) {
            progressBar.classList.remove('bg-info', 'progress-bar-animated');
            progressBar.classList.add('bg-success');
            progressBar.innerText = '100% - Hoàn thành!';
            showAlert('Upload thành công!', 'success');

            setTimeout(() => {
              if (window.parent !== window && window.parent.document.getElementById('main')) {
                loadHomePage();
              } else {
                window.location.href = '/home';
              }
            }, 2000);
          } else {
            throw new Error(response.error || 'Upload thất bại!');
          }
        } catch (err) {
          console.error('JSON parsing error:', err);
            console.error('Response text:', xhr.responseText);
          progressBar.classList.remove('bg-info', 'progress-bar-animated');
          progressBar.classList.add('bg-danger');
          progressBar.innerText = 'Lỗi!';
          showAlert(err.message || 'Có lỗi xảy ra trong quá trình xử lý phản hồi!');
        }
      }
    };

    xhr.onerror = function () {
      isUploading = false;
      uploadBtn.disabled = false;
      backBtn.disabled = false;
      spinner.classList.add('d-none');
      progressBar.classList.remove('bg-info', 'progress-bar-animated');
      progressBar.classList.add('bg-danger');
      progressBar.innerText = 'Lỗi kết nối!';
      showAlert('Lỗi kết nối! Vui lòng thử lại.');
    };

    xhr.ontimeout = function () {
      isUploading = false;
      uploadBtn.disabled = false;
      backBtn.disabled = false;
      spinner.classList.add('d-none');
      progressBar.classList.remove('bg-info', 'progress-bar-animated');
      progressBar.classList.add('bg-danger');
      progressBar.innerText = 'Timeout!';
      showAlert('Upload timeout! Vui lòng thử lại.');
    };

    xhr.open('POST', '/product/upload');
    xhr.timeout = 600000;
    xhr.send(formData);
  }
}

// Safe export
if (typeof window !== 'undefined') {
  window.initUploadForm = initUploadForm;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUploadForm);
  } else {
    initUploadForm();
  }
}
