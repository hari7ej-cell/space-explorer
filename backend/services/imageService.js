const { fetchJson: sharedFetchJson } = require("./http");

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

const fetchJson = url => sharedFetchJson(url, { label: "Image API" });

function isUsableImage(url) {
    return typeof url === "string" &&
        /^https?:\/\//i.test(url) &&
        !/\.svg(?:$|\?)/i.test(url);
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

        const entityTerms = String(entityName || "").toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2);
        const topicTerms = String(topic.title || "").toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 3);
        const suitable = pages
            .map(page => {
                const title = String(page.title || "").toLowerCase();
                const imageInfo = page.imageinfo?.[0];
                const metadata = String(imageInfo?.extmetadata?.ImageDescription?.value || "").toLowerCase();
                const searchable = `${title} ${metadata}`;
                const relevance = [...entityTerms, ...topicTerms]
                    .filter((term, index, all) => all.indexOf(term) === index && searchable.includes(term)).length;
                return { page, relevance };
            })
            .filter(item => {
                const title = item.page.title || "";
                const imageInfo = item.page.imageinfo?.[0];
                return imageInfo && isUsableImage(imageInfo.thumburl || imageInfo.url) &&
                    !/logo|icon|flag|map|diagram|symbol|coat of arms/i.test(title) &&
                    item.relevance > 0;
            })
            .sort((a, b) => b.relevance - a.relevance);
        const selected = suitable[0]?.page;

        if (!selected) {
            cacheSet(cacheKey, null);
            return null;
        }

        const imageInfo = selected.imageinfo[0];

        const result = {
            topicId: topic.id,
            title: selected.title,
            url: imageInfo.thumburl || imageInfo.url,
            alt: topic.title,
            caption: "",
            source: {
                name: "Wikimedia Commons",
                url: imageInfo.descriptionurl ||
                    `https://commons.wikimedia.org/wiki/${encodeURIComponent(selected.title.replace(/ /g, "_"))}`
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
            const articleImage = extractArticleImage(topic);

            if (articleImage) {
                return articleImage;
            }

            return searchCommonsImage(entityName, topic);
        })
    );

    return results.filter(Boolean);
}

module.exports = {
    getTopicImages
};
