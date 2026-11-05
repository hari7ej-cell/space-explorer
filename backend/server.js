"use strict";
const express = require("express");
const cors = require("cors");
const path = require("path");
const cheerio = require("cheerio");

const {
    getLatestDiscovery
} = require("./services/latestDiscovery");

const {
    getWikipediaPage
} = require("./services/wikipedia");

const {
    createTopics
} = require("./services/topicParser");

const {
    getTopicImages
} = require("./services/imageService");

const {
    extractStructuredData
} = require("./services/structuredData");

const {
    processPlanet
} = require("./services/cppService");


const app = express();

app.use(cors());
app.use(express.json());
const frontendDir = path.join(__dirname, "../frontend");
app.use(express.static(frontendDir));

const PORT = 3000;


// ======================================================
// CACHE CONFIGURATION
// ======================================================

const CACHE_TTL = 10 * 60 * 1000;

const planetCache = new Map();

const pendingRequests = new Map();


// ======================================================
// CACHE HELPERS
// ======================================================

function getCachedPlanet(name) {
    const cached = planetCache.get(name);

    if (!cached) {
        return null;
    }

    if (Date.now() - cached.timestamp > CACHE_TTL) {
        planetCache.delete(name);
        return null;
    }

    return cached.data;
}


function setCachedPlanet(name, data) {
    planetCache.set(name, {
        data,
        timestamp: Date.now()
    });
}


// ======================================================
// NASA 3D MODEL CONFIGURATION
// ======================================================

