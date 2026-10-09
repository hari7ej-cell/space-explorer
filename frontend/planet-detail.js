const API_BASE = "http://localhost:3000";

const params = new URLSearchParams(window.location.search);
const entity = (params.get("entity") || "Mars").trim();

const app = document.getElementById("app");


/* Escape HTML to prevent article content from breaking the page. */
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
    })[character]);
}


/* Return a compact navigation label. */
function shortLabel(topic) {
    const label = String(
        topic.shortTitle || topic.title || "Topic"
    ).trim();

    return label.split(/\s+/).slice(0, 2).join(" ");
}


/* Find the image belonging to a particular article section. */
function mediaForTopic(images, topicId) {
    return (images || []).find(
        image => image.topicId === topicId && image.url
    ) || null;
}


/* Use the best available hero image. */
function getHeroImage(data) {
    return data.heroImage ||
        mediaForTopic(data.images, "overview") ||
        (data.images || []).find(image => image.url) ||
        null;
}


/* Hero background image. */
function renderHeroImage(hero) {
    if (!hero || !hero.url) {
        return "";
    }

    return `style="background-image: url('${escapeHTML(hero.url)}')"`;
}


/* Add the top-bar model link only when a model exists. */
function setupModelTopLink(model) {
    const topbar = document.querySelector(".topbar");

    if (!topbar) return;

    const existingLink = topbar.querySelector(".model-top-link");

    if (existingLink) {
        existingLink.remove();
    }

    if (!model || !model.available || !model.url) {
        return;
    }

    const link = document.createElement("a");

    link.className = "model-top-link";
    link.href = "#entity-model";
    link.textContent = "3D Model";

    link.addEventListener("click", event => {
        event.preventDefault();

        const modelSection = document.getElementById("entity-model");

        if (modelSection) {
            modelSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });

    topbar.appendChild(link);
}


/* Remove unnecessary article images from copied section HTML.
   Section images are displayed separately in the alternating layout. */
function cleanTopicContent(content) {
    const wrapper = document.createElement("div");

    wrapper.innerHTML = content || "";

    wrapper.querySelectorAll(
        "figure, .thumb, .mw-file-element, .mw-editsection"
    ).forEach(element => element.remove());

    wrapper.querySelectorAll("img").forEach(image => image.remove());

    wrapper.querySelectorAll(
        ".reference, .reflist, .references, .mw-references-wrap"
    ).forEach(element => element.remove());

    return wrapper.innerHTML.trim();
}


/* Render a section image and its caption. */
function renderTopicImage(image, title) {
    if (!image || !image.url) {
        return "";
    }

    const caption = image.caption
        ? `<figcaption>${escapeHTML(image.caption)}</figcaption>`
        : "";

    const source = image.source && image.source.url
        ? `
            <a
                class="topic-image-source"
                href="${escapeHTML(image.source.url)}"
                target="_blank"
                rel="noopener noreferrer">
                Image source ↗
            </a>
        `
        : "";

    return `
        <figure class="topic-media">

            <img
                src="${escapeHTML(image.url)}"
                alt="${escapeHTML(image.alt || title)}"
                loading="lazy"
                referrerpolicy="no-referrer">

            ${caption}

            ${source}

        </figure>
    `;
}


/* Render the optional 3D model section. */
function renderModel(data, name) {
    const model = data.model3D;

    if (!model || !model.available || !model.url) {
        return "";
    }

    const credit = model.source && model.source.url
        ? `
            <p class="model-credit">
                Source:
                <a
                    href="${escapeHTML(model.source.url)}"
                    target="_blank"
                    rel="noopener noreferrer">
                    ${escapeHTML(model.source.name || "Source")}
                </a>
            </p>
        `
        : "";

    return `
        <section class="entity-model-section" id="entity-model">

            <div class="model-header">
                <span class="entity-kicker">
                    INTERACTIVE EXPLORATION
                </span>

                <h2>${escapeHTML(name)} 3D Model</h2>

                <p>
                    Explore this interactive three-dimensional model.
                </p>
            </div>

            <div class="entity-model-frame-wrap">
                <iframe
                    class="entity-model-frame"
                    src="${escapeHTML(model.url)}"
                    title="${escapeHTML(name)} 3D model"
                    loading="lazy"
                    allowfullscreen
                    referrerpolicy="strict-origin-when-cross-origin">
                </iframe>
            </div>

            ${credit}

        </section>
    `;
}


/* Main rendering function. */
function render(data) {

    const name = data.entity?.name || entity;

    const topics = Array.isArray(data.topics)
        ? data.topics
        : [];

    const images = Array.isArray(data.images)
        ? data.images
        : [];

    const hero = getHeroImage(data);

    const summary =
        data.summary ||
        topics.find(topic => topic.id === "overview")?.text ||
        "";

    document.title = `Space Explorer | ${name}`;

    /*
     * Keep sections with actual article content.
     * The backend is responsible for removing administrative
     * sections such as References and External links.
     */
    const usableTopics = topics.filter(topic =>
        topic &&
        topic.id &&
        topic.title &&
        (topic.content || topic.text)
    );

    /* Configure the optional model link. */
    setupModelTopLink(data.model3D);


    /* Build the horizontal topic navigation. */
    const topicNavigation = usableTopics.map(topic => `
        <a
            href="#${escapeHTML(topic.id)}"
            data-topic-id="${escapeHTML(topic.id)}">

            ${escapeHTML(shortLabel(topic))}

        </a>
    `).join("");


    /*
     * Build article sections.
     *
     * Even-numbered sections:
     * Text left, image right.
     *
     * Odd-numbered sections:
     * Image left, text right.
     */
    const articleSections = usableTopics.map((topic, index) => {

        const topicImage =
            mediaForTopic(images, topic.id) ||
            (index === 0 ? hero : null);

        const rawContent = topic.content ||
            `<p>${escapeHTML(topic.text || "")}</p>`;

        const content = cleanTopicContent(rawContent);

        const media = renderTopicImage(
            topicImage,
            topic.title
        );

        const imageOnLeft = index % 2 === 1;

        const layoutClass = imageOnLeft
            ? "media-left"
            : "media-right";

        return `
            <section
                class="topic-row ${layoutClass}"
                id="${escapeHTML(topic.id)}">

                <div class="topic-copy">

                    <span class="topic-number">
                        ${String(index + 1).padStart(2, "0")}
                    </span>

                    <h2>${escapeHTML(topic.title)}</h2>

                    <div class="article-section-content">
                        ${
                            content ||
                            `<p>${escapeHTML(topic.text || "")}</p>`
                        }
                    </div>

                </div>

                ${
                    media
                        ? `<div class="topic-visual">${media}</div>`
                        : ""
                }

            </section>
        `;
    }).join("");


    /* Source links. */
    const heroSource =
        hero?.source?.url ||
        data.wikipediaUrl ||
        "";


    /* Build the entire page. */
    app.innerHTML = `

        <section
            class="entity-hero"
            ${renderHeroImage(hero)}>

            <div class="entity-hero-content">

                <span class="entity-kicker">
                    ${escapeHTML(data.entity?.type || "SPACE ENTITY")}
                </span>

                <h1 class="entity-title">
                    ${escapeHTML(name)}
                </h1>

                <p class="entity-intro">
                    ${escapeHTML(summary)}
                </p>

                ${
                    hero?.caption
                        ? `
                            <p class="hero-image-caption">
                                ${escapeHTML(hero.caption)}
                            </p>
                        `
                        : ""
                }

                ${
                    heroSource
                        ? `
                            <a
                                class="hero-source"
                                href="${escapeHTML(heroSource)}"
                                target="_blank"
                                rel="noopener noreferrer">
                                Image source ↗
                            </a>
                        `
                        : ""
                }

            </div>

        </section>


        ${
            topicNavigation
                ? `
                    <nav
                        class="article-navigation"
                        aria-label="Article topics">

                        <div class="article-navigation-inner">
                            ${topicNavigation}
                        </div>

                    </nav>
                `
                : ""
        }


        <div class="article-layout">

            <div class="article-heading">

                <span class="entity-kicker">
                    DISCOVER ${escapeHTML(name).toUpperCase()}
                </span>

                <h2>Explore the details</h2>

                <p>
                    Discover the story, science, and features
                    of ${escapeHTML(name)}.
                </p>

            </div>

            ${
                articleSections ||
                `
                    <p class="article-empty">
                        No readable article sections were found.
                    </p>
                `
            }

            ${
                data.wikipediaUrl
                    ? `
                        <div class="article-source">
                            Article source:
                            <a
                                href="${escapeHTML(data.wikipediaUrl)}"
                                target="_blank"
                                rel="noopener noreferrer">
                                Read ${escapeHTML(name)} on Wikipedia ↗
                            </a>
                        </div>
                    `
                    : ""
            }

        </div>


        ${renderModel(data, name)}

    `;

    setupTopicNavigation();
    setupInlineImages();
}


/* Smooth-scroll topic navigation. */
function setupTopicNavigation() {

    const links = [
        ...document.querySelectorAll(".article-navigation a")
    ];

    links.forEach(link => {

        link.addEventListener("click", event => {

            event.preventDefault();

            const id = link.dataset.topicId;
            const target = document.getElementById(id);

            if (!target) return;

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            links.forEach(item => {
                item.classList.toggle("active", item === link);
            });

            history.replaceState(
                null,
                "",
                `#${encodeURIComponent(id)}`
            );

        });

    });


    /* Highlight the current topic while scrolling. */
    if ("IntersectionObserver" in window) {

        const observer = new IntersectionObserver(entries => {

            const visible = entries
                .filter(entry => entry.isIntersecting)
                .sort(
                    (a, b) =>
                        b.intersectionRatio - a.intersectionRatio
                )[0];

            if (!visible) return;

            links.forEach(link => {

                link.classList.toggle(
                    "active",
                    link.dataset.topicId === visible.target.id
                );

            });

        }, {
            rootMargin: "-140px 0px -60% 0px",
            threshold: [0, 0.1, 0.5]
        });


        document.querySelectorAll(".topic-row").forEach(section => {
            observer.observe(section);
        });

    }

}


/* Remove images that fail to load. */
function setupInlineImages() {

    document.querySelectorAll(
        ".topic-media img, .article-section-content img"
    ).forEach(image => {

        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";

        image.addEventListener("error", () => {

            const figure = image.closest("figure");

            if (figure && figure.classList.contains("topic-media")) {
                figure.remove();
            } else {
                image.remove();
            }

        }, { once: true });

    });

}


/* Fetch article data from the backend. */
async function loadEntity() {

    try {

        const response = await fetch(
            `${API_BASE}/api/planet/${encodeURIComponent(entity)}`,
            {
                headers: {
                    Accept: "application/json"
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || `Request failed (${response.status})`
            );
        }

        render(data);

    } catch (error) {

        console.error("Space entity loading error:", error);

        app.innerHTML = `
            <div class="state error">

                <div>

                    <h2>
                        Unable to load ${escapeHTML(entity)}
                    </h2>

                    <p>${escapeHTML(error.message)}</p>

                    <p class="error-hint">
                        Check that the backend is running at
                        ${escapeHTML(API_BASE)}.
                    </p>

                </div>

            </div>
        `;

    }

}


loadEntity();