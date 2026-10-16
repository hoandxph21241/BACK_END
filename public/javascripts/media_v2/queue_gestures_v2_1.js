(function (window) {
    "use strict";
    window.createQueueGestures = function (list, send) {
        let gesture = null, opened = null, blockClickUntil = 0, scrolling = 0;
        const body = list.parentElement;
        function reveal(row, value) {
            row?.classList.toggle("is-revealed", value);
            const remove = row?.querySelector(".queue-remove");
            if (remove) { remove.tabIndex = value ? 0 : -1; remove.setAttribute("aria-hidden", String(!value)); }
        }
        function closeReveal() { reveal(opened, false); opened = null; }
        function reorder(y) {
            const row = gesture.row;
            const others = [...list.querySelectorAll(".queue-row")].filter(item => item !== row);
            const before = others.find(item => { const rect = item.getBoundingClientRect(); return y < rect.top + rect.height / 2; });
            if (before) list.insertBefore(row, before);
            else list.append(row);
        }
        function autoScroll() {
            if (!gesture || gesture.mode !== "drag") return;
            const rect = body.getBoundingClientRect();
            const y = gesture.y;
            const delta = y < rect.top + 32 ? -8 : y > rect.bottom - 32 ? 8 : 0;
            if (delta) { body.scrollTop += delta; reorder(y); }
            scrolling = requestAnimationFrame(autoScroll);
        }
        function finish(cancelled) {
            if (!gesture) return;
            const current = gesture;
            gesture = null;
            cancelAnimationFrame(scrolling);
            current.row.classList.remove("is-dragging", "is-swiping");
            current.surface.style.removeProperty("transform");
            if (current.mode === "drag") {
                blockClickUntil = performance.now() + 300;
                if (cancelled) list.insertBefore(current.row, current.next?.isConnected ? current.next : null);
                else {
                    const index = [...list.querySelectorAll(".queue-row")].indexOf(current.row);
                    if (index !== current.index) send({ type: "queueMove", songId: current.row.dataset.songId, toIndex: index });
                }
            } else if (current.mode === "swipe") {
                blockClickUntil = performance.now() + 300;
                const show = !cancelled && current.offset < -28;
                reveal(current.row, show);
                opened = show ? current.row : null;
            }
        }
        list.addEventListener("pointerdown", event => {
            if (event.button !== 0 || gesture) return;
            const row = event.target.closest(".queue-row");
            if (!row) { closeReveal(); return; }
            if (event.target.closest(".queue-action,.queue-remove")) return;
            const wasOpen = opened === row;
            closeReveal();
            gesture = { row, surface: row.querySelector(".queue-surface"), id: event.pointerId,
                x: event.clientX, y: event.clientY, startY: event.clientY, offset: wasOpen ? -52 : 0,
                initialOffset: wasOpen ? -52 : 0, mode: "pending", pointerType: event.pointerType, capture: event.target,
                index: [...list.querySelectorAll(".queue-row")].indexOf(row), next: row.nextElementSibling };
            // Keep normal clicks native; capture only after a drag or swipe starts.
        });
        window.addEventListener("pointermove", event => {
            if (!gesture || gesture.id !== event.pointerId) return;
            const dx = event.clientX - gesture.x, dy = event.clientY - gesture.startY;
            gesture.y = event.clientY;
            if (gesture.mode === "pending") {
                if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
                if (Math.abs(dy) > Math.abs(dx)) {
                    // Vertical touch movement keeps native scrolling; mouse movement reorders the whole row.
                    if (gesture.pointerType !== "mouse") { finish(true); return; }
                    gesture.mode = "drag";
                    // Capture on the stable list while rows move between DOM positions.
                    gesture.capture = list;
                    list.setPointerCapture?.(event.pointerId);
                    gesture.row.classList.add("is-dragging");
                    scrolling = requestAnimationFrame(autoScroll);
                } else {
                    gesture.mode = "swipe";
                    gesture.capture.setPointerCapture?.(event.pointerId);
                    gesture.row.classList.add("is-swiping");
                }
            }
            event.preventDefault();
            if (gesture.mode === "drag") reorder(event.clientY);
            else {
                gesture.offset = Math.max(-52, Math.min(0, gesture.initialOffset + dx));
                gesture.surface.style.transform = `translateX(${gesture.offset}px)`;
            }
        });
        window.addEventListener("pointerup", event => { if (gesture?.id === event.pointerId) finish(false); });
        window.addEventListener("pointercancel", () => finish(true));
        list.addEventListener("lostpointercapture", event => {
            if (gesture?.id === event.pointerId && event.target === gesture.capture) finish(true);
        });
        list.addEventListener("click", event => {
            if (performance.now() < blockClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
        }, true);
        return { cancel() { finish(true); closeReveal(); } };
    };
})(window);
// Previous handle-only gestures and keyboard handler retained for reference (disabled).
// (function (window) {
//     "use strict";
//     window.createQueueGestures = function (list, send) {
//         let gesture = null, opened = null, blockClickUntil = 0, scrolling = 0;
//         const body = list.parentElement;
//         function reveal(row, value) {
//             row?.classList.toggle("is-revealed", value);
//             const remove = row?.querySelector(".queue-remove");
//             if (remove) { remove.tabIndex = value ? 0 : -1; remove.setAttribute("aria-hidden", String(!value)); }
//         }
//         function closeReveal() { reveal(opened, false); opened = null; }
//         function reorder(y) {
//             const row = gesture.row;
//             const others = [...list.querySelectorAll(".queue-row")].filter(item => item !== row);
//             const before = others.find(item => { const rect = item.getBoundingClientRect(); return y < rect.top + rect.height / 2; });
//             if (before) list.insertBefore(row, before);
//             else list.append(row);
//         }
//         function autoScroll() {
//             if (!gesture || gesture.mode !== "drag") return;
//             const rect = body.getBoundingClientRect();
//             const y = gesture.y;
//             const delta = y < rect.top + 32 ? -8 : y > rect.bottom - 32 ? 8 : 0;
//             if (delta) { body.scrollTop += delta; reorder(y); }
//             scrolling = requestAnimationFrame(autoScroll);
//         }
//         function finish(cancelled) {
//             if (!gesture) return;
//             const current = gesture;
//             gesture = null;
//             cancelAnimationFrame(scrolling);
//             current.row.classList.remove("is-dragging", "is-swiping");
//             current.surface.style.removeProperty("transform");
//             if (current.mode === "drag") {
//                 blockClickUntil = performance.now() + 300;
//                 if (cancelled) list.insertBefore(current.row, current.next?.isConnected ? current.next : null);
//                 else {
//                     const index = [...list.querySelectorAll(".queue-row")].indexOf(current.row);
//                     if (index !== current.index) send({ type: "queueMove", songId: current.row.dataset.songId, toIndex: index });
//                 }
//             } else if (current.mode === "swipe") {
//                 blockClickUntil = performance.now() + 300;
//                 const show = !cancelled && current.offset < -28;
//                 reveal(current.row, show);
//                 opened = show ? current.row : null;
//             }
//         }
//         list.addEventListener("pointerdown", event => {
//             if (event.button !== 0 || gesture) return;
//             const row = event.target.closest(".queue-row");
//             if (!row) { closeReveal(); return; }
//             const handle = event.target.closest(".queue-drag-handle");
//             if (!handle && event.target.closest(".queue-action,.queue-remove")) return;
//             const wasOpen = opened === row;
//             closeReveal();
//             gesture = { row, surface: row.querySelector(".queue-surface"), id: event.pointerId,
//                 x: event.clientX, y: event.clientY, startY: event.clientY, offset: wasOpen ? -52 : 0,
//                 initialOffset: wasOpen ? -52 : 0, mode: handle ? "drag" : "pending",
//                 index: [...list.querySelectorAll(".queue-row")].indexOf(row), next: row.nextElementSibling };
//             if (handle) {
//                 event.preventDefault(); handle.focus();
//                 handle.setPointerCapture?.(event.pointerId);
//                 row.classList.add("is-dragging");
//                 scrolling = requestAnimationFrame(autoScroll);
//             }
//         });
//         list.addEventListener("pointermove", event => {
//             if (!gesture || gesture.id !== event.pointerId) return;
//             const dx = event.clientX - gesture.x, dy = event.clientY - gesture.startY;
//             gesture.y = event.clientY;
//             if (gesture.mode === "pending") {
//                 if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { finish(true); return; }
//                 if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
//                 gesture.mode = "swipe";
//                 gesture.surface.setPointerCapture?.(event.pointerId);
//                 gesture.row.classList.add("is-swiping");
//             }
//             event.preventDefault();
//             if (gesture.mode === "drag") reorder(event.clientY);
//             else {
//                 gesture.offset = Math.max(-52, Math.min(0, gesture.initialOffset + dx));
//                 gesture.surface.style.transform = `translateX(${gesture.offset}px)`;
//             }
//         });
//         list.addEventListener("pointerup", event => { if (gesture?.id === event.pointerId) finish(false); });
//         list.addEventListener("pointercancel", () => finish(true));
//         list.addEventListener("lostpointercapture", event => {
//             if (gesture?.id === event.pointerId && event.target === gesture.capture) finish(true);
//         });
//         list.addEventListener("click", event => {
//             if (performance.now() < blockClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
//         }, true);
//         list.addEventListener("keydown", event => {
//             const handle = event.target.closest(".queue-drag-handle");
//             if (!handle || !["ArrowUp", "ArrowDown", "Delete"].includes(event.key)) return;
//             event.preventDefault();
//             const rows = [...list.querySelectorAll(".queue-row")];
//             const row = handle.closest(".queue-row"), index = rows.indexOf(row);
//             if (event.key === "Delete") send({ type: "queueRemove", songId: row.dataset.songId });
//             else {
//                 const toIndex = index + (event.key === "ArrowUp" ? -1 : 1);
//                 if (toIndex >= 0 && toIndex < rows.length) send({ type: "queueMove", songId: row.dataset.songId, toIndex });
//             }
//         });
//         return { cancel() { finish(true); closeReveal(); } };
//     };
// })(window);