function getModel3D(entityName) {
    const normalized = String(entityName || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");

    // Only add URLs for existing NASA-hosted iframe viewers.
    const models = {
        sun: {
            name: "Sun",
            url: "https://solarsystem.nasa.gov/gltf_embed/2352/"
        },

        mercury: {
            name: "Mercury",
            url: "https://solarsystem.nasa.gov/gltf_embed/2369/"
        },

        venus: {
            name: "Venus",
            url: "https://solarsystem.nasa.gov/gltf_embed/2342/"
        },

        earth: {
            name: "Earth",
            url: "https://solarsystem.nasa.gov/gltf_embed/2393/"
        },

        mars: {
            name: "Mars",
            url: "https://solarsystem.nasa.gov/gltf_embed/2372/"
        },

        jupiter: {
            name: "Jupiter",
            url: "https://solarsystem.nasa.gov/gltf_embed/2375/"
        },

        saturn: {
            name: "Saturn",
            url: "https://solarsystem.nasa.gov/gltf_embed/2355/"
        },

        uranus: {
            name: "Uranus",
            url: "https://solarsystem.nasa.gov/gltf_embed/2344/"
        },

        neptune: {
            name: "Neptune",
            url: "https://solarsystem.nasa.gov/gltf_embed/2364/"
        },
        
        bennu: {
            name: "Bennu",
            url: "https://solarsystem.nasa.gov/gltf_embed/2403/"
        },

    };

    const model = models[normalized];

    if (!model) {
        return {
            available: false,
            name: entityName,
            url: null,
            format: null
        };
    }

    return {
        available: true,
        name: model.name,
        url: model.url,
        format: "iframe"
    };
}

function detectEntityType(title, html) {
    const $ = cheerio.load(html || "");

    const name = String(title || "").toLowerCase().trim();

    // Reject Wikipedia disambiguation pages
    if (
        $(".mw-disambig").length > 0 ||
        /disambiguation/i.test(name) ||
        /disambiguation pages/i.test($(".mw-normal-catlinks").text())
    ) {
        return null;
    }

    const categories = $(".mw-normal-catlinks a")
        .map((_, el) => $(el).text().toLowerCase())
        .get();

    const infobox = $("table.infobox").first();

    const infoboxText = infobox.text().toLowerCase();
    const lead = $("p").slice(0, 3).text().toLowerCase();

    const categoryText = categories.join(" ");

    // Astronaut
    if (/astronaut|cosmonaut|taikonaut/.test(categoryText + " " + infoboxText))
        return "Astronaut";

    // Mission
    if (/space mission|spaceflight mission|space program/.test(categoryText + " " + infoboxText))
        return "Mission";

    // Black Hole
    if (/black hole/.test(categoryText + " " + infoboxText + " " + lead))
        return "Black Hole";

    // Galaxy
    if (/galaxies|galaxy/.test(categoryText) && /galaxy/.test(lead))
        return "Galaxy";

    // Planet
    if (
        /planets|exoplanets/.test(categoryText) &&
        /planet|exoplanet/.test(lead)
    ) return "Planet";

    // Moon
    if (
        /natural satellites|moons of|planetary satellites/.test(categoryText)
    ) return "Moon";

    // Star
    if (/stars/.test(categoryText) && /star/.test(lead))
        return "Star";

    // Comet
    if (/comets/.test(categoryText))
        return "Comet";

    // Asteroid
    if (/asteroids/.test(categoryText))
        return "Asteroid";

    return null;
}
const routeTypes = new Set(["planet", "galaxy", "astronaut", "mission", "black-hole", "star", "moon", "asteroid", "comet", "deep-sky-object", "space-entity"]);
function routeType(type) {
    return String(type || "Space Entity").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function typeFromRoute(value) {
    return value.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

// ======================================================
// MAIN PLANET API
// ======================================================

app.get("/api/planet/:name", async (req, res) => {
    const startTime = Date.now();

    try {
        const name = decodeURIComponent(
            req.params.name || ""
        ).trim();

        if (!name) {
            return res.status(400).json({
                error: "Space entity name is required."
            });
        }

        const cacheKey = name.toLowerCase();

        // ----------------------------------------------
        // Check server cache
        // ----------------------------------------------

        const cached = getCachedPlanet(cacheKey);

        if (cached) {
            console.log(`[CACHE HIT] ${name}`);

            res.set("Cache-Control", "no-store");

            return res.json(cached);
        }

        // ----------------------------------------------
        // Avoid duplicate simultaneous requests
        // ----------------------------------------------

        if (pendingRequests.has(cacheKey)) {
            console.log(`[WAITING] ${name}`);

            const result = await pendingRequests.get(cacheKey);

            res.set("Cache-Control", "no-store");

            return res.json(result);
        }

        // ----------------------------------------------
        // Build new response
        // ----------------------------------------------

        const requestPromise = buildPlanet(name);

        pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;

            setCachedPlanet(cacheKey, result);

            console.log(
                `[CACHE STORE] ${name} - ${Date.now() - startTime} ms`
            );

            res.set("Cache-Control", "no-store");

            return res.json(result);

        } finally {
            pendingRequests.delete(cacheKey);
        }

    } catch (error) {
        console.error("PLANET API ERROR:", error);

        return res.status(500).json({
            error: error.message || "Unable to load space entity."
        });
    }
});

async function resolveWikipediaEntity(searchName) {
    const apiURL = new URL("https://en.wikipedia.org/w/api.php");

    apiURL.search = new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: searchName,
        gsrlimit: "10",
        prop: "pageprops|categories|extracts",
        cllimit: "max",
        exintro: "1",
        explaintext: "1",
        format: "json"
    });

    const response = await fetch(apiURL, {
        headers: {
            "User-Agent": "SpaceExplorer/1.0 (educational project)"
        }
    });

    if (response.status === 429) {
        throw new Error("Wikipedia rate limit reached. Wait before searching again.");
    }

    if (!response.ok) {
        throw new Error(`Wikipedia request failed: ${response.status}`);
    }

    const result = await response.json();

    const pages = Object.values(result.query?.pages || {});

    if (!pages.length) {
        throw new Error("No Wikipedia results found.");
    }

    const validCandidates = [];

    for (const page of pages) {
        if (page.pageprops?.disambiguation !== undefined) {
            continue;
        }

        const title = page.title;
        const extract = (page.extract || "").toLowerCase();

        const categories = (page.categories || [])
            .map(c => c.title.replace("Category:", "").toLowerCase());

        const categoryText = categories.join(" ");

        let type = null;

        if (/astronaut|cosmonaut|taikonaut/.test(categoryText)) {
            type = "Astronaut";
        }
        else if (/space missions|spaceflight missions|lunar missions/.test(categoryText)) {
            type = "Mission";
        }
        else if (/black holes/.test(categoryText) || /black hole/.test(extract)) {
            type = "Black Hole";
        }
        else if (/galaxies/.test(categoryText)) {
            type = "Galaxy";
        }
        else if (/planets|terrestrial planets|gas giants|dwarf planets/.test(categoryText)) {
            type = "Planet";
        }
        else if (/natural satellites|moons of|planetary satellites/.test(categoryText)) {
            type = "Moon";
        }
        else if (/comets/.test(categoryText)) {
            type = "Comet";
        }
        else if (/asteroids/.test(categoryText)) {
            type = "Asteroid";
        }
        else if (/nebulae|nebula/.test(categoryText)) {
            type = "Deep-Sky Object";
        }
        else if (/stars/.test(categoryText)) {
            type = "Star";
        }

        if (!type) continue;

        let score = 0;

        if (title.toLowerCase() === searchName.toLowerCase()) {
            score += 100;
        }

        if (title.toLowerCase().startsWith(searchName.toLowerCase())) {
            score += 30;
        }

        validCandidates.push({
            title,
            type,
            score
        });
    }

    if (!validCandidates.length) {
        throw new Error("No supported space entity found.");
    }

    validCandidates.sort((a, b) => b.score - a.score);

    const selected = validCandidates[0];

    console.log("Selected article:", selected.title);
    console.log("Entity type:", selected.type);

    const wiki = await getWikipediaPage(selected.title);

    return {
        ...wiki,
        entityType: selected.type
    };
}
// ======================================================
// BUILD PLANET RESPONSE
// ======================================================

