"use strict";

const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

const NASA_3D_URL = "https://science.nasa.gov/3d-resources/";

function normalizeName(name) {
    return String(name || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}

async function getNASA3DModel(entityName) {
    const name = normalizeName(entityName);

    if (!name) {
        return { available: false };
    }

    const cached = cache.get(name);

    if (cached && Date.now() - cached.time < CACHE_TTL) {
        return cached.data;
    }

    /*
     * NASA's collection is not a universal model API.
     * Only return a viewer URL when a verified viewer is available.
     */

    let model = { available: false };

    if (name === "mars") {
        model = {
            available: true,
            name: "Mars",
            url: "https://mars.nasa.gov/gltf_embed/24881",
            format: "iframe",
            source: {
                name: "NASA/JPL-Caltech",
                url: "https://science.nasa.gov/resource/planet-mars-3d-model/"
            }
        };
    }

    cache.set(name, {
        data: model,
        time: Date.now()
    });

    return model;
}

module.exports = {
    getNASA3DModel
};