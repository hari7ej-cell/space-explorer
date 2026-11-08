// NASA Astronomy Picture of the Day.
// NASA moved APOD to science.nasa.gov on 2026-09-29. The old api.nasa.gov/planetary/apod
// endpoint now returns only the NASA logo, so we use the new endpoint (no API key needed).
// New pictures appear at 00:05 US Eastern time (about 09:35 in India).
const cheerio = require("cheerio");

const ENDPOINT = "https://science.nasa.gov/wp-json/wp/v2/apod-basic?per_page=7";
let cache = { time: 0, data: null };
const CACHE_MS = 30 * 60 * 1000; // check NASA at most every 30 minutes

// NASA sends HTML (links, <strong>, entities). This turns it into plain text.
const text = html => cheerio.load("<div>" + (html || "") + "</div>").text().replace(/\s+/g, " ").trim();

// Photos can be huge (thousands of pixels wide). Ask NASA's image host for 1600px.
function sized(url) {
    try {
        const u = new URL(url);
        if (u.searchParams.has("w")) { u.searchParams.set("w", "1600"); u.searchParams.set("h", "1600"); }
        return u.toString();
    } catch (e) { return url; }
}

// Video days: find the YouTube/Vimeo player in the top part of NASA's page
// (before the explanation, so links inside the text are never mistaken for the video).
function videoEmbed(d) {
    const head = String(d.basic_html || "").split(/<b>\s*Explanation:/i)[0];
    if (d.media_type !== "video" && !/<iframe/i.test(head)) return null;
    const iframe = /<iframe[^>]+src=["']([^"']+)["']/i.exec(head);
    const source = iframe ? iframe[1] : head;
    let m = /youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/i.exec(source) ||
            /youtube\.com\/watch\?v=([\w-]{11})/i.exec(source) ||
            /youtu\.be\/([\w-]{11})/i.exec(source);
    if (m) return "https://www.youtube.com/embed/" + m[1];
    m = /player\.vimeo\.com\/video\/(\d+)/i.exec(source);
    return m ? "https://player.vimeo.com/video/" + m[1] : null;
}

const hasPhoto = d => d.media_type === "image" && d.hdurl && !/logo/i.test(d.hdurl);

function simplify(d) {
    const embed = videoEmbed(d);
    let credit = text(d.copyright || d.credit);
    if (credit.length > 120) credit = credit.slice(0, 117) + "...";
    return {
        title: text(d.title),
        url: embed || sized(d.hdurl),
        explanation: text(d.explanation).replace(/^Explanation:\s*/i, "").replace(/\s*Tomorrow.s picture:.*$/i, ""),
        date: d.date,
        media_type: embed ? "video" : "image",
        copyright: credit,
        permalink: d.permalink
    };
}

async function getApod() {
    if (cache.data && Date.now() - cache.time < CACHE_MS) return cache.data;

    try {
        const response = await fetch(ENDPOINT, { headers: { "User-Agent": "SpaceExplorer/1.0 educational project" } });
        if (!response.ok) throw new Error("NASA returned " + response.status);

        const entries = await response.json(); // newest first
        // The newest entry we can actually show: a playable video or a real photo.
        const pick = entries.find(d => videoEmbed(d) || hasPhoto(d));
        if (!pick) throw new Error("No picture of the day found in the latest entries");

        cache = { time: Date.now(), data: simplify(pick) };
        return cache.data;
    } catch (error) {
        if (cache.data) return cache.data; // show the last good picture rather than nothing
        throw error;
    }
}

module.exports = { getApod };