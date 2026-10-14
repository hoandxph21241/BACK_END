(function (window, document) {
    "use strict";
    window.initLibraryView = function () {
        const root = document.querySelector(".library-view");
        if (!root || root.dataset.initialized) return;
        root.dataset.initialized = "true";
        const search = root.querySelector("#librarySearch");
        const category = root.querySelector("#libraryCategory");
        const sort = root.querySelector("#librarySort");
        const grid = root.querySelector("#libraryGrid");
        // const count = root.querySelector("#libraryResultCount");
        const empty = root.querySelector("#libraryEmpty");
        const entries = Array.from(grid.children);
        const collator = new Intl.Collator("vi", { sensitivity: "base", numeric: true });
        function update() {
            const query = search.value.trim().toLocaleLowerCase("vi");
            const ordered = entries.slice().sort((a, b) => {
                if (sort.value === "recent") return Number(a.dataset.order) - Number(b.dataset.order);
                const field = sort.value === "artist" ? "artist" : "title";
                return collator.compare(a.dataset[field], b.dataset[field]);
            });
            let matches = 0;
            ordered.forEach(entry => {
                const text = `${entry.dataset.title} ${entry.dataset.artist}`.toLocaleLowerCase("vi");
                entry.hidden = !text.includes(query) || (category.value !== "" && entry.dataset.category !== category.value);
                if (!entry.hidden) matches++;
                grid.append(entry);
            });
            // count.textContent = `${matches} bài hát`;
            empty.hidden = matches > 0;
        }
        search.addEventListener("input", update);
        category.addEventListener("change", update);
        sort.addEventListener("change", update);
    };
    document.addEventListener("DOMContentLoaded", window.initLibraryView);
})(window, document);