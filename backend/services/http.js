// One place for the "download JSON from an API" code that every service needs.
const USER_AGENT = "SpaceExplorer/1.0 (educational project)";

async function fetchJson(url, { timeout = 12000, label = "Source" } = {}) {
    const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(timeout)
    });

    if (!response.ok) {
        throw new Error(`${label} returned ${response.status}`);
    }

    return response.json();
}

module.exports = { USER_AGENT, fetchJson };
