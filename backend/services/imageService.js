const imageCache = new Map();
const IMAGE_CACHE_TTL = 30 * 60 * 1000;

function cacheGet(key) {
    const entry = imageCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > IMAGE_CACHE_TTL) {
        imageCache.delete(key);
        return null;
    }
    return entry.data;
}

function cacheSet(key, data) {
    imageCache.set(key, { data, timestamp: Date.now() });
}

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: { "User-Agent": "SpaceExplorer/1.0 (educational project)" },
        signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Image service returned ${response.status}`);
    return response.json();
}

function isUsableImage(url) {
    return typeof url === "string" &&
        /^https?:\/\//i.test(url) &&
        !/\.svg(?:$|\?)/i.test(url);
}

/*
 * Prefer the article's own lead image, which is more likely to match
 * the selected entity than a random image-search result.
 */
async function getHeroImage(entityName, articleHtml = "") {
    const cacheKey = `hero:${String(entityName).toLowerCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    let hero = null;

    try {
        const summary = await fetchJson(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(entityName)}`
        );
        const imageUrl =
            summary.originalimage?.source ||
            summary.thumbnail?.source;

        if (isUsableImage(imageUrl)) {
            hero = {
                url: imageUrl,
                title: summary.title || entityName,
                caption: summary.description || "",
                source: {
                    name: "Wikipedia",
                    url: summary.content_urls?.desktop?.page ||
                        `https://en.wikipedia.org/wiki/${encodeURIComponent(summary.title || entityName)}`
                }
            };
        }
    } catch (error) {
        console.warn("Wikipedia hero image lookup failed:", error.message);
    }

    // Fallback to a large image already present in the fetched article.
    if (!hero && articleHtml) {
        const cheerio = require("cheerio");
        const $ = cheerio.load(articleHtml);
        const candidate = $("figure img, .infobox img, img").toArray()
            .map(el => {
                const src = $(el).attr("src") || $(el).attr("data-src") || "";
                const width = Number($(el).attr("width")) || 0;
                return { src, width, alt: $(el).attr("alt") || "" };
            })
            .filter(item => {
                try {
                    return isUsableImage(new URL(item.src, "https://en.wikipedia.org").href);
                } catch {
                    return false;
                }
            })
            .sort((a, b) => b.width - a.width)[0];

        if (candidate) {
            hero = {
                url: new URL(candidate.src, "https://en.wikipedia.org").href,
                title: candidate.alt || entityName,
                caption: "",
                source: {
                    name: "Wikipedia",
                    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(entityName)}`
                }
            };
        }
    }

    // Last fallback: NASA image search. Only use a result if it has a real image URL.
    if (!hero) {
        try {
            const nasa = await searchNASAImages(entityName, 1);
            if (nasa[0]) hero = nasa[0];
        } catch (error) {
            console.warn("NASA hero image lookup failed:", error.message);
        }
    }

    cacheSet(cacheKey, hero);
    return hero;
}

const blockedWords = [
    "costume", "children", "child", "event", "festival", "school",
    "party", "parade", "celebration", "museum", "poster", "classroom",
    "conference", "merchandise"
];

function scoreImage(item, keywords) {
    const metadata = item.data?.[0] || {};
    const haystack = `${metadata.title || ""} ${metadata.description || ""}`.toLowerCase();
    if (blockedWords.some(word => haystack.includes(word))) return -1000;

    let score = 0;
    for (const keyword of keywords) {
        if (keyword.length > 2 && haystack.includes(keyword.toLowerCase())) score += 10;
    }
    return score;
}

async function searchNASAImages(searchTerm, limit = 1) {
    const cacheKey = `nasa:${searchTerm.toLowerCase()}:${limit}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(searchTerm)}&media_type=image`;
    const data = await fetchJson(url);
    const items = data?.collection?.items || [];
    const keywords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);

    const results = items
        .map(item => ({ item, score: scoreImage(item, keywords) }))
        .filter(entry => entry.score > -1000)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ item }) => {
            const metadata = item.data?.[0] || {};
            const imageLink = item.links?.find(link => link.render === "image");
            return {
                title: metadata.title || "NASA image",
                description: metadata.description || "",
                url: imageLink?.href || "",
                nasaId: metadata.nasa_id || "",
                date: metadata.date_created || "",
                source: { name: "NASA", url: "https://images.nasa.gov/" }
            };
        })
        .filter(item => isUsableImage(item.url));

    cacheSet(cacheKey, results);
    return results;
}

/*
 * Article images are preserved inline by topicParser. Do not make one NASA
 * request per heading: it is slow and can attach unrelated pictures to text.
 * This function remains exported for compatibility with the existing server.
 */
async function getTopicImages(entityName, topics) {
    return [];
}

module.exports = { searchNASAImages, getTopicImages, getHeroImage };
