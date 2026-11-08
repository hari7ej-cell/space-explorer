const cheerio = require("cheerio");

const EXCLUDED_HEADINGS = new Set([
    "references", "notes", "external links", "further reading",
    "bibliography", "works cited", "see also", "citations",
    "sources", "gallery"
]);

function cleanText(value) {
    return String(value || "").replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
    return cleanText(value)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "section";
}

function shortLabel(title) {
    const cleaned = cleanText(title).replace(/\s*\([^)]*\)\s*/g, " ").trim();
    const aliases = {
        "physical characteristics": "Physical",
        "composition and structure": "Structure",
        "orbital characteristics": "Orbit",
        "formation and evolution": "Formation",
        "observation": "Observations",
        "scientific exploration": "Exploration",
        "history": "History",
        "discovery": "Discovery",
        "see also": "Related"
    };
    const key = cleaned.toLowerCase();
    if (aliases[key]) return aliases[key];
    const words = cleaned.split(/\s+/).filter(Boolean);
    return words.slice(0, 2).join(" ") || "Topic";
}

function absoluteUrl(value, base = "https://en.wikipedia.org") {
    if (!value) return "";
    if (/^(data:|javascript:)/i.test(value)) return "";
    try { return new URL(value, base).href; } catch { return ""; }
}

function sanitizeArticleHtml($, root) {
    const allowed = new Set([
        "p", "br", "b", "strong", "i", "em", "sup", "sub",
        "ul", "ol", "li", "blockquote", "h3", "h4", "h5",
        "table", "thead", "tbody", "tfoot", "tr", "th", "td",
        "figure", "figcaption", "img", "a", "dl", "dt", "dd",
        "div", "span", "small"
    ]);
    const removeSelectors = [
        "script", "style", "noscript", "form", "button", "input",
        ".mw-editsection", ".reference", ".reflist", ".navbox",
        ".metadata", ".noprint", ".mw-empty-elt", ".hatnote",
        ".shortdescription", ".mw-cite-backlink", ".portal",
        ".sistersitebox", ".ambox", ".tmbox", ".ombox",
        "sup.reference", ".gallery", ".toc", "audio", "video"
    ];
    root.find(removeSelectors.join(",")).remove();

    root.find("*").each((_, el) => {
        const node = $(el);
        const tag = (el.tagName || "").toLowerCase();

        if (!allowed.has(tag)) {
            node.replaceWith(node.contents());
            return;
        }

        const attrs = el.attribs || {};
        Object.keys(attrs).forEach(attr => {
            if (tag === "a" && attr === "href") {
                const href = absoluteUrl(attrs.href);
                if (href && /^https?:/i.test(href)) {
                    node.attr("href", href);
                    node.attr("target", "_blank");
                    node.attr("rel", "noopener noreferrer");
                } else {
                    node.removeAttr(attr);
                }
            } else if (tag === "img" && ["src", "alt", "width", "height"].includes(attr)) {
                if (attr === "src") {
                    const src = absoluteUrl(attrs.src);
                    if (src && /^https?:/i.test(src)) node.attr("src", src);
                    else node.removeAttr("src");
                } else if (attr === "width" || attr === "height") {
                    const n = Number.parseInt(attrs[attr], 10);
                    if (Number.isFinite(n) && n > 0 && n < 3000) node.attr(attr, String(n));
                    else node.removeAttr(attr);
                } else {
                    node.attr(attr, String(attrs[attr]).slice(0, 300));
                }
            } else if (tag === "th" && ["colspan", "rowspan", "scope"].includes(attr)) {
                if (attr === "scope") node.attr(attr, attrs[attr]);
                else {
                    const n = Number.parseInt(attrs[attr], 10);
                    if (Number.isFinite(n) && n > 0 && n <= 30) node.attr(attr, String(n));
                    else node.removeAttr(attr);
                }
            } else {
                node.removeAttr(attr);
            }
        });
    });

    return root.html() || "";
}

function getArticleRoot($) {
    return $("#mw-content-text .mw-parser-output").first().length
        ? $("#mw-content-text .mw-parser-output").first()
        : $("article").first().length
            ? $("article").first()
            : $("body");
}