async function buildPlanet(name) {
    const totalStart = Date.now();

    console.log("");
    console.log("======================================");
    console.log(`Loading space entity: ${name}`);
    console.log("======================================");

    // ----------------------------------------------
    // STEP 1: Fetch Wikipedia article
    // ----------------------------------------------

    const wikiStart = Date.now();

    const wiki = await resolveWikipediaEntity(name);

    console.log(
        `Wikipedia: ${wiki.title} - ${Date.now() - wikiStart} ms`
    );

    // ----------------------------------------------
    // STEP 2: Parse article into topics
    // ----------------------------------------------

    const parseStart = Date.now();

    const topics = createTopics(wiki.html);

    const details = extractStructuredData(wiki.html);

    console.log(
        `Topic parsing: ${Date.now() - parseStart} ms`
    );

    console.log(`Topics returned: ${topics.length}`);

    // ----------------------------------------------
    // STEP 3: Retrieve topic images
    // ----------------------------------------------

    const imageStart = Date.now();

    let images = [];

    try {
        images = await getTopicImages(
            wiki.title,
            topics
        );

        if (!Array.isArray(images)) {
            images = [];
        }

    } catch (error) {
        console.error(
            "TOPIC IMAGE ERROR:",
            error.message
        );

        images = [];
    }

    console.log(
        `Images returned: ${images.length} - ${Date.now() - imageStart} ms`
    );

    // ----------------------------------------------
    // STEP 5: Send data through existing C++ service
    // ----------------------------------------------

    const cppStart = Date.now();

    const entityType = wiki.entityType;
    if (!entityType) {
    throw new Error("This article is not a supported space entity.");
    }

    const cppInput = {
        type: entityType,
        name: wiki.title,
        wikipediaUrl: wiki.url,
        details,
        topics,
        images
    };

    const cppResult = await processPlanet(cppInput);

    console.log(
        `C++ processing: ${Date.now() - cppStart} ms`
    );

    /*
        Explicitly retain the JavaScript article data.

        This prevents an incomplete C++ result from accidentally
        replacing topics or images with empty arrays.
    */

    const result = {
        ...(cppResult || {}),

        entity: {
            name: wiki.title,
            type: cppResult.type || entityType
        },

        summary: cppResult.summary,

        topics,

        details,

        images,

        heroImage: cppResult.heroImage,

        wikipediaUrl: wiki.url,

        model3D: getModel3D(wiki.title)
    };

    console.log(
        `TOTAL: ${Date.now() - totalStart} ms`
    );

    console.log("======================================");

    return result;
}


// Clean detail URLs, for example /astronaut/Neil-Armstrong.
app.get("/:category/:name", (req, res, next) => {
    if (!routeTypes.has(req.params.category)) return next();
    res.sendFile(path.join(frontendDir, "planet-detail.html"));
});

// ======================================================
// LATEST DISCOVERY API
// ======================================================

app.get("/api/latest-discovery", async (req, res) => {
    try {
        const discovery = await getLatestDiscovery();

        res.set("Cache-Control", "no-store");

        return res.json(discovery);

    } catch (error) {
        console.error("LATEST DISCOVERY ERROR:", error);

        return res.status(500).json({
            error: error.message
        });
    }
});


// ======================================================
// CACHE STATUS
// ======================================================

app.get("/api/cache", (req, res) => {
    const planets = [];

    for (const [name, value] of planetCache) {
        planets.push({
            name,
            age: Date.now() - value.timestamp
        });
    }

    res.json({
        cachedPlanets: planets
    });
});


// ======================================================
// CLEAR CACHE
// ======================================================

app.delete("/api/cache", (req, res) => {
    planetCache.clear();

    res.json({
        message: "Planet cache cleared."
    });
});


// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "Space Explorer Backend"
    });
});


// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {
    console.log(
        `Space Explorer backend running at http://localhost:${PORT}`
    );
});