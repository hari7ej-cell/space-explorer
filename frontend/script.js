/* =========================================
   NAVIGATION DROPDOWNS
========================================= */
const exploreButton = document.getElementById("exploreButton");
const exploreDropdown = exploreButton?.closest(".dropdown");
const accountButton = document.getElementById("accountButton");
const accountDropdown = accountButton?.closest(".dropdown");

exploreButton?.addEventListener("click", event => {
    event.stopPropagation();
    exploreDropdown?.classList.toggle("active");
    accountDropdown?.classList.remove("active");
});

accountButton?.addEventListener("click", event => {
    event.stopPropagation();
    accountDropdown?.classList.toggle("active");
    exploreDropdown?.classList.remove("active");
});

document.addEventListener("click", () => {
    exploreDropdown?.classList.remove("active");
    accountDropdown?.classList.remove("active");
});

/* Search remains intentionally inactive until the search feature is built. */
const searchInput = document.getElementById("searchInput");
searchInput?.addEventListener("keydown", event => {
    if (event.key === "Enter" && searchInput.value.trim()) {
        console.info("Search is not enabled yet.");
    }
});
