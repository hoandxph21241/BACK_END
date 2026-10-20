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
            save.disabled = saving || !changed;
            addLink.disabled = saving || linkRows.children.length >= 5;
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
        form.addEventListener("submit", async event => {
            event.preventDefault();
            if (save.disabled || !form.reportValidity()) return;
            const payload = new FormData(form);
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
    };
    document.addEventListener("DOMContentLoaded", window.initProfileView);
})(window, document);
