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
        let current = { fullName: fullName.value, profileTag: tag.value.replace(/^#/, ""), bio: bio.value, imageAccount: avatar.getAttribute("src"), bannerImage: banner.getAttribute("src") };
        const previews = new Map();
        const fallbackAvatar = "/images/auth/person-circle.svg", fallbackBanner = "/images/bg_main.png";
        root.querySelectorAll("[data-image-fallback]").forEach(image => {
            image.addEventListener("error", () => { image.src = image.dataset.imageFallback; }, { once: true });
        });
        function resetEditor() {
            previews.forEach(url => URL.revokeObjectURL(url));
            previews.clear();
            form.reset();
            find("profileAvatarFile").setCustomValidity("");
            find("profileBannerFile").setCustomValidity("");
            find("profileAvatarFileName").textContent = "Chưa chọn ảnh";
            find("profileBannerFileName").textContent = "Chưa chọn ảnh";
            fullName.value = current.fullName;
            tag.value = `#${current.profileTag}`;
            bio.value = current.bio;
            find("profileAvatarPreview").src = current.imageAccount || fallbackAvatar;
            find("profileBannerPreview").src = current.bannerImage || fallbackBanner;
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
        root.querySelectorAll("[data-close-profile]").forEach(button => button.addEventListener("click", () => dialog.close()));
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
            if (pressedOutside && isOutsideDialog(event)) dialog.close();
            pressedOutside = false;
        });
        [["profileAvatarFile", "profileAvatarPreview"], ["profileBannerFile", "profileBannerPreview"]].forEach(([inputId, previewId]) => {
            const input = find(inputId);
            input.addEventListener("change", () => {
                input.setCustomValidity("");
                const file = input.files[0];
                const filename = find(`${inputId}Name`);
                filename.textContent = file ? file.name : "Chưa chọn ảnh";
                filename.title = file ? file.name : "";
                if (!file) {
                    find(previewId).src = inputId === "profileAvatarFile" ? current.imageAccount || fallbackAvatar : current.bannerImage || fallbackBanner;
                    return;
                }
                if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
                    input.setCustomValidity("Chọn ảnh JPG, PNG hoặc WebP không quá 5 MB.");
                    input.reportValidity();
                    return;
                }
                if (previews.has(inputId)) URL.revokeObjectURL(previews.get(inputId));
                const url = URL.createObjectURL(file);
                previews.set(inputId, url);
                find(previewId).src = url;
            });
        });
        form.addEventListener("submit", async event => {
            event.preventDefault();
            if (save.disabled || !form.reportValidity()) return;
            save.disabled = true;
            save.textContent = "Đang lưu…";
            form.setAttribute("aria-busy", "true");
            error.hidden = true;
            try {
                const response = await fetch(form.action, {
                    method: "POST", body: new FormData(form),
                    headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
                });
                if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.message || "Không thể lưu hồ sơ.");
                current = data.user;
                avatar.src = current.imageAccount || fallbackAvatar;
                banner.src = current.bannerImage || fallbackBanner;
                find("profileFullName").textContent = current.fullName;
                find("profileTagLabel").textContent = `#${current.profileTag}`;
                find("profileBio").textContent = current.bio || "Chưa có giới thiệu.";
                document.querySelectorAll(".nav-account-photo").forEach(image => { image.src = current.imageAccount || fallbackAvatar; });
                dialog.close();
                find("profileSaveStatus").textContent = "Đã lưu thay đổi.";
            } catch (failure) {
                error.textContent = failure.message;
                error.hidden = false;
            } finally {
                save.disabled = false;
                save.textContent = "Lưu thay đổi";
                form.removeAttribute("aria-busy");
            }
        });
        if (root.dataset.editOpen === "true") dialog.showModal();
    };
    document.addEventListener("DOMContentLoaded", window.initProfileView);
})(window, document);