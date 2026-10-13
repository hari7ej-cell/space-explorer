const exploreButton = document.getElementById("exploreButton");
const exploreDropdown = exploreButton.closest(".dropdown");

const accountButton = document.getElementById("accountButton");
const accountDropdown = accountButton.closest(".dropdown");

exploreButton.addEventListener("click", event => {
    event.stopPropagation();
    exploreDropdown.classList.toggle("active");
    accountDropdown.classList.remove("active");
});

accountButton.addEventListener("click", event => {
    event.stopPropagation();
    accountDropdown.classList.toggle("active");
    exploreDropdown.classList.remove("active");
});

document.addEventListener("click", () => {
    exploreDropdown.classList.remove("active");
    accountDropdown.classList.remove("active");
});

const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        const value = searchInput.value.trim();

        if (value) {
            window.location.href =
                "index.html?search=" +
                encodeURIComponent(value);
        }
    }
});
const API_BASE = "http://localhost:3000";
const params = new URLSearchParams(window.location.search);
const entity = params.get("entity") || "Mars";
const breadcrumbEntity = document.getElementById("breadcrumb-entity");
function formatNavigationLabel(title) {
    let label = String(title || "")
        .replace(/\([^)]*\)/g, "")
        .replace(/\s+/g, " ")
        .trim();

    // Remove trailing conjunctions and prepositions
    label = label.replace(
        /\s+\b(and|or|of|the|for|in|to|with|from|on|by|at|about)$/i,
        ""
    ).trim();

    return label || title;
}
if (breadcrumbEntity) {
    breadcrumbEntity.textContent = entity
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());
}
const app = document.getElementById("app");

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
}

