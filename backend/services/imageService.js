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
    imageCache.set(key, {
        data,
        timestamp: Date.now()
    });
}

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: {
            "User-Agent": "SpaceExplorer/1.0 (educational project)"
        },
        signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
        throw new Error(`Image API returned ${response.status}`);
    }

    return response.json();
}

function isUsableImage(url) {
    return typeof url === "string" &&
        /^https?:\/\//i.test(url) &&
        !/\.svg(?:$|\?)/i.test(url);
}


/*
====================================================
HERO IMAGE
====================================================
*/

async function getHeroImage(entityName, articleHtml = "") {
    const cacheKey = `hero:${entityName.toLowerCase()}`;

    const cached = cacheGet(cacheKey);

    if (cached) return cached;

    let hero = null;

    // First preference: Wikipedia's article image.
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
                alt: summary.title || entityName,
                source: {
                    name: "Wikipedia",
                    url: summary.content_urls?.desktop?.page ||
                        `https://en.wikipedia.org/wiki/${encodeURIComponent(entityName)}`
                }
            };
        }
    } catch (error) {
        console.warn("Wikipedia hero lookup failed:", error.message);
    }

    // Second preference: an image already present in the article.
    if (!hero && articleHtml) {
        try {
            const cheerio = require("cheerio");
            const $ = cheerio.load(articleHtml);

            const candidate = $("figure img, .infobox img, img")
                .toArray()
                .map(element => {
                    const image = $(element);

                    return {
                        url: image.attr("src") ||
                            image.attr("data-src") ||
                            image.attr("srcset")?.split(",")[0]?.trim().split(" ")[0] ||
                            "",
                        alt: image.attr("alt") || ""
                    };
                })
                .find(image => {
                    try {
                        return isUsableImage(
                            new URL(image.url, "https://en.wikipedia.org").href
                        );
                    } catch {
                        return false;
                    }
                });

            if (candidate) {
                hero = {
                    url: new URL(
                        candidate.url,
                        "https://en.wikipedia.org"
                    ).href,
                    title: candidate.alt || entityName,
                    alt: candidate.alt || entityName,
                    caption: "",
                    source: {
                        name: "Wikipedia",
                        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(entityName)}`
                    }
                };
            }
        } catch (error) {
            console.warn("Article image extraction failed:", error.message);
        }
    }

    cacheSet(cacheKey, hero);

    return hero;
}


/*
====================================================
EXTRACT IMAGES ALREADY PRESENT IN ARTICLE SECTIONS
====================================================
*/

function extractArticleImage(topic) {
    if (!topic?.content) return null;

    try {
        const cheerio = require("cheerio");
        const $ = cheerio.load(topic.content);

        const figure = $("figure").first();
        const image = figure.find("img").first().length
            ? figure.find("img").first()
            : $("img").first();

        if (!image.length) return null;

        const rawUrl =
            image.attr("src") ||
            image.attr("data-src");

        if (!rawUrl) return null;

        const url = new URL(
            rawUrl,
            "https://en.wikipedia.org"
        ).href;

        if (!isUsableImage(url)) return null;

        const caption = figure.find("figcaption").first().text().trim();

        return {
            topicId: topic.id,
            title: topic.title,
            url,
            alt: image.attr("alt") || topic.title,
            caption,
            source: {
                name: "Wikipedia",
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(topic.title)}`
            }
        };
    } catch {
        return null;
    }
}


/*
====================================================
SEARCH WIKIMEDIA COMMONS
====================================================
*/

async function searchCommonsImage(entityName, topic) {
    const cacheKey =
        `commons:${entityName.toLowerCase()}:${topic.title.toLowerCase()}`;

    const cached = cacheGet(cacheKey);

    if (cached) return cached;

    const query = `${entityName} ${topic.title}`;

    const url =
        "https://commons.wikimedia.org/w/api.php" +
        "?action=query" +
        "&generator=search" +
        `&gsrsearch=${encodeURIComponent(query + " filetype:bitmap")}` +
        "&gsrnamespace=6" +
        "&gsrlimit=8" +
        "&prop=imageinfo" +
        "&iiprop=url%7Cextmetadata" +
        "&iiurlwidth=1200" +
        "&format=json";

    try {
        const data = await fetchJson(url);

        const pages = Object.values(
            data.query?.pages || {}
        );

        const suitable = pages.find(page => {
            const title = page.title || "";

            const imageInfo = page.imageinfo?.[0];

            return imageInfo &&
                isUsableImage(
                    imageInfo.thumburl || imageInfo.url
                ) &&
                !/logo|icon|flag|map|diagram|symbol/i.test(title);
        });

        if (!suitable) {
            cacheSet(cacheKey, null);
            return null;
        }

        const imageInfo = suitable.imageinfo[0];

        const result = {
            topicId: topic.id,
            title: suitable.title,
            url: imageInfo.thumburl || imageInfo.url,
            alt: topic.title,
            caption: "",
            source: {
                name: "Wikimedia Commons",
                url: imageInfo.descriptionurl ||
                    `https://commons.wikimedia.org/wiki/${encodeURIComponent(suitable.title.replace(/ /g, "_"))}`
            }
        };

        cacheSet(cacheKey, result);

        return result;

    } catch (error) {
        console.warn(
            `Commons image search failed for ${topic.title}:`,
            error.message
        );

        return null;
    }
}


/*
====================================================
GET IMAGES FOR ARTICLE SECTIONS
====================================================
*/

async function getTopicImages(entityName, topics) {
    const selectedTopics = (topics || [])
        .filter(topic =>
            topic &&
            topic.id &&
            topic.title &&
            topic.content
        )
        .slice(0, 10);

    const results = await Promise.all(
        selectedTopics.map(async topic => {

            // Use a relevant image already inside the article.
            const articleImage = extractArticleImage(topic);

            if (articleImage) {
                return articleImage;
            }

            // Otherwise search Commons for a matching image.
            return searchCommonsImage(entityName, topic);
        })
    );

    return results.filter(Boolean);
}


/*
====================================================
NASA SEARCH: KEEP FOR EXISTING FEATURES
====================================================
*/

async function searchNASAImages(searchTerm, limit = 1) {
    const cacheKey =
        `nasa:${searchTerm.toLowerCase()}:${limit}`;

    const cached = cacheGet(cacheKey);

    if (cached) return cached;

    const url =
        `https://images-api.nasa.gov/search?q=${encodeURIComponent(searchTerm)}&media_type=image`;

    try {
        const data = await fetchJson(url);

        const items = data.collection?.items || [];

        const results = items
            .map(item => {
                const metadata = item.data?.[0] || {};

                const imageLink = item.links?.find(
                    link => link.render === "image"
                );

                return {
                    title: metadata.title || "NASA image",
                    description: metadata.description || "",
                    url: imageLink?.href || "",
                    source: {
                        name: "NASA",
                        url: "https://images.nasa.gov/"
                    }
                };
            })
            .filter(item => isUsableImage(item.url))
            .slice(0, limit);

        cacheSet(cacheKey, results);

        return results;

    } catch (error) {
        console.warn("NASA image search failed:", error.message);
        return [];
    }
}


module.exports = {
    getHeroImage,
    getTopicImages,
    searchNASAImages
};