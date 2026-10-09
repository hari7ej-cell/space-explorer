"use strict";

const API_BASE = "http://localhost:3000";

const params = new URLSearchParams(window.location.search);
const entity = (params.get("entity") || "Mars").trim();

const app = document.getElementById("app");


// ======================================================
// HTML UTILITIES
// ======================================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
    })[character]);
}


// ======================================================
// TEXT UTILITIES
// ======================================================

function normalizeText(value) {
    return String(value ?? "")
        .replace(/\r/g, "")
        .trim();
}


/*
    Wikipedia sections may contain plain text with paragraphs
    separated by newlines. Convert it to readable HTML.

    If the backend supplies actual HTML, retain its formatting.
*/

function renderArticleContent(content) {
    if (!content) {
        return "";
    }

    const value = String(content).trim();

    if (!value) {
        return "";
    }

    // Backend currently supplies plain text from topicParser.js.
    const looksLikeHTML = /<\/?(p|ul|ol|li|h[1-6]|table|blockquote|div|figure)\b/i.test(value);

    if (looksLikeHTML) {
        return cleanTopicHTML(value);
    }

    return value
        .split(/\n\s*\n/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean)
        .map(paragraph => {
            const escaped = escapeHTML(paragraph)
                .replace(/\n/g, "<br>");

            return `<p>${escaped}</p>`;
        })
        .join("");
}


/*
    Remove unwanted administrative elements from article HTML,
    without removing the article's useful text.
*/

function cleanTopicHTML(html) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;

    wrapper.querySelectorAll(
        ".mw-editsection, .reference, .reflist, " +
        ".references, .mw-references-wrap, script, style"
    ).forEach(element => element.remove());

    return wrapper.innerHTML;
}


// ======================================================
// IMAGE UTILITIES
// ======================================================

function isValidImageURL(url) {
    if (!url || typeof url !== "string") {
        return false;
    }

    try {
        const parsed = new URL(url);

        return (
            parsed.protocol === "https:" ||
            parsed.protocol === "http:"
        );
    } catch {
        return false;
    }
}


/*
    Find an image belonging to a specific article topic.
*/

function mediaForTopic(images, topicId) {
    if (!Array.isArray(images)) {
        return null;
    }

    return images.find(image =>
        image &&
        image.topicId === topicId &&
        isValidImageURL(image.url)
    ) || null;
}


/*
    Use the image returned by the backend as the hero image.

    The overview image is preferred. If it is unavailable,
    use the first available image.
*/

function getHeroImage(data) {
    const images = Array.isArray(data.images)
        ? data.images
        : [];

    if (data.heroImage && isValidImageURL(data.heroImage.url)) {
        return data.heroImage;
    }

    return (
        mediaForTopic(images, "overview") ||
        images.find(image => isValidImageURL(image.url)) ||
        null
    );
}


/*
    Extract a useful image directly from article HTML.

    This is a fallback for sections where the image service
    did not return a matching image.
*/

