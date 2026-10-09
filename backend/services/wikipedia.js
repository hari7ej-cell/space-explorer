async function getWikipediaPage(title) {
    const requestedTitle = String(title || "").trim();
    if (!requestedTitle) throw new Error("A Wikipedia article title is required.");

    const url =
        "https://en.wikipedia.org/w/rest.php/v1/page/" +
        encodeURIComponent(requestedTitle) +
        "/with_html";

    const response = await fetch(url, {
        headers: {
            "User-Agent": "SpaceExplorer/1.0 (educational project)",
            "Accept": "application/json"
        },
        signal: AbortSignal.timeout(15000)
    });

    if (response.status === 404) {
        throw new Error(`Wikipedia article "${requestedTitle}" was not found.`);
    }
    if (!response.ok) {
        throw new Error(`Wikipedia request failed with status ${response.status}.`);
    }

    const data = await response.json();
    if (!data || !data.html) {
        throw new Error(`Wikipedia returned no article HTML for "${requestedTitle}".`);
    }

    return {
        title: data.title || requestedTitle,
        html: data.html,
        url: "https://en.wikipedia.org/wiki/" +
            encodeURIComponent(data.title || requestedTitle).replace(/%20/g, "_")
    };
}

module.exports = { getWikipediaPage };