function normalizeText(value) {
    let source = String(value ?? "");
    // API content sometimes arrives as HTML, or as HTML escaped twice.
    // Decode entities first, then parse and extract visible text instead of showing markup.
    const decode = document.createElement("textarea");
    for (let i = 0; i < 2; i++) {
        decode.innerHTML = source;
        const decoded = decode.value;
        if (decoded === source) break;
        source = decoded;
    }
    const doc = new DOMParser().parseFromString(source, "text/html");
    doc.querySelectorAll("script, style, noscript, table, sup.reference, .reference, .mw-editsection").forEach(el => el.remove());
    return (doc.body.textContent || source)
        .replace(/\[[0-9]+\]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function shortSummary(value, max = 240) {
    const clean = normalizeText(value);

    if (!clean || clean.length < 40) {
        return "";
    }

    const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];

    // Prefer a general introduction rather than a historical event.
    const preferred = sentences.find(sentence =>
        !/\b(first successful|first flyby|discovered in|was discovered|was conducted|launched in|mission began)\b/i.test(sentence)
        && sentence.trim().length >= 50
    );

    let result = (preferred || sentences[0]).trim();

    if (result.length > max) {
        result = result.slice(0, max - 1).trimEnd() + "…";
    }

    return result;
}

function summarizeTopic(value, max = 2400) {
    let clean = normalizeText(value)
        .replace(/\b(edit|citation needed|failed verification)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

    if (
        !clean ||
        /information is not available in the matching wikipedia section/i.test(clean)
    ) {
        return "";
    }

    // Split text into sentences.
    const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];

    const completeSentences = [];
    let totalLength = 0;

    for (const sentence of sentences) {
        const trimmed = sentence.trim();

        if (!trimmed) continue;

        // Don't include an incomplete final sentence.
        const isComplete = /[.!?]["')\]]*$/.test(trimmed);

        if (!isComplete) continue;

        const separatorLength = completeSentences.length > 0 ? 1 : 0;

        // Stop before exceeding the character limit.
        if (totalLength + separatorLength + trimmed.length > max) {
            break;
        }

        completeSentences.push(trimmed);
        totalLength += separatorLength + trimmed.length;
    }

    return completeSentences.join(" ");
}

function imageForTopic(images, topicId) {
    return (images || []).find(item => item.topicId === topicId && item.url) || null;
}

function cleanCaption(image) {
    const caption = normalizeText(image?.caption || "");
    const description = normalizeText(image?.description || "");
    const title = normalizeText(image?.title || "");

    // Prefer the actual image caption.
    if (caption.length > description.length) {
        return caption;
    }

    // Otherwise use the image description.
    if (description) {
        return description;
    }

    // Use the title only when no longer text is available.
    if (title) {
        return title;
    }

    return "Image related to this space topic.";
}
function renderImage(image, extraClass = "") {
    if (!image?.url) return "";
    return `<figure class="topic-media ${extraClass}">
        <img src="${escapeHTML(image.url)}" alt="${escapeHTML(image.title || "Space image")}" loading="lazy" referrerpolicy="no-referrer">
        <figcaption>${escapeHTML(cleanCaption(image))}</figcaption>
    </figure>`;
}

function render(data) {
    const name = data.entity?.name || entity;

    const breadcrumbEntity = document.getElementById("breadcrumb-entity");

    if (breadcrumbEntity) {
        breadcrumbEntity.textContent = name;
    }

    document.title = `Space Explorer | ${name}`;
    const images = (data.images || []).filter(item => item && item.url);

    // NASA's official Mars page hero image.
    const nasaHeroImages = {
        mars: "https://science.nasa.gov/wp-content/uploads/2024/03/pia04304-mars.jpg?w=1536"
    };

    const nasaHeroUrl = nasaHeroImages[name.trim().toLowerCase()] || "";

    const hero = nasaHeroUrl
        ? {
            url: nasaHeroUrl,
            title: `${name} - NASA official hero image`,
            topicId: "overview"
        }
        : (
            images.find(item => item.topicId === "overview") ||
            images[0] ||
            null
        );

    const heroUrl = hero?.url || "";
    const topics = (data.topics || [])
        .map(topic => ({ ...topic, displayContent: summarizeTopic(topic.content) }))
        .filter(topic => topic.displayContent);
    // Get the 3D model information from the backend API.
const model3D = data.model3D || {};

const modelAvailable =
    model3D.available === true &&
    model3D.format === "iframe" &&
    typeof model3D.url === "string" &&
    model3D.url.trim() !== "";
    const topicImageUsage = new Set();
    const renderedTopics = topics.map((topic, index) => {
    let media = imageForTopic(images, topic.id);

    // Use the hero image in Overview if that topic has no image.
    if (topic.title.trim().toLowerCase() === "overview") {
        media = media || hero;
    }

    // Do not repeat the hero image in other topics.
    if (
        topic.title.trim().toLowerCase() !== "overview" &&
        media &&
        media.url === heroUrl
    ) {
        media = null;
    }

    // Prevent the same image from appearing in multiple topics.
    if (media && topicImageUsage.has(media.url)) {
        media = null;
    }

    if (media) {
        topicImageUsage.add(media.url);
    }

    const id = `topic-${topic.id}`;
    const imageMarkup = renderImage(media);

    // Keep images beside the text when appropriate.
    const layoutClass = media
        ? (index % 2 === 0 ? "image-right" : "image-left")
        : "text-only";

    return `
        <section class="article-section ${layoutClass}" id="${escapeHTML(id)}">
            <div class="topic-copy">
                <h2>${escapeHTML(topic.title)}</h2>

                ${imageMarkup}
                <p>${escapeHTML(topic.displayContent)}</p>

            </div>
        </section>
    `;
    }).join("");

    app.innerHTML = `
        <section class="entity-hero ${heroUrl ? "has-hero-image" : "no-hero-image"}" ${heroUrl ? `style="--hero-image: url('${escapeHTML(heroUrl).replace(/'/g, "%27")}')"` : ""}>
            <div class="entity-hero-content">
                <span class="entity-kicker">${escapeHTML((apiType = data.entity?.type).toUpperCase())}</span>
                <h1 class="entity-title">${escapeHTML(name)}</h1>
                <p class="entity-intro">${escapeHTML(
        shortSummary(
            (
                normalizeText(data.summary).length > 100 &&
                normalizeText(data.summary).trim().toLowerCase() !== name.trim().toLowerCase()
            )
                ? data.summary
                : (
                    topics.find(topic =>
                        topic.title?.trim().toLowerCase() === "overview"
                    )?.content || ""
                ),
            240
        )
    )}</p>
            </div>
        </section>
        <nav class="article-navigation" aria-label="Space entity topics">
    <div class="article-navigation-inner">
        ${topics.map(topic => `
            <a href="#topic-${escapeHTML(topic.id)}">
                ${escapeHTML(formatNavigationLabel(topic.shortTitle || topic.title))}
            </a>
        `).join("")}
        ${modelAvailable ? `<a class="model-nav-link" href="#entity-model">3D Model</a>` : ""}
    </div>
</nav>
        <div class="article-layout">
            ${renderedTopics || `<section class="article-section text-only"><div class="topic-copy"><h2>Overview</h2><p>Detailed information is not available right now.</p></div></section>`}
        </div>
        ${modelAvailable ? `
    <section class="entity-model-section" id="entity-model">
        <h2>3D Model</h2>

        <h3>${escapeHTML(model3D.name || name)}</h3>

        <iframe
            class="entity-model-frame"
            src="${escapeHTML(model3D.url)}"
            title="${escapeHTML(`3D Model of ${model3D.name || name}`)}"
            loading="lazy"
            allowfullscreen>
        </iframe>
    </section>
` : ""}
    `;

    // If an image is genuinely panoramic/wider than its card, let it span the whole card.
    app.querySelectorAll(".topic-media img").forEach(img => {
        const markSize = () => {
            if (
    img.naturalWidth &&
    img.naturalHeight &&
    img.naturalWidth / img.naturalHeight >= 4
) {
    img.closest(".article-section")?.classList.add("wide-media");
}
        };
        if (img.complete) markSize(); else img.addEventListener("load", markSize, { once: true });
        img.addEventListener("error", () => img.closest(".topic-media")?.remove(), { once: true });
    });

    // Keep topic links internal to Space Explorer. Wikipedia/NASA article links are intentionally not rendered.
    app.querySelectorAll(".article-navigation a").forEach(link => {
        link.addEventListener("click", event => {
            const target = document.querySelector(link.getAttribute("href"));
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            history.replaceState(null, "", link.getAttribute("href"));
        });
    });
    setupSectionNavigation();
}
function setupSectionNavigation() {
    const nav = document.querySelector(".article-navigation");

    if (!nav) return;

    const navLinks = nav.querySelectorAll("a[href^='#']");

    const sections = Array.from(navLinks)
        .map(link => document.querySelector(link.getAttribute("href")))
        .filter(Boolean);

    if (!sections.length) return;

    const observer = new IntersectionObserver(
        entries => {
            // Find the section nearest the top of the reading area.
            const visibleSections = sections
                .map(section => {
                    const rect = section.getBoundingClientRect();

                    return {
                        section,
                        top: rect.top,
                        bottom: rect.bottom
                    };
                })
                .filter(item =>
                    item.top < window.innerHeight * 0.5 &&
                    item.bottom > 120
                )
                .sort((a, b) => b.top - a.top);

            if (visibleSections.length) {
                const activeId = visibleSections[0].section.id;

                navLinks.forEach(link => {
                    const active =
                        link.getAttribute("href") === `#${activeId}`;

                    link.classList.toggle("active", active);

                    if (active) {
                        link.setAttribute("aria-current", "location");
                    } else {
                        link.removeAttribute("aria-current");
                    }
                });
            }
        },
        {
            rootMargin: "-120px 0px -50% 0px",
            threshold: 0
        }
    );

    sections.forEach(section => observer.observe(section));

    // Also handle scrolling directly, so the active item updates reliably.
    let ticking = false;

    function updateActiveSection() {
        if (ticking) return;

        ticking = true;

        requestAnimationFrame(() => {
            const readingPosition = 150;

            let currentSection = sections[0];

            for (const section of sections) {
                if (section.getBoundingClientRect().top <= readingPosition) {
                    currentSection = section;
                } else {
                    break;
                }
            }

            const activeId = currentSection.id;

            navLinks.forEach(link => {
                const active =
                    link.getAttribute("href") === `#${activeId}`;

                link.classList.toggle("active", active);

                if (active) {
                    link.setAttribute("aria-current", "location");
                } else {
                    link.removeAttribute("aria-current");
                }
            });

            ticking = false;
        });
    }

    window.addEventListener("scroll", updateActiveSection, {
        passive: true
    });

    window.addEventListener("resize", updateActiveSection);

    updateActiveSection();
}
async function loadEntity() {
    try {
        const response = await fetch(`${API_BASE}/api/planet/${encodeURIComponent(entity)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load this space entity.");
        render(data);
    } catch (error) {
        console.error("Space entity loading error:", error);
        app.innerHTML = `<div class="state error">${escapeHTML(error.message)}<br><small>Check that the backend is running with <code>node server.js</code>.</small></div>`;
    }
}

loadEntity();
