"use strict";

const express = require("express");
const cors = require("cors");

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
// 3D MODEL CONFIGURATION
// ======================================================

function getModel3D(entityName) {
    const normalized = entityName.trim().toLowerCase();

    /*
        The embed URL below is the NASA Mars interactive model.

        Do not mark every space entity as having a model.
        A model is shown only when an actual model URL is known.
    */

    if (normalized === "mars") {
        return {
            available: true,

            name: "Mars",

            url: "https://mars.nasa.gov/gltf_embed/24881",

            format: "glTF",

            source: {
                name: "NASA/JPL-Caltech",

                url: "https://science.nasa.gov/resource/planet-mars-3d-model/"
            }
        };
    }

    return {
        available: false
    };
}


// ======================================================
// SUMMARY HELPER
// ======================================================

function makeSummary(topics) {
    const overview = topics.find(
        topic => topic.id === "overview"
    );

    const text = String(
        overview?.content ||
        overview?.text ||
        "Space entity information."
    );

    /*
        The overview is plain text in the current topicParser.
        Keep it short for the hero section.
    */

    return text
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 700);
}


// ======================================================
// HERO IMAGE HELPER
// ======================================================

function getHeroImage(images, name, wikiURL) {
    const list = Array.isArray(images) ? images : [];

    const overviewImage = list.find(image =>
        image &&
        image.topicId === "overview" &&
        image.url
    );

    const firstImage = list.find(image =>
        image && image.url
    );

    const image = overviewImage || firstImage;

    if (!image) {
        return null;
    }

    return {
        ...image,

        title: image.title || name,

        alt: image.alt || image.title || name,

        source: image.source || {
            name: "Wikipedia",
            url: wikiURL
        }
    };
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

    const wiki = await getWikipediaPage(name);

    console.log(
        `Wikipedia: ${wiki.title} - ${Date.now() - wikiStart} ms`
    );

    // ----------------------------------------------
    // STEP 2: Parse article into topics
    // ----------------------------------------------

    const parseStart = Date.now();

    const topics = createTopics(wiki.html);

    const summary = makeSummary(topics);

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
    // STEP 4: Create hero image
    // ----------------------------------------------

    const heroImage = getHeroImage(
        images,
        wiki.title,
        wiki.url
    );

    // ----------------------------------------------
    // STEP 5: Send data through existing C++ service
    // ----------------------------------------------

    const cppStart = Date.now();

    const cppInput = {
        type: "Planet",

        summary,

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
            type: "Planet"
        },

        summary,

        topics,

        details,

        images,

        heroImage,

        wikipediaUrl: wiki.url,

        model3D: getModel3D(wiki.title)
    };

    console.log(
        `TOTAL: ${Date.now() - totalStart} ms`
    );

    console.log("======================================");

    return result;
}


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