function extractImageFromContent(topic) {
    if (!topic || !topic.content) {
        return null;
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = String(topic.content);

    const figure = wrapper.querySelector("figure");

    const image =
        figure?.querySelector("img") ||
        wrapper.querySelector("img");

    if (!image) {
        return null;
    }

    let url =
        image.getAttribute("src") ||
        image.getAttribute("data-src");

    if (!url) {
        return null;
    }

    try {
        url = new URL(
            url,
            "https://en.wikipedia.org"
        ).href;
    } catch {
        return null;
    }

    if (!isValidImageURL(url)) {
        return null;
    }

    return {
        topicId: topic.id,
        title: topic.title || "Article image",
        url,
        alt: image.getAttribute("alt") || topic.title || "",
        caption:
            figure?.querySelector("figcaption")?.textContent?.trim() || "",
        source: {
            name: "Wikipedia",
            url:
                "https://en.wikipedia.org/wiki/" +
                encodeURIComponent(topic.title || entity)
        }
    };
}


/*
    Find the best image available for a topic.

    Priority:
    1. Image service result.
    2. Image inside the article.
    3. Hero image for the overview section only.

    Other sections do not reuse the same hero image.
*/

function getTopicImage(topic, images, hero) {
    const serviceImage = mediaForTopic(images, topic.id);

    if (serviceImage) {
        return serviceImage;
    }

    const articleImage = extractImageFromContent(topic);

    if (articleImage) {
        return articleImage;
    }

    if (topic.id === "overview" && hero) {
        return hero;
    }

    return null;
}


// ======================================================
// IMAGE RENDERING
// ======================================================

function renderTopicImage(image, topicTitle) {
    if (!image || !isValidImageURL(image.url)) {
        return "";
    }

    const caption = normalizeText(
        image.caption || image.description || ""
    );

    const sourceURL = image.source?.url || "";

    const sourceName = image.source?.name || "Image source";

    return `
        <figure class="topic-media">

            <img
                src="${escapeHTML(image.url)}"
                alt="${escapeHTML(image.alt || topicTitle)}"
                loading="lazy"
                referrerpolicy="no-referrer"
            >

            ${
                caption
                    ? `
                        <figcaption>
                            ${escapeHTML(caption)}
                        </figcaption>
                    `
                    : ""
            }

            ${
                sourceURL
                    ? `
                        <div class="topic-image-credit">

                            <a
                                href="${escapeHTML(sourceURL)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ${escapeHTML(sourceName)} ↗
                            </a>

                        </div>
                    `
                    : ""
            }

        </figure>
    `;
}


// ======================================================
// HERO SECTION
// ======================================================

function renderHero(data, name, hero) {
    const summary = normalizeText(
        data.summary || data.entity?.summary || ""
    );

    const heroStyle = hero
        ? `style="background-image: linear-gradient(
            to bottom,
            rgba(8,9,12,0.05) 10%,
            rgba(8,9,12,0.96) 100%
        ), url('${escapeHTML(hero.url)}')"`
        : "";

    return `
        <section class="hero entity-hero" ${heroStyle}>

            ${
                hero
                    ? `
                        <img
                            class="hero-background-image"
                            src="${escapeHTML(hero.url)}"
                            alt="${escapeHTML(hero.alt || name)}"
                            fetchpriority="high"
                            referrerpolicy="no-referrer"
                        >
                    `
                    : ""
            }

            <div class="hero-content">

                <span class="eyebrow">
                    ${escapeHTML(data.entity?.type || "SPACE ENTITY")}
                </span>

                <h1>
                    ${escapeHTML(name)}
                </h1>

                <p class="hero-summary">
                    ${escapeHTML(summary)}
                </p>

                ${
                    hero?.caption
                        ? `
                            <p class="hero-caption">
                                ${escapeHTML(hero.caption)}
                            </p>
                        `
                        : ""
                }

                ${
                    hero?.source?.url
                        ? `
                            <a
                                class="hero-source"
                                href="${escapeHTML(hero.source.url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Image source ↗
                            </a>
                        `
                        : ""
                }

            </div>

        </section>
    `;
}


// ======================================================
// TOPIC NAVIGATION
// ======================================================

function renderTopicNavigation(topics) {
    if (!topics.length) {
        return "";
    }

    return `
        <nav class="topic-nav article-navigation"
             aria-label="Article topics">

            ${
                topics.map(topic => {

                    const label = (
                        topic.shortTitle ||
                        topic.title ||
                        "Topic"
                    ).trim();

                    return `
                        <a
                            href="#${escapeHTML(topic.id)}"
                            data-topic-id="${escapeHTML(topic.id)}"
                        >
                            ${escapeHTML(label)}
                        </a>
                    `;
                }).join("")
            }

        </nav>
    `;
}


// ======================================================
// ARTICLE SECTIONS
// ======================================================

function renderTopicSection(topic, index, images, hero) {
    const image = getTopicImage(topic, images, hero);

    const content = renderArticleContent(
        topic.content || topic.text || ""
    );

    /*
        Alternate only when an image actually exists.

        Image available:
          Section 1: text left, image right
          Section 2: image left, text right
          Section 3: text left, image right

        No image:
          Text uses the full available width.
    */

    const hasImage = Boolean(image);

    let layoutClass = "text-only";

    if (hasImage) {
        layoutClass = index % 2 === 0
            ? "media-right"
            : "media-left";
    }

    return `
        <section
            class="topic topic-row ${layoutClass}"
            id="${escapeHTML(topic.id)}"
        >

            <div class="topic-copy">

                <span class="eyebrow topic-eyebrow">
                    TOPIC ${String(index + 1).padStart(2, "0")}
                </span>

                <h2>
                    ${escapeHTML(topic.title || "Topic")}
                </h2>

                <div class="article-section-content">
                    ${
                        content ||
                        "<p>Information is not available for this topic.</p>"
                    }
                </div>

            </div>

            ${
                hasImage
                    ? `
                        <div class="topic-visual">
                            ${renderTopicImage(image, topic.title)}
                        </div>
                    `
                    : ""
            }

        </section>
    `;
}


// ======================================================
// 3D MODEL
// ======================================================

function renderModel(data, name) {
    const model = data.model3D;

    if (
        !model ||
        model.available !== true ||
        !isValidImageURL(model.url)
    ) {
        return "";
    }

    return `
        <section
            class="model-section entity-model-section"
            id="entity-model"
        >

            <div class="model-header">

                <span>
                    INTERACTIVE 3D EXPERIENCE
                </span>

                <h2>
                    Explore ${escapeHTML(name)} in 3D
                </h2>

                <p>
                    Explore this interactive three-dimensional model.
                </p>

            </div>

            <div class="mars-model-container">

                <iframe
                    class="entity-model-frame"
                    src="${escapeHTML(model.url)}"
                    title="${escapeHTML(name)} interactive 3D model"
                    loading="lazy"
                    allowfullscreen
                    referrerpolicy="strict-origin-when-cross-origin"
                ></iframe>

            </div>

            ${
                model.source?.url
                    ? `
                        <div class="model-credit">

                            Source:

                            <a
                                href="${escapeHTML(model.source.url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ${escapeHTML(model.source.name || "Model source")}
                            </a>

                        </div>
                    `
                    : ""
            }

        </section>
    `;
}


/*
    Add the 3D Model button to the top bar only when the API
    reports an actual available model.
*/

function setupModelTopLink(data) {
    const topbar = document.querySelector(".topbar");

    if (!topbar) {
        return;
    }

    topbar.querySelector(".model-top-link")?.remove();

    const model = data.model3D;

    if (
        !model ||
        model.available !== true ||
        !model.url
    ) {
        return;
    }

    const button = document.createElement("a");

    button.className = "model-top-link";
    button.href = "#entity-model";
    button.textContent = "3D Model";

    button.addEventListener("click", event => {
        const section = document.getElementById("entity-model");

        if (!section) {
            event.preventDefault();
            return;
        }

        event.preventDefault();

        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    topbar.appendChild(button);
}


// ======================================================
// ARTICLE NAVIGATION BEHAVIOR
// ======================================================

function setupTopicNavigation() {
    const links = [
        ...document.querySelectorAll(
            ".article-navigation a"
        )
    ];

    links.forEach(link => {
        link.addEventListener("click", event => {
            const target = document.querySelector(
                link.getAttribute("href")
            );

            if (!target) {
                return;
            }

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            history.replaceState(
                null,
                "",
                link.getAttribute("href")
            );
        });
    });
}


// ======================================================
// REMOVE BROKEN IMAGES
// ======================================================

function setupImageErrors() {
    document.querySelectorAll(
        ".topic-media img, .hero-background-image"
    ).forEach(image => {
        image.addEventListener("error", () => {
            const figure = image.closest("figure");

            if (figure) {
                figure.remove();
                return;
            }

            image.remove();
        }, { once: true });
    });
}


// ======================================================
// RENDER COMPLETE PAGE
// ======================================================

function render(data) {
    const name = data.entity?.name || entity;

    document.title = `Space Explorer - ${name}`;

    const topics = Array.isArray(data.topics)
        ? data.topics.filter(topic =>
            topic &&
            topic.id &&
            topic.title
        )
        : [];

    const images = Array.isArray(data.images)
        ? data.images
        : [];

    const hero = getHeroImage(data);

    /*
        The backend may provide text for each topic. Keep the
        article content intact instead of hiding it in controls.
    */

    const articleSections = topics
        .map((topic, index) =>
            renderTopicSection(topic, index, images, hero)
        )
        .join("");

    app.innerHTML = `
        ${renderHero(data, name, hero)}

        ${renderTopicNavigation(topics)}

        <main class="container article-layout">

            <div class="article-heading">

                <span class="eyebrow">
                    DISCOVER ${escapeHTML(name).toUpperCase()}
                </span>

                <h2>
                    Explore the details
                </h2>

            </div>

            ${
                articleSections ||
                `
                    <p class="article-empty">
                        No article sections were returned by the backend.
                    </p>
                `
            }

            ${
                data.wikipediaUrl
                    ? `
                        <div class="article-source">

                            <a
                                href="${escapeHTML(data.wikipediaUrl)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Read the full Wikipedia article ↗
                            </a>

                        </div>
                    `
                    : ""
            }

        </main>

        ${renderModel(data, name)}
    `;

    setupModelTopLink(data);
    setupTopicNavigation();
    setupImageErrors();
}


// ======================================================
// LOAD DATA
// ======================================================

async function loadPlanet() {
    try {
        app.innerHTML = `
            <div class="state">
                Loading ${escapeHTML(entity)}...
            </div>
        `;

        const response = await fetch(
            `${API_BASE}/api/planet/${encodeURIComponent(entity)}`,
            {
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-store"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || `Server returned ${response.status}`
            );
        }

        render(data);

    } catch (error) {
        console.error("Planet loading error:", error);

        app.innerHTML = `
            <div class="state error">

                <div>
                    <h2>Unable to load ${escapeHTML(entity)}</h2>

                    <p>${escapeHTML(error.message)}</p>

                    <p>
                        Check that your backend is running on port 3000.
                    </p>
                </div>

            </div>
        `;
    }
}


// ======================================================
// START
// ======================================================

loadPlanet();