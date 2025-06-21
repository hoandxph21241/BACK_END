function initUploadForm() {
  const uploadForm = document.getElementById('uploadForm');
  const uploadBtn = document.getElementById('uploadBtn');
  const backBtn = document.getElementById('backBtn');
  const progressContainer = document.getElementById('uploadProgressContainer');
  const progressBar = document.getElementById('uploadProgressBar');
  const alertContainer = document.getElementById('alertContainer');
  const spinner = uploadBtn.querySelector('.spinner-border');
  const imagePreview = document.getElementById('imagePreview');
  const previewImg = document.getElementById('previewImg');

  uploadForm.addEventListener('submit', function(event) {
    event.preventDefault();
    event.stopPropagation();
    console.log('Form submitted - handling with AJAX');
    handleFormSubmit();
  });

  // uploadBtn.addEventListener('click', function(event) {
  //   event.preventDefault();
  //   console.log('Upload button clicked');
  //   handleFormSubmit();
  // });

  backBtn.addEventListener('click', function(event) {
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

  document.getElementById('mp3File').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        showAlert('File MP3 quá lớn! Vui lòng chọn file nhỏ hơn 50MB.');
        e.target.value = '';
        return;
      }
      
      alertContainer.innerHTML = '';
    }
  });

  document.getElementById('imageFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showAlert('Vui lòng chọn file ảnh hợp lệ!');
        e.target.value = '';
        imagePreview.style.display = 'none';
        return;
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        showAlert('File ảnh quá lớn! Vui lòng chọn file nhỏ hơn 10MB.');
        e.target.value = '';
        imagePreview.style.display = 'none';
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        previewImg.src = e.target.result;
        imagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
      
      alertContainer.innerHTML = '';
    } else {
      imagePreview.style.display = 'none';
    }
  });

  function handleFormSubmit() {
    console.log('handleFormSubmit called');
    
    const categoryId = document.getElementById('categoryId').value;
    const mp3File = document.getElementById('mp3File').files[0];
    const imageFile = document.getElementById('imageFile').files[0];
    
    if (!categoryId) {
      showAlert('Vui lòng chọn danh mục!');
      return false;
    }
    
    if (!mp3File) {
      showAlert('Vui lòng chọn file MP3!');
      return false;
    }

    const formData = new FormData();
    formData.append('name', document.getElementById('mp3Name').value);
    formData.append('categoryId', categoryId);
    formData.append('mp3File', mp3File);
    
    if (imageFile) {
      formData.append('imageFile', imageFile);
    }

    console.log('Starting upload...');

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
        console.log(`Upload progress: ${percent}%`);
      }
    });

    xhr.upload.addEventListener('loadstart', function(e) {
      console.log('Upload started');
      progressBar.style.width = '1%';
      progressBar.innerText = '1%';
      progressBar.setAttribute('aria-valuenow', 1);
    });

    xhr.upload.addEventListener('load', function(e) {
      console.log('Upload completed');
      progressBar.style.width = '100%';
      progressBar.innerText = 'Đang xử lý...';
      progressBar.setAttribute('aria-valuenow', 100);
    });

    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        console.log('Request completed with status:', xhr.status);
        
        uploadBtn.disabled = false;
        backBtn.disabled = false;
        spinner.classList.add('d-none');
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('Server response:', response);
            
            if (response.success) {
              progressBar.classList.remove('bg-info', 'progress-bar-animated');
              progressBar.classList.add('bg-success');
              progressBar.style.width = '100%';
              progressBar.innerText = '100% - Hoàn thành!';
              progressBar.setAttribute('aria-valuenow', 100);
              
              let successMessage = 'Upload thành công!';
              // if (response.data.imageUrl) {
              //   successMessage += ' (Bao gồm ảnh bìa)';
              // }
              // successMessage += ' Đang chuyển hướng...';
              
              showAlert(successMessage, 'success');
              
              setTimeout(() => {
                if (window.parent !== window && window.parent.document.getElementById('main')) {
                  loadHomePage();
                } else {
                  window.location.href = '/home';
                }
              }, 2000);
            } else {
              progressBar.classList.remove('bg-info', 'progress-bar-animated');
              progressBar.classList.add('bg-danger');
              progressBar.style.width = '100%';
              progressBar.innerText = 'Lỗi!';
              progressBar.setAttribute('aria-valuenow', 100);
              
              showAlert(response.error || response.message || 'Upload thất bại!');
            }
          } catch (e) {
            console.error('JSON parsing error:', e);
            console.error('Response text:', xhr.responseText);
            
            progressBar.classList.remove('bg-info', 'progress-bar-animated');
            progressBar.classList.add('bg-danger');
            progressBar.style.width = '100%';
            progressBar.innerText = 'Lỗi!';
            progressBar.setAttribute('aria-valuenow', 100);
            
            console.error('Response text:', xhr.responseText);
            showAlert('Có lỗi xảy ra trong quá trình xử lý phản hồi!');
          }
        } else {
          console.error('HTTP error:', xhr.status, xhr.responseText);
        
          progressBar.classList.remove('bg-info', 'progress-bar-animated');
          progressBar.classList.add('bg-danger');
          progressBar.style.width = '100%';
          progressBar.innerText = 'Lỗi!';
          progressBar.setAttribute('aria-valuenow', 100);
          
          try {
            const response = JSON.parse(xhr.responseText);
            showAlert(response.error || response.message || `Upload thất bại! (Mã lỗi: ${xhr.status})`);
          } catch (e) {
            showAlert(`Upload thất bại! (Mã lỗi: ${xhr.status})`);
          }
        }
      }
    };


    xhr.onerror = function() {
      console.error('Network error occurred');
      
      uploadBtn.disabled = false;
      backBtn.disabled = false;
      spinner.classList.add('d-none');
      
      progressBar.classList.remove('bg-info', 'progress-bar-animated');
      progressBar.classList.add('bg-danger');
      progressBar.style.width = '100%';
      progressBar.innerText = 'Lỗi kết nối!';
      progressBar.setAttribute('aria-valuenow', 100);
      
      showAlert('Lỗi kết nối! Vui lòng kiểm tra mạng và thử lại.');
    };

    xhr.ontimeout = function() {
      console.error('Request timeout');
      
      uploadBtn.disabled = false;
      backBtn.disabled = false;
      spinner.classList.add('d-none');
      
      progressBar.classList.remove('bg-info', 'progress-bar-animated');
      progressBar.classList.add('bg-danger');
      progressBar.style.width = '100%';
      progressBar.innerText = 'Timeout!';
      progressBar.setAttribute('aria-valuenow', 100);
      
      showAlert('Upload timeout! Vui lòng thử lại.');
    };

    xhr.open('POST', '/product/upload');
    xhr.timeout = 600000;
    xhr.send(formData);
    
    return false;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUploadForm);
} else {
  initUploadForm();
}
if (typeof window !== 'undefined') {
  window.initUploadForm = initUploadForm;
}
