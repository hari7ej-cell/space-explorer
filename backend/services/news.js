// Space news from the Spaceflight News API (no key needed).
// Only articles from the last 30 days are ever returned.
const BASE = "https://api.spaceflightnewsapi.net/v4/articles/";
const DAYS = 30;
const CACHE_MS = 20 * 60 * 1000; // refresh from the API at most every 20 minutes

let cache = { time: 0, items: [] };

function withinWindow(items) {
    const cutoff = Date.now() - DAYS * 24 * 60 * 60 * 1000;
    return items.filter(a => new Date(a.date).getTime() >= cutoff);
}

function simplify(a) {
    return {
        id: a.id,
        title: a.title,
        summary: (a.summary || "").slice(0, 220),
        source: a.news_site,
        url: a.url,
        image: a.image_url,
        date: a.published_at
    };
}

async function fetchFresh() {
    const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
    let url = BASE + "?published_at_gte=" + encodeURIComponent(since) +
              "&ordering=-published_at&limit=50";
    const items = [];

    for (let page = 0; page < 4 && url; page++) {
        const response = await fetch(url, {
            headers: { "User-Agent": "SpaceExplorer/1.0 educational project" }
        });
        if (!response.ok) throw new Error("News API returned " + response.status);
        const data = await response.json();
        items.push(...data.results.map(simplify));
        url = data.next;
    }
    return items;
}

async function getAnnouncements() {
    if (cache.items.length && Date.now() - cache.time < CACHE_MS) {
        return withinWindow(cache.items); // re-filtered every time, so old items drop off
    }
    try {
        cache = { time: Date.now(), items: await fetchFresh() };
    } catch (error) {
        if (cache.items.length) return withinWindow(cache.items); // API down: use last good list
        throw error;
    }
    return withinWindow(cache.items);
}

module.exports = { getAnnouncements };