function createTopics(html) {
    const $ = cheerio.load(html || "");
    const root = getArticleRoot($);
    root.find("script, style, noscript, .mw-editsection, .reference, .reflist, .navbox, .toc").remove();

    const topics = [];
    const usedIds = new Set();
    let index = 0;

    function addTopic(title, contentRoot, preferredId) {
        const normalized = cleanText(title).toLowerCase().replace(/\s*\[edit\]\s*/i, "").trim();
        if (!normalized || EXCLUDED_HEADINGS.has(normalized)) return;
        if (/^(contents|navigation|references|notes|external links|further reading|bibliography|works cited|citations)$/i.test(normalized)) return;

        const content = sanitizeArticleHtml($, contentRoot);
        const text = cleanText(contentRoot.text());
        if (!text || !content) return;

        let id = preferredId || slugify(title);
        if (usedIds.has(id)) id = `${id}-${++index}`;
        usedIds.add(id);
        topics.push({
            id,
            title: cleanText(title),
            shortTitle: shortLabel(title),
            content,
            text,
            level: 2
        });
    }

    // Parsoid/Wikipedia REST HTML wraps article sections in section elements.
    const wrappedSections = root.find("section[data-mw-section-id]").toArray();
    const topSections = wrappedSections.filter(section => {
        const parentSection = $(section).parents("section[data-mw-section-id]").first();
        const heading = $(section).children("h2").first();
        return heading.length > 0 && (!parentSection.length || $(parentSection).attr("data-mw-section-id") === "0");
    });

    if (topSections.length) {
        // Lead / overview section (section id 0), or the content before the first h2.
        const lead = $("<div></div>");
        const leadSection = wrappedSections.find(section => $(section).attr("data-mw-section-id") === "0");
        if (leadSection) {
            $(leadSection).children().each((_, el) => {
                if (!/^h[1-6]$/i.test(el.tagName || "") && (el.tagName || "").toLowerCase() !== "section") {
                    lead.append($(el).clone());
                }
            });
        } else {
            const firstH2 = root.find("h2").first()[0];
            let node = root.children().first();
            while (node.length && node[0] !== firstH2) {
                if ((node[0].tagName || "").toLowerCase() !== "section") lead.append(node.clone());
                node = node.next();
            }
        }
        if (cleanText(lead.text())) {
            addTopic("Overview", lead, "overview");
        }

        for (const section of topSections) {
            const heading = $(section).children("h2").first();
            const title = cleanText(heading.text());
            const contentRoot = $("<div></div>");

            // Add direct content, but not nested section wrappers (avoids duplicated text).
            $(section).contents().each((_, node) => {
                if (node === heading[0]) return;
                if (node.type === "tag" && (node.name || "").toLowerCase() === "section") return;
                contentRoot.append($(node).clone());
            });

            // Include meaningful subsections in this topic, preserving their headings.
            $(section).children("section[data-mw-section-id]").each((_, subSection) => {
                const subHeading = $(subSection).children("h3, h4").first();
                if (subHeading.length) contentRoot.append(subHeading.clone());
                $(subSection).contents().each((__, subNode) => {
                    if (subNode === subHeading[0]) return;
                    if (subNode.type === "tag" && (subNode.name || "").toLowerCase() === "section") return;
                    contentRoot.append($(subNode).clone());
                });
            });

            addTopic(title, contentRoot);
        }
    } else {
        // Fallback for classic MediaWiki HTML where headings and paragraphs are siblings.
        const firstHeading = root.find("h2").first()[0];
        const lead = $("<div></div>");
        let node = root.children().first();

        while (node.length && node[0] !== firstHeading) {
            if (["p", "ul", "ol", "figure", "table", "blockquote"].includes((node[0].tagName || "").toLowerCase())) {
                lead.append(node.clone());
            }
            node = node.next();
        }
        if (cleanText(lead.text())) addTopic("Overview", lead, "overview");

        const headings = root.find("h2").toArray();
        for (const heading of headings) {
            const title = cleanText($(heading).text());
            const contentRoot = $("<div></div>");
            let sibling = $(heading).next();
            while (sibling.length && (sibling[0].tagName || "").toLowerCase() !== "h2") {
                const tag = (sibling[0].tagName || "").toLowerCase();
                if (["p", "ul", "ol", "figure", "table", "blockquote", "dl", "div", "h3", "h4"].includes(tag)) {
                    contentRoot.append(sibling.clone());
                }
                sibling = sibling.next();
            }
            addTopic(title, contentRoot);
        }
    }

    return topics;
}

module.exports = { createTopics, shortLabel };
