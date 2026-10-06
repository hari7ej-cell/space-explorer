const API_BASE = "http://localhost:3000";

const params = new URLSearchParams(window.location.search);
const entity = params.get("entity") || "Mars";

const app = document.getElementById("app");


// ======================================================
// Utility Functions
// ======================================================

function escapeHTML(value) {
    return String(value ?? "").replace(
        /[&<>'"]/g,
        ch => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            "\"": "&quot;"
        }[ch])
    );
}


function formatNumber(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "Not available";
    }

    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 4
    }).format(value);
}


// ======================================================
// Media Functions
// ======================================================

function mediaForTopic(images, topicId) {
    return images.find(image => image.topicId === topicId) || null;
}


function renderMedia(media) {

    if (!media || !media.url) {
        return `
            <div class="media-card">
                <div class="media-caption">
                    NASA media is not available for this topic.
                </div>
            </div>
        `;
    }

    return `
        <div class="media-card">

            <img
                src="${escapeHTML(media.url)}"
                alt="${escapeHTML(media.title || "NASA image")}"
                loading="lazy"
            >

            <div class="media-caption">

                ${escapeHTML(media.title || "NASA image")}

                ·

                <a
                    href="${escapeHTML(media.url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Open media
                </a>

                ·

                <a
                    href="${escapeHTML(
                        media.source?.url ||
                        "https://images.nasa.gov/"
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ${escapeHTML(media.source?.name || "NASA")}
                </a>

            </div>

        </div>
    `;
}


// ======================================================
// Render Planet Page
// ======================================================

function render(data) {

    document.title =
        `Space Explorer - ${data.entity?.name || entity}`;

    const name =
        data.entity?.name || entity;

    const hero =
        data.images?.find(
            x => x.topicId === "overview"
        ) ||
        data.images?.[0];

    const topics =
        data.topics || [];

    const details =
        data.details || {};


    app.innerHTML = `

        <!-- ==================================================
             HERO SECTION
        ================================================== -->

        <section class="hero">

            ${
                hero?.url
                    ? `
                        <img
                            src="${escapeHTML(hero.url)}"
                            alt="${escapeHTML(name)}"
                        >
                    `
                    : ""
            }

            <div class="hero-content">

                <span class="eyebrow">
                    PLANET
                </span>

                <h1>
                    ${escapeHTML(name)}
                </h1>

                <div class="hero-summary">
                    ${escapeHTML(
                        data.summary ||
                        "Space entity information."
                    )}
                </div>

            </div>

        </section>


        <!-- ==================================================
             TOPIC NAVIGATION
        ================================================== -->

        <nav class="topic-nav">

            ${
                topics
                    .map(topic => `
                        <a
                            href="#${escapeHTML(topic.id)}"
                        >
                            ${escapeHTML(
                                topic.shortTitle ||
                                topic.title
                            )}
                        </a>
                    `)
                    .join("")
            }

        </nav>


        <!-- ==================================================
             MAIN CONTENT
        ================================================== -->

        <div class="container">


            <!-- ==================================================
                 TOPIC SECTIONS
            ================================================== -->

            ${
                topics
                    .map(topic => `

                        <section
                            class="topic"
                            id="${escapeHTML(topic.id)}"
                        >

                            <div class="topic-grid">

                                <div>

                                    <span class="eyebrow">
                                        TOPIC
                                    </span>

                                    <h2>
                                        ${escapeHTML(
                                            topic.title
                                        )}
                                    </h2>

                                    <p>
                                        ${escapeHTML(
                                            topic.content
                                        )}
                                    </p>

                                </div>


                                ${renderMedia(
                                    mediaForTopic(
                                        data.images || [],
                                        topic.id
                                    )
                                )}

                            </div>

                        </section>

                    `)
                    .join("")
            }

            <!-- ==================================================
                 NASA 3D MODEL
            ================================================== -->

            ${
                data.model3D?.available
                    ? `

                        <section class="model-section">

                            <div class="model-header">

                                <span>
                                    NASA 3D RESOURCE
                                </span>

                                <h2>
                                    ${escapeHTML(name)}
                                    3D Model
                                </h2>

                                <p>
                                    Interactive 3D model of
                                    ${escapeHTML(name)}
                                    provided by NASA/JPL-Caltech.
                                </p>

                            </div>


                            <div class="mars-model-container">

                                <iframe
                                    src="https://mars.nasa.gov/gltf_embed/24881"
                                    title="NASA 3D model of ${escapeHTML(name)}"
                                    loading="lazy"
                                    allowfullscreen>
                                </iframe>

                            </div>


                            <div class="model-credit">

                                Source:

                                <a
                                    href="https://science.nasa.gov/resource/planet-mars-3d-model/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    NASA/JPL-Caltech
                                </a>

                            </div>

                        </section>

                    `
                    : ""
            }


        </div>
    `;
}


// ======================================================
// Load Planet Data From Backend
// ======================================================

async function loadPlanet() {

    try {

        const response = await fetch(
            `${API_BASE}/api/planet/${encodeURIComponent(entity)}`
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to load planet"
            );

        }


        render(data);


    } catch (error) {

        console.error(
            "Planet loading error:",
            error
        );


        app.innerHTML = `

            <div class="state error">

                ${escapeHTML(error.message)}

                <br>

                <small>
                    Start the backend with
                    <code>node server.js</code>.
                </small>

            </div>

        `;

    }

}


// ======================================================
// Start
// ======================================================

loadPlanet();