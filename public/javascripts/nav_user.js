(function () {
    "use strict";
    document.querySelectorAll("[data-avatar-fallback]").forEach(image => {
        const fallback = () => { image.src = image.dataset.avatarFallback; };
        if (image.complete && image.naturalWidth === 0) fallback();
        else image.addEventListener("error", fallback, { once: true });
    });
})();