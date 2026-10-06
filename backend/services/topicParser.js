const cheerio = require("cheerio");

const topicDefinitions = [
    { id: "overview", title: "Overview", shortTitle: "Overview", keys: ["overview"] },
    { id: "physical", title: "Physical Characteristics", shortTitle: "Physical", keys: ["physical characteristics", "physical properties"] },
    { id: "composition", title: "Composition", shortTitle: "Composition", keys: ["composition", "internal structure"] },
    { id: "atmosphere", title: "Atmosphere", shortTitle: "Atmosphere", keys: ["atmosphere"] },
    { id: "surface", title: "Surface & Structure", shortTitle: "Surface", keys: ["surface", "geology", "surface features"] },
    { id: "orbit", title: "Orbit & Rotation", shortTitle: "Orbit", keys: ["orbit", "rotation", "orbital characteristics"] },
    { id: "moons", title: "Moons & Satellites", shortTitle: "Moons", keys: ["moons", "satellites"] },
    { id: "discovery", title: "Discovery & History", shortTitle: "Discovery", keys: ["discovery", "history", "observation"] },
    { id: "exploration", title: "Exploration & Scientific Importance", shortTitle: "Exploration", keys: ["exploration", "scientific importance", "research"] }
];

function cleanText(value) {
    return value.replace(/\s+/g, " ").trim();
}

function normalizeHeading(value) {
    return cleanText(value).toLowerCase().replace(/\[[^\]]*\]/g, "");
}

function extractSection($, heading) {
    const blocks = [];
    let node = heading.next();

    while (node.length) {
        const tag = (node[0].name || "").toLowerCase();
        if (tag === "h2" || tag === "h3") break;
        if (["p", "ul", "ol"].includes(tag)) {
            const text = cleanText(node.text());
            if (text) blocks.push(text);
        }
        node = node.next();
    }

    return blocks.join("\n\n");
}

function createTopics(html) {
    const $ = cheerio.load(html || "");
    const headings = $("h2, h3").toArray();
    const topics = [];

    for (const definition of topicDefinitions) {
        let content = "";
        for (const heading of headings) {
            const headingText = normalizeHeading($(heading).text());
            if (definition.keys.some(key => headingText.includes(key))) {
                content = extractSection($, $(heading));
                if (content) break;
            }
        }
        topics.push({
            id: definition.id,
            title: definition.title,
            shortTitle: definition.shortTitle,
            content: content || "Information is not available in the matching Wikipedia section."
        });
    }

    const lead = $("p").first().text();
    if (lead) topics[0].content = cleanText(lead) + "\n\n" + topics[0].content;
    return topics;
}

module.exports = { createTopics };
