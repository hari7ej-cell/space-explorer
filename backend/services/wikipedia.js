async function getWikipediaPage(title) {

    const url =
        "https://en.wikipedia.org/w/rest.php/v1/page/" +
        encodeURIComponent(title) +
        "/with_html";

    const response = await fetch(url, {
        headers: {
            "User-Agent":
                "SpaceExplorer/1.0 educational project"
        }
    });

    if (!response.ok) {
        throw new Error(
            "Wikipedia page not found"
        );
    }

    const data = await response.json();

    return {
        title: data.title,
        html: data.html,
        url:
            "https://en.wikipedia.org/wiki/" +
            encodeURIComponent(data.title)
    };
}

module.exports = {
    getWikipediaPage
};