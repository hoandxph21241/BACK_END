(function (window, document) {
    "use strict";
    window.initProfileView = function () {
        const root = document.querySelector("[data-profile-view]");
        if (!root || root.dataset.initialized) return;
        root.dataset.initialized = "true";
        const find = id => root.querySelector(`#${id}`);
        const dialog = find("profileEditDialog"), form = find("profileEditForm");
        const save = find("profileSaveButton"), error = find("profileFormError");
        const avatar = find("profileAvatar"), banner = find("profileBanner");
        const fullName = find("profileFullNameInput"), tag = find("profileTagInput"), bio = find("profileBioInput");
        // Previous: let current = { fullName: fullName.value, profileTag: tag.value.replace(/^#/, ""), bio: bio.value, imageAccount: avatar.getAttribute("src"), bannerImage: banner.getAttribute("src") };
        const extraFields = Object.fromEntries(["firstName", "lastName", "city", "country"].map(name =>
            [name, form.elements.namedItem(name)]));
        const linkRows = find("profileLinkRows"), addLink = find("profileAddLink");
        let current = {
            fullName: fullName.value, profileTag: tag.value.replace(/^#/, ""), bio: bio.value,
            imageAccount: avatar.getAttribute("src"), bannerImage: banner.getAttribute("src"),
            ...Object.fromEntries(Object.entries(extraFields).map(([name, input]) => [name, input.value])),
            links: JSON.parse(find("profileLinksData").value),
        };
        let saving = false, linkSequence = 0;
        let imageBusy = false, imageRevision = 0, imageRequest;
        const cropEditor = window.ProfileImageCropper?.create(root);
        const croppedFiles = new Map(), originalImages = new Map(), cropSizes = new Map();
        const previews = new Map();
        const fallbackAvatar = "/images/auth/person-circle.svg", fallbackBanner = "/images/bg_main.png";
        root.querySelectorAll("[data-image-fallback]").forEach(image => {
            image.addEventListener("error", () => { image.src = image.dataset.imageFallback; }, { once: true });
        });
        function isWebLink(value) {
            try {
                const url = new URL(value);
                return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
            } catch { return false; }
        }
        function readLinks() {
            return Array.from(linkRows.children, row => ({
                label: row.querySelector(".profile-link-label").value.trim(),
                url: row.querySelector(".profile-link-url").value.trim(),
            }));
        }
        function editorValues() {
            return {
                fullName: fullName.value.trim(), profileTag: tag.value.trim().replace(/^#/, "").toLowerCase(),
                bio: bio.value.trim(),
                ...Object.fromEntries(Object.entries(extraFields).map(([name, input]) => [name, input.value.trim()])),
                links: readLinks(),
            };
        }
        let savedValues;
        function updateDirtyState() {
            const changed = JSON.stringify(editorValues()) !== savedValues || previews.size > 0;
            // Previous: save.disabled = saving || !changed;
            save.disabled = saving || imageBusy || !changed;
            addLink.disabled = saving || linkRows.children.length >= 5;
            root.querySelectorAll('[data-profile-file-target]').forEach(button => { button.disabled = saving || imageBusy; });
            root.querySelectorAll('[data-profile-adjust]').forEach(button => {
                const id = button.dataset.profileAdjust;
                const source = id === 'profileAvatarFile' ? current.imageAccount : current.bannerImage;
                button.disabled = saving || imageBusy || (!originalImages.has(id) && (!source || source === fallbackAvatar || source === fallbackBanner));
            });
        }
        function imageSize(inputId) {
            if (inputId === 'profileAvatarFile') return { width: 512, height: 512 };
            const bounds = root.querySelector('.profile-header').getBoundingClientRect();
            return { width: Math.max(1, Math.round(bounds.width || 1240)), height: Math.max(1, Math.round(bounds.height || 320)) };
        }
        function updateDimensions() {
            const size = cropSizes.get('profileBannerFile') || imageSize('profileBannerFile');
            find('profileBannerDimensions').textContent = `${size.width} x ${size.height} px`;
            find('profileBannerPreview').parentElement.style.setProperty('--profile-banner-ratio', String(size.width / size.height));
        }
        async function adjustImage(inputId, selectedFile) {
            if (saving || imageBusy) return;
            const request = ++imageRevision;
            imageBusy = true;
            error.hidden = true;
            updateDirtyState();
            try {
                if (!cropEditor) throw new Error('Image editor is unavailable. Please reload the page.');
                let original = selectedFile ? { file: selectedFile } : originalImages.get(inputId);
                if (!original) {
                    const source = inputId === 'profileAvatarFile' ? current.imageAccount : current.bannerImage;
                    const url = new URL(source, location.origin);
                    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Please upload the image again to adjust it.');
                    imageRequest = new AbortController();
                    const response = await fetch(url, { signal: imageRequest.signal,
                        credentials: url.origin === location.origin ? 'same-origin' : 'omit' });
                    if (!response.ok || Number(response.headers.get('content-length')) > 5 * 1024 * 1024) throw new Error('Unable to load this image. Please upload it again.');
                    const blob = await response.blob();
                    if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) || !blob.size || blob.size > 5 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP image up to 5 MB.');
                    original = { file: new File([blob], inputId === 'profileAvatarFile' ? 'profile-picture' : 'profile-banner', { type: blob.type }) };
                }
                if (request !== imageRevision || !root.isConnected || !dialog.open) return;
                const size = cropSizes.get(inputId) || imageSize(inputId);
                const result = await cropEditor.open({ file: original.file, data: original.data,
                    kind: inputId === 'profileAvatarFile' ? 'avatar' : 'banner', ...size });
                if (!result || request !== imageRevision || !root.isConnected || !dialog.open) return;
                if (previews.has(inputId)) URL.revokeObjectURL(previews.get(inputId));
                const preview = URL.createObjectURL(result.file);
                previews.set(inputId, preview);
                croppedFiles.set(inputId === 'profileAvatarFile' ? 'avatar' : 'banner', result.file);
                originalImages.set(inputId, { file: original.file, data: result.data });
                cropSizes.set(inputId, { width: result.width, height: result.height });
                find(inputId === 'profileAvatarFile' ? 'profileAvatarPreview' : 'profileBannerPreview').src = preview;
                const filename = find(`${inputId}Name`);
                filename.textContent = original.file.name; filename.title = original.file.name; filename.hidden = false;
                updateDimensions();
            } catch (failure) {
                if (request !== imageRevision || failure.name === 'AbortError') return;
                error.textContent = failure.message; error.hidden = false;
            } finally {
                if (request === imageRevision) { imageBusy = false; imageRequest = null; updateDirtyState(); }
            }
        }
        function appendLink(link = { label: "", url: "" }, focus = false) {
            if (linkRows.children.length >= 5) return;
            const row = document.createElement("div");
            row.className = "profile-link-row";
            const index = ++linkSequence;
            // Previous link label: "Tên liên kết".
            [["label", "Link title", "text", 60], ["url", "URL", "url", 2048]].forEach(([key, title, type, max]) => {
                const field = document.createElement("div"), label = document.createElement("label"), input = document.createElement("input");
                input.id = `profileLink${key}${index}`;
                input.className = `profile-link-${key}`;
                input.type = type;
                input.maxLength = max;
                input.value = link[key] || "";
                input.autocomplete = "off";
                label.htmlFor = input.id;
                label.textContent = title;
                if (key === "url") {
                    input.required = true;
                    input.placeholder = "https://";
                    input.addEventListener("input", () => input.setCustomValidity(
                        // Previous: "Nhập liên kết http:// hoặc https:// hợp lệ."
                        input.value && !isWebLink(input.value.trim()) ? "Enter a valid http:// or https:// link." : ""));
                }
                field.append(label, input);
                row.append(field);
            });
            const remove = document.createElement("button"), icon = document.createElement("span");
            remove.type = "button";
            remove.className = "profile-remove-link";
            // Previous: remove.title = "Xóa liên kết"; remove.setAttribute("aria-label", "Xóa liên kết");
            remove.title = "Remove link";
            remove.setAttribute("aria-label", "Remove link");
            icon.className = "profile-icon profile-x";
            icon.setAttribute("aria-hidden", "true");
            remove.append(icon);
            remove.addEventListener("click", () => {
                if (saving) return;
                row.remove();
                updateDirtyState();
                addLink.focus();
            });
            row.append(remove);
            linkRows.append(row);
            if (focus) row.querySelector("input").focus();
        }
        addLink.addEventListener("click", () => {
            if (saving) return;
            appendLink(undefined, true);
            updateDirtyState();
        });
        form.addEventListener("input", updateDirtyState);
        function resetEditor() {
            imageRevision++;
            imageRequest?.abort(); imageRequest = null;
            cropEditor?.close();
            imageBusy = false;
            croppedFiles.clear(); originalImages.clear(); cropSizes.clear();
            previews.forEach(url => URL.revokeObjectURL(url));
            previews.clear();
            form.reset();
            find("profileAvatarFile").setCustomValidity("");
            find("profileBannerFile").setCustomValidity("");
            // Previous: both filename labels displayed "Chưa chọn ảnh" when empty.
            ["profileAvatarFileName", "profileBannerFileName"].forEach(id => {
                find(id).textContent = "";
                find(id).title = "";
                find(id).hidden = true;
            });
            fullName.value = current.fullName;
            tag.value = `#${current.profileTag}`;
            bio.value = current.bio;
            Object.entries(extraFields).forEach(([name, input]) => { input.value = current[name] || ""; });
            linkRows.replaceChildren();
            (current.links || []).forEach(link => appendLink(link));
            find("profileAvatarPreview").src = current.imageAccount || fallbackAvatar;
            find("profileBannerPreview").src = current.bannerImage || fallbackBanner;
            savedValues = JSON.stringify(editorValues());
            updateDimensions();
            updateDirtyState();
        }
        function openEditor() {
            resetEditor();
            error.hidden = true;
            if (!dialog.open) dialog.showModal();
        }
        find("editProfileButton").addEventListener("click", openEditor);
        root.querySelectorAll("[data-profile-file-target]").forEach(button => {
            button.addEventListener("click", () => find(button.dataset.profileFileTarget).click());
        });
        root.querySelectorAll('[data-profile-adjust]').forEach(button => {
            button.addEventListener('click', () => adjustImage(button.dataset.profileAdjust));
        });
        // Previous: root.querySelectorAll("[data-close-profile]").forEach(button => button.addEventListener("click", () => dialog.close()));
        root.querySelectorAll("[data-close-profile]").forEach(button => button.addEventListener("click", () => { if (!saving) dialog.close(); }));
        dialog.addEventListener("cancel", event => { if (saving) event.preventDefault(); });
        dialog.addEventListener("close", resetEditor);
        let pressedOutside = false;
        function isOutsideDialog(event) {
            const bounds = dialog.getBoundingClientRect();
            return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right ||
                event.clientY < bounds.top || event.clientY > bounds.bottom);
        }
        dialog.addEventListener("pointerdown", event => {
            pressedOutside = event.button === 0 && isOutsideDialog(event);
        });
        dialog.addEventListener("click", event => {
            // Previous: if (pressedOutside && isOutsideDialog(event)) dialog.close();
            if (!saving && pressedOutside && isOutsideDialog(event)) dialog.close();
            pressedOutside = false;
        });
        /* Previous direct preview/upload handler; originals are now staged through the crop editor.
        [["profileAvatarFile", "profileAvatarPreview"], ["profileBannerFile", "profileBannerPreview"]].forEach(([inputId, previewId]) => {
            const input = find(inputId);
            input.addEventListener("change", () => {
                input.setCustomValidity("");
                const file = input.files[0];
                const filename = find(`${inputId}Name`);
                // Previous: filename.textContent = file ? file.name : "Chưa chọn ảnh";
                filename.textContent = file ? file.name : "";
                filename.hidden = !file;
                filename.title = file ? file.name : "";
                if (previews.has(inputId)) {
                    URL.revokeObjectURL(previews.get(inputId));
                    previews.delete(inputId);
                }
                updateDirtyState();
                if (!file) {
                    find(previewId).src = inputId === "profileAvatarFile" ? current.imageAccount || fallbackAvatar : current.bannerImage || fallbackBanner;
                    return;
                }
                if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
                    // Previous: input.setCustomValidity("Chọn ảnh JPG, PNG hoặc WebP không quá 5 MB.");
                    input.setCustomValidity("Choose a JPG, PNG or WebP image up to 5 MB.");
                    input.reportValidity();
                    return;
                }
                // Previous: if (previews.has(inputId)) URL.revokeObjectURL(previews.get(inputId));
                const url = URL.createObjectURL(file);
                previews.set(inputId, url);
                find(previewId).src = url;
                updateDirtyState();
            });
        });
        */
        ['profileAvatarFile', 'profileBannerFile'].forEach(inputId => {
            const input = find(inputId);
            input.addEventListener('change', () => {
                const file = input.files[0];
                // Do not let an unconfirmed original enter FormData, including after Cancel.
                input.value = ''; input.setCustomValidity('');
                if (!file) return;
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) {
                    error.textContent = 'Choose a JPG, PNG or WebP image up to 5 MB.'; error.hidden = false; return;
                }
                adjustImage(inputId, file);
            });
        });
        form.addEventListener("submit", async event => {
            event.preventDefault();
            if (save.disabled || !form.reportValidity()) return;
            const payload = new FormData(form);
            payload.delete('avatar'); payload.delete('banner');
            croppedFiles.forEach((file, field) => payload.set(field, file, file.name));
            payload.set("links", JSON.stringify(readLinks()));
            saving = true;
            save.disabled = true;
            // Previous: save.textContent = "Đang lưu…";
            save.textContent = "Saving...";
            form.setAttribute("aria-busy", "true");
            error.hidden = true;
            const lockedControls = Array.from(form.querySelectorAll("input, textarea, button"))
                .filter(control => !control.disabled);
            lockedControls.forEach(control => { control.disabled = true; });
            try {
                const response = await fetch(form.action, {
                    // Previous: method: "POST", body: new FormData(form),
                    method: "POST", body: payload,
                    headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
                });
                // Previous: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Your session has expired. Please sign in again.");
                const data = await response.json();
                // Previous fallback: "Không thể lưu hồ sơ."
                if (!response.ok || !data.success) throw new Error(data.message || "Unable to save your profile.");
                if (!root.isConnected) return;
                current = data.user;
                avatar.src = current.imageAccount || fallbackAvatar;
                banner.src = current.bannerImage || fallbackBanner;
                find("profileFullName").textContent = current.fullName;
                find("profileTagLabel").textContent = `#${current.profileTag}`;
                // Previous: find("profileBio").textContent = current.bio || "Chưa có giới thiệu.";
                find("profileBio").textContent = current.bio || "No bio yet.";
                const location = [current.city, current.country].filter(Boolean).join(", ");
                find("profileLocation").textContent = location;
                find("profileLocation").hidden = !location;
                const links = find("profileLinks");
                links.replaceChildren();
                (current.links || []).filter(link => isWebLink(link.url)).forEach(link => {
                    const item = document.createElement("li"), anchor = document.createElement("a");
                    anchor.href = link.url;
                    anchor.target = "_blank";
                    anchor.rel = "noopener noreferrer";
                    anchor.textContent = link.label || link.url;
                    item.append(anchor);
                    links.append(item);
                });
                document.querySelectorAll(".nav-account-photo").forEach(image => { image.src = current.imageAccount || fallbackAvatar; });
                dialog.close();
                // Previous: find("profileSaveStatus").textContent = "Đã lưu thay đổi.";
                find("profileSaveStatus").textContent = "Changes saved.";
            } catch (failure) {
                error.textContent = failure.message;
                error.hidden = false;
            } finally {
                // Previous: save.disabled = false;
                saving = false;
                lockedControls.forEach(control => { control.disabled = false; });
                updateDirtyState();
                // Previous: save.textContent = "Lưu thay đổi";
                save.textContent = "Save changes";
                form.removeAttribute("aria-busy");
            }
        });
        resetEditor();
        if (root.dataset.editOpen === "true") dialog.showModal();
        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(root.querySelector('.profile-header'));
        const removalObserver = new MutationObserver(() => { if (!root.isConnected) cleanupImages(); });
        removalObserver.observe(root.parentElement, { childList: true });
        function cleanupImages() {
            imageRevision++; imageRequest?.abort(); cropEditor?.destroy();
            previews.forEach(url => URL.revokeObjectURL(url)); previews.clear();
            croppedFiles.clear(); originalImages.clear(); cropSizes.clear();
            resizeObserver.disconnect(); removalObserver.disconnect();
            window.removeEventListener('pagehide', cleanupImages);
        }
        window.addEventListener('pagehide', cleanupImages, { once: true });
    };
    document.addEventListener("DOMContentLoaded", window.initProfileView);
})(window, document);
