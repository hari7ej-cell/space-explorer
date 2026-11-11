const cheerio = require("cheerio");

function numberFromText(text) {
    if (!text) return 0;
    const match = String(text).replace(/,/g, "").match(/[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?/i);
    return match ? Number(match[0]) : 0;
}

function firstInfoboxValue($, labels) {
    let value = "";
    $("table.infobox tr").each((_, row) => {
        const cells = $(row).find("th, td");
        if (cells.length < 2) return;
        const label = $(cells[0]).text().replace(/\[[^\]]*\]/g, "").trim().toLowerCase();
        if (!value && labels.some(item => label.includes(item))) {
            value = $(cells[1]).text().replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
        }
    });
    return value;
}

function extractStructuredData(html) {
    const $ = cheerio.load(html || "");
    const massText = firstInfoboxValue($, ["mass"]);
    const radiusText = firstInfoboxValue($, ["mean radius", "radius"]);
    const distanceText = firstInfoboxValue($, ["semi-major axis", "distance from sun"]);
    const gravityText = firstInfoboxValue($, ["surface gravity"]);
    const temperatureText = firstInfoboxValue($, ["surface temp", "mean temperature", "temperature"]);
    const atmosphere = firstInfoboxValue($, ["atmosphere"]);
    const composition = firstInfoboxValue($, ["composition", "surface composition"]);
    const ringsText = firstInfoboxValue($, ["rings"]);
    const rotationText = firstInfoboxValue($, ["rotation period", "sidereal rotation"]);
    const orbitalText = firstInfoboxValue($, ["orbital period", "sidereal orbital"]);
    const moonsText = firstInfoboxValue($, ["moons", "natural satellites"]);

    const moons = moonsText
        ? moonsText.split(/,|\band\b/).map(x => x.trim()).filter(Boolean).slice(0, 50)
        : [];

    return {
        mass: numberFromText(massText),
        radius: numberFromText(radiusText),
        distanceFromSun: numberFromText(distanceText),
        gravity: numberFromText(gravityText),
        temperature: numberFromText(temperatureText),
        atmosphere,
        composition,
        rings: /yes|present|ring/i.test(ringsText),
        rotationPeriod: numberFromText(rotationText),
        orbitalPeriod: numberFromText(orbitalText),
        moons
    };
}

module.exports = { extractStructuredData };
