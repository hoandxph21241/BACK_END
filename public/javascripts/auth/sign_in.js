(function () {
    "use strict";
    const form = document.getElementById("signinForm");
    const password = document.getElementById("password");
    const toggle = document.getElementById("togglePassword");
    const submit = document.getElementById("signinSubmit");
    if (!form || !password || !toggle || !submit) return;
    toggle.addEventListener("click", () => {
        const reveal = password.type === "password";
        password.type = reveal ? "text" : "password";
        toggle.setAttribute("aria-pressed", String(reveal));
        const label = reveal ? "Ẩn mật khẩu" : "Hiện mật khẩu";
        toggle.setAttribute("aria-label", label);
        toggle.title = label;
        password.focus({ preventScroll: true });
    });
    form.addEventListener("submit", () => {
        submit.disabled = true;
        submit.textContent = "Đang đăng nhập…";
        form.setAttribute("aria-busy", "true");
    });
    window.addEventListener("pageshow", () => {
        submit.disabled = false;
        submit.textContent = "Đăng nhập";
        form.removeAttribute("aria-busy");
    });
})();