const NASA_EXOPLANET_API =
    "https://exoplanetarchive.ipac.caltech.edu/TAP/sync";

async function getLatestDiscovery() {

    const query = `
        SELECT TOP 1
            pl_name,
            hostname,
            disc_year,
            disc_pubdate,
            discoverymethod,
            disc_facility
        FROM ps
        WHERE default_flag = 1
        ORDER BY disc_pubdate DESC
    `;

    const url =
        NASA_EXOPLANET_API +
        "?query=" +
        encodeURIComponent(query) +
        "&format=json";

    console.log("NASA URL:");
    console.log(url);

    const response = await fetch(url, {
        headers: { "User-Agent": "SpaceExplorer/1.0 (educational project)" },
        signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {

        const errorText =
            await response.text();

        console.error(
            "NASA API response:",
            errorText
        );

        throw new Error(
            `NASA Exoplanet API error: ${response.status}`
        );
    }

    const data =
        await response.json();

    if (!data || data.length === 0) {
        throw new Error(
            "No recent exoplanet discovery found."
        );
    }

    const planet = data[0];
    if (!planet.pl_name) {
        throw new Error("NASA returned an incomplete discovery record.");
    }

    return {
        name: planet.pl_name,

        type: "Planet",

        caption:
            `${planet.pl_name} is a recently recorded exoplanet ` +
            `in the NASA Exoplanet Archive.`,

        image: null,

        discoveryYear: planet.disc_year,

        discoveryDate: planet.disc_pubdate,

        discoveryMethod: planet.discoverymethod,

        facility: planet.disc_facility
    };
}

module.exports = {
    getLatestDiscovery
};