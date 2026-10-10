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

function shortSummary(value, max = 210) {
    const clean = normalizeText(value);
    if (!clean) return "Explore the key facts, features, and science behind this space object.";
    const firstSentence = clean.match(/^.*?[.!?](?=\s|$)/)?.[0] || clean;
    let result = firstSentence.length > max ? firstSentence.slice(0, max - 1).trimEnd() + "…" : firstSentence;
    if (result.length < 75 && clean.length > result.length) {
        result = clean.slice(0, max).trimEnd();
        if (clean.length > max) result += "…";
    }
    return result;
}

function summarizeTopic(value, max = 2400) {
    let clean = normalizeText(value)
        .replace(/\b(edit|citation needed|failed verification)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!clean || /information is not available in the matching wikipedia section/i.test(clean)) return "";
    const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
    let result = "";
    for (const sentence of sentences) {
        const next = (result ? " " : "") + sentence.trim();
        // Keep a substantial, readable paragraph that can fill much of a desktop reading window.
        const count = result.split(/[.!?]+/).filter(Boolean).length;
        if (result && (result.length + next.length > max || count >= 10)) break;
        result += next;
        if (result.length >= max) break;
    }
    if (result.length > max) result = result.slice(0, max).trimEnd() + "…";
    return result;
}

function imageForTopic(images, topicId) {
    return (images || []).find(item => item.topicId === topicId && item.url) || null;
}

function cleanCaption(image) {
    const title = normalizeText(image?.title || "");
    const description = normalizeText(image?.description || "");
    const caption = description && description.length < 150 ? description : title;
    return shortSummary(caption || "Image related to this topic.", 115);
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
    const hero = images.find(item => item.topicId === "overview") || images[0] || null;
    const heroUrl = hero?.url || "";
    const topics = (data.topics || [])
        .map(topic => ({ ...topic, displayContent: summarizeTopic(topic.content) }))
        .filter(topic => topic.displayContent);
    const isMars = /^mars$/i.test(name.trim());
    const modelAvailable = isMars;

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
                <span class="topic-kicker">SPACE GUIDE</span>
                <h2>${escapeHTML(topic.title)}</h2>

                <p>${escapeHTML(topic.displayContent)}</p>

                ${imageMarkup}
            </div>
        </section>
    `;
}).join("");

    app.innerHTML = `
        <section class="entity-hero ${heroUrl ? "has-hero-image" : "no-hero-image"}" ${heroUrl ? `style="--hero-image: url('${escapeHTML(heroUrl).replace(/'/g, "%27")}')"` : ""}>
            <div class="entity-hero-content">
                <span class="entity-kicker">SPACE ENTITY</span>
                <h1 class="entity-title">${escapeHTML(name)}</h1>
                <p class="entity-intro">${escapeHTML(
    shortSummary(
        data.summary ||
        topics.find(topic =>
            topic.title?.trim().toLowerCase() === "overview"
        )?.content ||
        topics[0]?.content ||
        "",
        240
    )
)}</p>
            </div>
        </section>
        <nav class="article-navigation" aria-label="Space entity topics">
            <div class="article-navigation-inner">
                ${topics.map(topic => `<a href="#topic-${escapeHTML(topic.id)}">${escapeHTML(topic.shortTitle || topic.title)}</a>`).join("")}
                ${modelAvailable ? `<a class="model-nav-link" href="#entity-model">3D Model</a>` : ""}
            </div>
        </nav>
        <div class="article-layout">
            ${renderedTopics || `<section class="article-section text-only"><div class="topic-copy"><h2>Overview</h2><p>Detailed information is not available right now.</p></div></section>`}
        </div>
        ${modelAvailable ? `<section class="entity-model-section" id="entity-model">
            <span class="topic-kicker">INTERACTIVE RESOURCE</span>
            <h2>Mars 3D Model</h2>
            <p>Explore the Martian surface with this interactive model.</p>
            <iframe class="entity-model-frame" src="https://mars.nasa.gov/gltf_embed/24881" title="Interactive 3D model of Mars" loading="lazy" allowfullscreen></iframe>
        </section>` : ""}
    `;

    // If an image is genuinely panoramic/wider than its card, let it span the whole card.
    app.querySelectorAll(".topic-media img").forEach(img => {
        const markSize = () => {
            if (img.naturalWidth && img.naturalHeight && img.naturalWidth / img.naturalHeight >= 1.55) {
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
