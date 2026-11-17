const { USER_AGENT } = require("./http");

async function fetchWikipediaPage(title) {
    const url =
        "https://en.wikipedia.org/w/rest.php/v1/page/" +
        encodeURIComponent(title) +
        "/with_html";

    const response = await fetch(url, {
        headers: {
            "User-Agent": USER_AGENT,
            "Accept": "application/json"
        },
        signal: AbortSignal.timeout(15000)
    });

    if (response.status === 404) return null;
    if (!response.ok) {
        throw new Error(`Wikipedia request failed with status ${response.status}.`);
    }

    const data = await response.json();
    if (!data || !data.html) return null;

    const pageTitle = data.title || title;
    return {
        title: pageTitle,
        html: data.html,
        url: "https://en.wikipedia.org/wiki/" +
            encodeURIComponent(pageTitle).replace(/%20/g, "_")
    };
}

async function searchWikipediaTitles(query) {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: query,
        srlimit: "5",
        format: "json",
        origin: "*"
    }).toString();

    const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) return [];
    const data = await response.json();
    return (data.query?.search || []).map(item => item.title);
}

function searchQueries(title) {
    const clean = String(title || "").trim().replace(/\s+/g, " ");
    const withoutType = clean.replace(/\s+(mission|astronaut|cosmonaut|galaxy|black hole)$/i, "").trim();
    const variants = [clean, clean.replace(/-/g, " "), withoutType];
    return [...new Set(variants.filter(Boolean))];
}

async function getWikipediaPage(title) {
    const requestedTitle = String(title || "").trim();
    if (!requestedTitle) throw new Error("A Wikipedia article title is required.");

    const direct = await fetchWikipediaPage(requestedTitle);
    if (direct) return direct;

    const candidates = [];
    for (const query of searchQueries(requestedTitle)) {
        const matches = await searchWikipediaTitles(query);
        for (const match of matches) {
            if (!candidates.includes(match)) candidates.push(match);
        }
        if (candidates.length >= 5) break;
    }

    for (const candidate of candidates) {
        const page = await fetchWikipediaPage(candidate);
        if (page) return page;
    }

    throw new Error(`No matching Wikipedia article was found for "${requestedTitle}". Try the full article name.`);
}

module.exports = { getWikipediaPage };
