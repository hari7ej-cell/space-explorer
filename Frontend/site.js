/* =========================================
   SITE-WIDE SCRIPT (every page except error.html)
   - builds the shared header and footer (one copy for the whole site)
   - dropdown menus
   - header search (uses search.js)
   - scroll-reveal and the "Start searching" button
   - starts the login check (auth.js): pages stay hidden until someone is logged in
   Load order: search.js, site.js, then the page's own script.
========================================= */
(function () {
    "use strict";

    const NAV_LINKS = [
        ["Home", "index.html"],
        ["Planet & Space Entity", "planets.html"],
        ["Missions", "missions.html"],
        ["Astronaut", "astronauts.html"]
    ];

    // Pages that belong to a menu entry (the detail page lives under Planets).
    const SECTION_OF_PAGE = { "planet-detail.html": "planets.html", "solar-system.html": "planets.html" };

    const page = location.pathname.split("/").pop() || "index.html";
    const currentSection = SECTION_OF_PAGE[page] || page;

    function exploreLinks(className) {
        return NAV_LINKS.map(([label, href]) => {
            const current = href === currentSection ? ' aria-current="page"' : "";
            return `<a href="${href}"${className ? ` class="${className}"` : ""}${current}>${label.replace("&", "&amp;")}</a>`;
        }).join("");
    }

    /* ---------- header ---------- */

    const HEADER = `
        <div class="header-left">
            <div class="dropdown">
                <button class="nav-button" id="exploreButton" aria-haspopup="true" aria-expanded="false">
                    <span>Explore</span><span class="chevron" aria-hidden="true">⌄</span>
                </button>
                <nav class="dropdown-menu explore-menu" aria-label="Explore">${exploreLinks()}</nav>
            </div>

            <div class="search-container" role="search">
                <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" />
                </svg>
                <input id="searchInput" type="text" placeholder="Search..." aria-label="Search planets and space topics" autocomplete="off" maxlength="80">
            </div>
        </div>

        <div class="header-logo">
            <a href="index.html" aria-label="Space Explorer home"><img src="assets/logo.jpeg" alt="Space Explorer"></a>
        </div>

        <div class="header-right">
            <div class="dropdown account-dropdown">
                <button class="account-button" id="accountButton" aria-haspopup="true" aria-expanded="false">
                    <div class="account-greeting">Hello</div>
                    <div class="account-title">Account &amp; Lists <span class="chevron" aria-hidden="true">⌄</span></div>
                </button>
                <div class="dropdown-menu account-menu">
                    <div class="account-email">
                        <span class="account-menu-label">Your account</span>
                        <span class="account-email-value"></span>
                    </div>
                    <div class="menu-divider"></div>
                    <a href="login.html" data-logout><span class="menu-icon">⏻</span>Log out</a>
                </div>
            </div>
        </div>`;

    /* ---------- footer ---------- */

    const FOOTER = `
        <div class="footer-main">
            <div class="footer-brand">
                <a href="index.html" class="footer-logo-link"><img src="assets/logo.jpeg" alt="Space Explorer Logo" class="footer-logo"></a>
                <h2>Space Explorer</h2>
                <p class="footer-mission">Our mission is to present space information in a clear and structured way, making it easier for everyone to explore, understand, and discover the universe.</p>
                <p class="footer-mission">Space Explorer aims to provide an engaging platform for people who are curious about space and passionate about learning about planets, missions, astronauts, and the wonders beyond Earth.</p>
            </div>

            <div class="footer-column">
                <h3>Explore</h3>
                ${exploreLinks()}
            </div>

            <div class="footer-column">
                <h3>Account</h3>
                <a href="login.html" data-logout>Log out</a>
            </div>

            <div class="footer-column">
                <h3>Connect</h3>
                <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" class="social-link"><span class="social-icon">◎</span>Instagram</a>
                <a href="mailto:spaceexplorer@example.com" class="social-link"><span class="social-icon">@</span>Email</a>
                <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" class="social-link"><span class="social-icon">◉</span>WhatsApp</a>
            </div>
        </div>

        <div class="footer-bottom">
            <p>© 2026 Space Explorer | Explore. Discover. Understand.</p>
            <p>Earth and Moon textures: Solar System Scope (CC BY 4.0), based on NASA data.</p>
        </div>`;

    document.getElementById("siteHeader").innerHTML = HEADER;
    document.getElementById("siteFooter").innerHTML = FOOTER;

    /* ---------- dropdown menus ---------- */

    const dropdowns = [...document.querySelectorAll(".dropdown")];

    function closeDropdowns(except) {
        dropdowns.forEach(dropdown => {
            if (dropdown === except) return;
            dropdown.classList.remove("active");
            dropdown.querySelector("button").setAttribute("aria-expanded", "false");
        });
    }

    dropdowns.forEach(dropdown => {
        const button = dropdown.querySelector("button");
        button.addEventListener("click", event => {
            event.stopPropagation();
            closeDropdowns(dropdown);
            const open = dropdown.classList.toggle("active");
            button.setAttribute("aria-expanded", String(open));
        });
    });

    document.addEventListener("click", () => closeDropdowns());
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeDropdowns(); });

    /* ---------- search ---------- */

    const searchInput = document.getElementById("searchInput");
    const searchBox = searchInput.closest(".search-container");
    let searching = false;

    searchInput.addEventListener("keydown", event => {
        if (event.key !== "Enter" || searching) return;
        searching = true;

        SpaceSearch.run(searchInput.value, {
            onBusy: () => {
                searchBox.classList.add("searching");
                searchInput.setAttribute("aria-busy", "true");
            },
            onIdle: () => {
                searchBox.classList.remove("searching");
                searchInput.removeAttribute("aria-busy");
                searching = false;
            },
            // Nothing typed: shake the box instead of doing nothing.
            onEmpty: () => {
                searching = false;
                searchBox.classList.remove("shake");
                void searchBox.offsetWidth;   // restart the animation
                searchBox.classList.add("shake");
                searchInput.focus();
            }
        });
    });

    // "Start searching" buttons jump back up to the search box.
    document.querySelectorAll("#ctaSearch").forEach(button => {
        button.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setTimeout(() => searchInput.focus(), 450);
        });
    });

    /* ---------- scroll reveal ---------- */

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12 });

    document.querySelectorAll(".reveal").forEach(element => observer.observe(element));

    /* ---------- login check (auth.js) ---------- */

    window.authReady = import("./auth.js").then(auth => auth.signedIn);
})();
