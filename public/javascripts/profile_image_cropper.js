(function (window, document) {
    'use strict';
    window.ProfileImageCropper = Object.freeze({ create(root) {
        const find = id => root.querySelector(`#${id}`);
        const dialog = find('profileCropDialog'), image = find('profileCropImage');
        const stage = find('profileCropStage'), apply = find('profileCropApply');
        // Previous: const zoom = find('profileCropZoom'), percent = find('profileCropZoomValue');
        const error = find('profileCropError'), status = find('profileCropStatus');
        let cropper, sourceUrl, job, selection, sequence = 0, exporting = false, resizeTimer, stageSize = '';

        function release() {
            sequence++;
            clearTimeout(resizeTimer);
            cropper?.destroy(); cropper = null;
            image.onload = image.onerror = null;
            image.removeAttribute('src');
            if (sourceUrl) URL.revokeObjectURL(sourceUrl);
            sourceUrl = null;
            exporting = false;
            selection = null;
            stage.dataset.ready = 'false';
        }
        function finish(result = null) {
            const pending = job;
            job = null;
            release();
            if (dialog.open) dialog.close();
            pending?.resolve(result);
        }
        /* Previous manual zoom calculations, replaced by fixed-scale automatic fitting.
        function minimumRatio() {
            const box = cropper.getCropBoxData(), natural = cropper.getImageData();
            return Math.max(box.width / natural.naturalWidth, box.height / natural.naturalHeight);
        }
        function updateZoom() {
            if (!cropper || stage.dataset.ready !== 'true') return;
            const data = cropper.getImageData();
            const amount = Math.max(1, data.width / data.naturalWidth / minimumRatio());
            zoom.value = String(Math.min(300, Math.round((amount - 1) * 100)));
            percent.textContent = `${Math.round(amount * 100)}%`;
        }
        */
        function centerImage() {
            const container = cropper.getContainerData(), canvas = cropper.getCanvasData();
            cropper.moveTo((container.width - canvas.width) / 2, (container.height - canvas.height) / 2);
            selection = cropper.getData();
        }
        function buildCropper(data) {
            const pending = job, request = sequence;
            stage.dataset.ready = 'false'; apply.disabled = true;
            cropper?.destroy();
            cropper = new window.Cropper(image, {
                aspectRatio: pending.width / pending.height, viewMode: 1, dragMode: 'move', responsive: false,
                autoCropArea: 0.82, cropBoxMovable: false, cropBoxResizable: false,
                toggleDragModeOnDblclick: false, background: false, guides: true,
                checkCrossOrigin: false, checkOrientation: false, zoomable: false,
                zoomOnTouch: false, zoomOnWheel: false, rotatable: false, scalable: false,
                ready() {
                    if (job !== pending || request !== sequence) return;
                    const container = cropper.getContainerData(), natural = cropper.getImageData();
                    const ratio = pending.width / pending.height;
                    const width = Math.min(container.width - 32, (container.height - 32) * ratio);
                    const height = width / ratio;
                    /* Previous: retained native output scale, leaving both axes movable for large images.
                    const enlargement = Math.max(1, pending.width / natural.naturalWidth, pending.height / natural.naturalHeight);
                    const scale = width / pending.width * enlargement;
                    */
                    // Cover the frame exactly on one axis so only the overflowing axis can move.
                    const scale = Math.max(width / natural.naturalWidth, height / natural.naturalHeight);
                    const canvasWidth = natural.naturalWidth * scale, canvasHeight = natural.naturalHeight * scale;
                    cropper.setCanvasData({ width: canvasWidth, height: canvasHeight,
                        left: (container.width - canvasWidth) / 2, top: (container.height - canvasHeight) / 2 });
                    cropper.setCropBoxData({ left: (container.width - width) / 2, top: (container.height - height) / 2, width, height });
                    centerImage();
                    if (data?.width > 0 && data?.height > 0) {
                        const box = cropper.getCropBoxData();
                        /* Previous: restored the old scale as well as position.
                        const scale = box.width / data.width;
                        */
                        const x = Math.max(0, Math.min(natural.naturalWidth - box.width / scale,
                            data.x + (data.width - box.width / scale) / 2));
                        const y = Math.max(0, Math.min(natural.naturalHeight - box.height / scale,
                            data.y + (data.height - box.height / scale) / 2));
                        cropper.setCanvasData({ width: canvasWidth, height: canvasHeight,
                            left: box.left - x * scale, top: box.top - y * scale });
                    }
                    stage.dataset.ready = 'true'; status.hidden = true;
                    selection = cropper.getData();
                    apply.disabled = false; stage.focus({ preventScroll: true });
                },
                crop() { if (cropper && stage.dataset.ready === 'true') selection = cropper.getData(); },
            });
        }
        const resizeObserver = new ResizeObserver(() => {
            const bounds = stage.getBoundingClientRect(), size = `${bounds.width}:${bounds.height}`;
            if (size === stageSize) return;
            stageSize = size;
            if (!job || !cropper || exporting || stage.dataset.ready !== 'true' || !bounds.width) return;
            const data = selection || cropper.getData();
            clearTimeout(resizeTimer);
            // Rebuild from source coordinates so a smaller preview cannot shift the selected subject.
            resizeTimer = setTimeout(() => { if (job && !exporting) buildCropper(data); }, 100);
        });
        resizeObserver.observe(stage);
        root.querySelectorAll('[data-close-crop]').forEach(button => button.addEventListener('click', () => finish()));
        dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
        dialog.addEventListener('close', () => { if (job && !dialog.open) finish(); });
        let outside = false;
        const isOutside = event => {
            const rect = dialog.getBoundingClientRect();
            return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
        };
        dialog.addEventListener('pointerdown', event => { outside = event.button === 0 && isOutside(event); });
        dialog.addEventListener('click', event => { if (outside && isOutside(event)) finish(); outside = false; });
        /* Previous manual zoom controls (disabled).
        zoom.addEventListener('input', () => {
            if (cropper && !exporting && stage.dataset.ready === 'true') cropper.zoomTo(minimumRatio() * (1 + Number(zoom.value) / 100));
        });
        root.querySelectorAll('[data-crop-zoom]').forEach(button => button.addEventListener('click', () => {
            zoom.value = String(Math.max(0, Math.min(300, Number(zoom.value) + Number(button.dataset.cropZoom))));
            zoom.dispatchEvent(new Event('input'));
        }));
        */
        find('profileCropReset').addEventListener('click', () => { if (cropper && !exporting && stage.dataset.ready === 'true') centerImage(); });
        stage.addEventListener('keydown', event => {
            if (!cropper || exporting || stage.dataset.ready !== 'true') return;
            const step = event.shiftKey ? 10 : 2;
            const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            if (moves[event.key]) { event.preventDefault(); event.stopPropagation(); cropper.move(...moves[event.key]); }
        });
        apply.addEventListener('click', async () => {
            if (!job || !cropper || exporting || stage.dataset.ready !== 'true') return;
            exporting = true; apply.disabled = true; error.hidden = true;
            const pending = job, request = sequence;
            try {
                const canvas = cropper.getCroppedCanvas({ width: pending.width, height: pending.height,
                    maxWidth: pending.width, maxHeight: pending.height, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
                if (!canvas) throw new Error('Unable to crop this image.');
                const data = cropper.getData();
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.92));
                if (request !== sequence || job !== pending) return;
                if (!blob || !blob.size || blob.size > 5 * 1024 * 1024) throw new Error('The cropped image must be 5 MB or smaller.');
                const extension = blob.type === 'image/webp' ? 'webp' : 'png';
                const name = pending.file.name.replace(/\.[^.]+$/, '') + '-cropped.' + extension;
                finish({ file: new File([blob], name, { type: blob.type }), data,
                    width: canvas.width, height: canvas.height });
            } catch (failure) {
                if (request !== sequence) return;
                error.textContent = failure.message; error.hidden = false;
                exporting = false; apply.disabled = false;
            }
        });

        function open(options) {
            finish();
            if (typeof window.Cropper !== 'function') return Promise.reject(new Error('Image editor is unavailable. Please reload the page.'));
            const width = Math.round(options.width), height = Math.round(options.height);
            if (!(width > 0 && height > 0 && width <= 3840 && height <= 1024)) return Promise.reject(new Error('Invalid image frame size.'));
            return new Promise(resolve => {
                job = { ...options, width, height, resolve };
                const request = sequence;
                find('profileCropTitle').textContent = options.kind === 'avatar' ? 'Adjust profile picture' : 'Adjust banner';
                find('profileCropDimensions').textContent = `${width} x ${height} px`;
                stage.classList.toggle('is-avatar-crop', options.kind === 'avatar');
                stage.dataset.ready = 'false';
                error.hidden = true; status.hidden = false; status.textContent = 'Loading image...';
                // Previous: also reset the manual zoom slider and percent label.
                apply.disabled = true;
                image.onload = () => {
                    if (!job || request !== sequence) return;
                    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 40000000 ||
                        Math.max(image.naturalWidth, image.naturalHeight) > 16384) {
                        error.textContent = 'Choose an image up to 40 megapixels and 16384 pixels per side.';
                        error.hidden = false; status.hidden = true; return;
                    }
                    image.onload = null;
                    buildCropper(options.data);
                };
                image.onerror = () => {
                    if (request !== sequence) return;
                    error.textContent = 'Unable to read this image. Choose a JPG, PNG or WebP image.';
                    error.hidden = false; status.hidden = true;
                };
                dialog.showModal();
                const bounds = stage.getBoundingClientRect();
                stageSize = `${bounds.width}:${bounds.height}`;
                sourceUrl = URL.createObjectURL(options.file);
                image.src = sourceUrl;
            });
        }
        return Object.freeze({ open, close: finish, destroy() { finish(); resizeObserver.disconnect(); } });
    } });
})(window, document);
