(function () {
    "use strict";
    const form = document.getElementById("registerForm");
    if (!form) return;
    const password = document.getElementById("registerPassword");
    const confirm = document.getElementById("confirmPassword");
    const error = document.getElementById("passwordMatchError");
    const submit = document.getElementById("registerSubmit");
    function validateMatch() {
        const mismatch = confirm.value !== "" && confirm.value !== password.value;
        confirm.setCustomValidity(mismatch ? "Mật khẩu xác nhận chưa khớp." : "");
        confirm.setAttribute("aria-invalid", String(mismatch));
        error.hidden = !mismatch;
    }
    password.addEventListener("input", validateMatch);
    confirm.addEventListener("input", validateMatch);
    document.querySelectorAll("[data-password-target]").forEach(button => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.passwordTarget);
            const reveal = input.type === "password";
            input.type = reveal ? "text" : "password";
            button.setAttribute("aria-pressed", String(reveal));
            const suffix = input === confirm ? " mật khẩu xác nhận" : " mật khẩu";
            const label = (reveal ? "Ẩn" : "Hiện") + suffix;
            button.setAttribute("aria-label", label);
            button.title = label;
            input.focus({ preventScroll: true });
        });
    });
    form.addEventListener("submit", event => {
        validateMatch();
        if (!form.checkValidity()) {
            event.preventDefault();
            form.reportValidity();
            return;
        }
        submit.disabled = true;
        submit.textContent = "Đang tạo tài khoản…";
        form.setAttribute("aria-busy", "true");
    });
    window.addEventListener("pageshow", () => {
        submit.disabled = false;
        submit.textContent = "Tạo tài khoản";
        form.removeAttribute("aria-busy");
        validateMatch();
    });
})();