const express = require("express");
const cors = require("cors");
const {
    getLatestDiscovery
} = require("./services/latestDiscovery");
const { getWikipediaPage } = require("./services/wikipedia");
const { createTopics } = require("./services/topicParser");
const { getTopicImages } = require("./services/imageService");
const { extractStructuredData } = require("./services/structuredData");
const { processPlanet } = require("./services/cppService");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;

/*
====================================================
CACHE CONFIGURATION
====================================================
*/

// Keep completed planet responses for 10 minutes.
const CACHE_TTL = 10 * 60 * 1000;

// Stores completed responses.
const planetCache = new Map();

// Stores requests that are currently being processed.
// This prevents two users/requests from fetching Mars
// from Wikipedia + NASA at the same time.
const pendingRequests = new Map();


/*
====================================================
CACHE HELPERS
====================================================
*/

function getCachedPlanet(name) {
    const cached = planetCache.get(name);

    if (!cached) {
        return null;
    }

    const age = Date.now() - cached.timestamp;

    if (age > CACHE_TTL) {
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


/*
====================================================
PLANET API
====================================================
*/

app.get("/api/planet/:name", async (req, res) => {

    const startTime = Date.now();

    try {

        const name = req.params.name.trim();

        if (!name) {
            return res.status(400).json({
                error: "Planet name is required"
            });
        }

        // Normalize cache key.
        const cacheKey =
            decodeURIComponent(name).toLowerCase();


        /*
        ====================================================
        1. CHECK CACHE
        ====================================================
        */

        const cached = getCachedPlanet(cacheKey);

        if (cached) {

            console.log(
                `[CACHE HIT] ${name} - ${
                    Date.now() - startTime
                } ms`
            );

            // Tell browser it can reuse this response.
            res.set(
                "Cache-Control",
                "public, max-age=600"
            );

            return res.json(cached);
        }


        /*
        ====================================================
        2. CHECK IF SAME REQUEST IS ALREADY RUNNING
        ====================================================
        */

        if (pendingRequests.has(cacheKey)) {

            console.log(
                `[WAITING] ${name} request already running`
            );

            const result =
                await pendingRequests.get(cacheKey);

            res.set(
                "Cache-Control",
                "public, max-age=600"
            );

            return res.json(result);
        }


        /*
        ====================================================
        3. START NEW PLANET REQUEST
        ====================================================
        */

        const planetPromise = buildPlanet(name);

        pendingRequests.set(
            cacheKey,
            planetPromise
        );


        try {

            const result =
                await planetPromise;

            /*
            ====================================================
            4. SAVE COMPLETE RESULT TO CACHE
            ====================================================
            */

            setCachedPlanet(
                cacheKey,
                result
            );


            /*
            ====================================================
            5. BROWSER CACHE
            ====================================================
            */

            res.set(
                "Cache-Control",
                "public, max-age=600"
            );


            console.log(
                `[CACHE STORE] ${name} - ${
                    Date.now() - startTime
                } ms`
            );


            return res.json(result);

        } finally {

            // Remove the running request.
            pendingRequests.delete(cacheKey);
        }

    } catch (error) {

        console.error(
            "API ERROR:",
            error
        );

        return res.status(500).json({
            error: error.message
        });
    }
});
app.get("/api/latest-discovery", async (req, res) => {

    try {

        const discovery =
            await getLatestDiscovery();

        res.json(discovery);

    } catch (error) {

        console.error(
            "LATEST DISCOVERY ERROR:",
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
});

/*
====================================================
BUILD PLANET
====================================================
*/

async function buildPlanet(name) {

    const totalStart = Date.now();

    console.log("");
    console.log("================================");
    console.log(`Loading: ${name}`);
    console.log("================================");


    /*
    ====================================================
    STEP 1: WIKIPEDIA
    ====================================================
    */

    const wikiStart = Date.now();

    const wiki =
        await getWikipediaPage(name);

    console.log(
        `Wikipedia: ${wiki.title} - ${
            Date.now() - wikiStart
        } ms`
    );


    /*
    ====================================================
    STEP 2: PARSE WIKIPEDIA
    ====================================================
    */

    const parseStart = Date.now();

    const topics =
        createTopics(wiki.html);

    const overview =
        topics.find(
            topic => topic.id === "overview"
        );

    const summary =
        (
            overview?.content ||
            "Space entity information."
        ).slice(0, 700);

    const details =
        extractStructuredData(wiki.html);

    console.log(
        `Parsing: ${
            Date.now() - parseStart
        } ms`
    );

    console.log(
        `Topics: ${topics.length}`
    );


    /*
    ====================================================
    STEP 3: NASA IMAGES
    ====================================================
    */

    const imageStart = Date.now();

    const images =
        await getTopicImages(
            wiki.title,
            topics
        );

    console.log(
        `NASA images: ${images.length} - ${
            Date.now() - imageStart
        } ms`
    );


    /*
    ====================================================
    STEP 4: SEND DATA TO C++
    ====================================================
    */

    const cppStart = Date.now();

    const cppInput = {

        type: "Planet",

        summary,

        details,

        topics,

        images
    };


    const cppResult =
        await processPlanet(cppInput);


    console.log(
        `C++ processing: ${
            Date.now() - cppStart
        } ms`
    );


    /*
    ====================================================
    STEP 5: FINAL RESPONSE
    ====================================================
    */

    const result = {

        ...cppResult,

        entity: {
            name: wiki.title,
            type: "Planet"
        },

        wikipediaUrl:
            wiki.url,

        model3D: {

            available: true,

            name: wiki.title,

            url:
                "https://science.nasa.gov/resource/planet-mars-3d-model/",

            format: "glTF",

            source: {

                name:
                    "NASA/JPL-Caltech",

                url:
                    "https://science.nasa.gov/resource/planet-mars-3d-model/"
            }
        }
    };


    console.log(
        `TOTAL: ${
            Date.now() - totalStart
        } ms`
    );

    console.log(
        "================================"
    );


    return result;
}


/*
====================================================
OPTIONAL CACHE STATUS ENDPOINT
====================================================
*/

app.get("/api/cache", (req, res) => {

    const planets = [];

    for (const [name, value] of planetCache) {

        planets.push({
            name,
            age:
                Date.now() - value.timestamp
        });
    }

    res.json({
        cachedPlanets: planets
    });
});


/*
====================================================
CLEAR CACHE
====================================================
*/

app.delete("/api/cache", (req, res) => {

    planetCache.clear();

    res.json({
        message: "Planet cache cleared"
    });
});


/*
====================================================
START SERVER
====================================================
*/

app.listen(PORT, () => {

    console.log(
        `Space Explorer backend running at http://localhost:${PORT}`
    );

});