// Astronaut directory: records come from Wikidata, portraits from Wikipedia.
// The list is cached on the server for six hours.
const { fetchJson: fetchSource } = require("./http");
const { validateAstronauts } = require("./cppService");

const CACHE_MS = 6 * 60 * 60 * 1000;
const REFRESH_COOLDOWN_MS = 60 * 1000;
const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const EN_WIKI = "https://en.wikipedia.org/wiki/";
const WIKIDATA_TIMEOUT_MS = 65000;
const WIKIPEDIA_TIMEOUT_MS = 12000;

let directoryCache = { at: 0, data: null };
let directoryInFlight = null;
let lastRefreshAt = 0;
let cppValidated = false;

const fetchJson = (url, timeout = WIKIPEDIA_TIMEOUT_MS) => fetchSource(url, { timeout });

function cleanText(value, max = 500) {
    return String(value ?? '')
        .replace(/[\t\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

function isoDate(value) {
    if (!value) return '';
    const match = String(value).match(/^([+-]?\d{4,})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function wikidataId(value) {
    return String(value || '').split('/').pop() || '';
}

function addUniqueValue(current, value, max = 250) {
    const next = cleanText(value, max);
    if (!next) return current;

    const existing = current ? current.split(' | ') : [];
    if (existing.includes(next)) return current;

    return [...existing, next].join(' | ');
}

function getAge(birthDate, deathDate) {
    if (!birthDate) return null;

    const birth = new Date(birthDate);
    const end = deathDate ? new Date(deathDate) : new Date();

    if (Number.isNaN(birth.getTime()) || Number.isNaN(end.getTime())) {
        return null;
    }

    let age = end.getFullYear() - birth.getFullYear();

    if (
        end.getMonth() < birth.getMonth() ||
        (end.getMonth() === birth.getMonth() &&
            end.getDate() < birth.getDate())
    ) {
        age--;
    }

    return age >= 0 ? age : null;
}

// Split "a | b | c" style values into a clean, de-duplicated list.
function splitValues(value, max = 250) {
    return [...new Set(
        String(value || '')
            .split(' | ')
            .map(item => cleanText(item, max))
            .filter(item => item && !/^Q\d+$/.test(item))
    )];
}

// Core record: one row per person (GROUP BY keeps the result small and fast).
function buildCoreQuery(includeRelatedOccupations) {
    const occupationPattern = includeRelatedOccupations
        ? '?person wdt:P31 wd:Q5; wdt:P106/wdt:P279* wd:Q11631.'
        : '?person wdt:P31 wd:Q5; wdt:P106 wd:Q11631.';

    return `
        SELECT ?person
            (SAMPLE(?personLabel) AS ?name)
            (SAMPLE(?desc) AS ?description)
            (SAMPLE(?birth) AS ?birthDate)
            (SAMPLE(?death) AS ?deathDate)
            (SAMPLE(?img) AS ?image)
            (SAMPLE(?art) AS ?article)
            (SAMPLE(?birthPlaceLabel) AS ?birthPlace)
            (GROUP_CONCAT(DISTINCT ?citizenshipLabel; SEPARATOR=" | ") AS ?citizenships)
            (GROUP_CONCAT(DISTINCT ?occupationLabel; SEPARATOR=" | ") AS ?occupations)
        WHERE {
            ${occupationPattern}
            OPTIONAL { ?person wdt:P569 ?birth. }
            OPTIONAL { ?person wdt:P570 ?death. }
            OPTIONAL { ?person wdt:P18 ?img. }
            OPTIONAL { ?person wdt:P27 ?citizenship. }
            OPTIONAL { ?person wdt:P106 ?occupation. }
            OPTIONAL { ?person wdt:P19 ?birthPlace. }
            OPTIONAL {
                ?art schema:about ?person;
                          schema:isPartOf <https://en.wikipedia.org/>.
            }
            OPTIONAL {
                ?person schema:description ?desc.
                FILTER(LANG(?desc) = "en")
            }
            SERVICE wikibase:label {
                bd:serviceParam wikibase:language "en,mul".
                ?person rdfs:label ?personLabel.
                ?citizenship rdfs:label ?citizenshipLabel.
                ?occupation rdfs:label ?occupationLabel.
                ?birthPlace rdfs:label ?birthPlaceLabel.
            }
        }
        GROUP BY ?person
    `;
}

// Extra details: agencies, missions, time in space. If this query fails the
// directory still loads with the core record.
function buildExtraQuery(includeRelatedOccupations) {
    const occupationPattern = includeRelatedOccupations
        ? '?person wdt:P31 wd:Q5; wdt:P106/wdt:P279* wd:Q11631.'
        : '?person wdt:P31 wd:Q5; wdt:P106 wd:Q11631.';

    return `
        SELECT ?person
            (GROUP_CONCAT(DISTINCT ?agencyLabel; SEPARATOR=" | ") AS ?agencies)
            (GROUP_CONCAT(DISTINCT ?missionLabel; SEPARATOR=" | ") AS ?missions)
            (COUNT(DISTINCT ?mission) AS ?missionCount)
            (MAX(?seconds) AS ?timeInSpace)
        WHERE {
            ${occupationPattern}
            OPTIONAL { ?person wdt:P108 ?agency. }
            OPTIONAL {
                { ?person wdt:P450 ?mission. }
                UNION
                { ?mission wdt:P1029 ?person. }
            }
            OPTIONAL { ?person p:P2873/psn:P2873/wikibase:quantityAmount ?seconds. }
            SERVICE wikibase:label {
                bd:serviceParam wikibase:language "en,mul".
                ?agency rdfs:label ?agencyLabel.
                ?mission rdfs:label ?missionLabel.
            }
        }
        GROUP BY ?person
    `;
}

async function runSparql(query) {
    const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
    const payload = await fetchJson(url, WIKIDATA_TIMEOUT_MS);
    return payload.results?.bindings || [];
}

function mapCoreRows(rows) {
    const people = new Map();

    for (const row of rows) {
        const id = wikidataId(row.person?.value);
        const name = cleanText(row.name?.value, 160);

        if (!id || !name || /^Q\d+$/.test(name)) continue;

        // Safety net: skip fictional characters that slipped through.
        if (/\bfictional\b/i.test(row.description?.value || '')) continue;

        const birthDate = isoDate(row.birthDate?.value);
        const deathDate = isoDate(row.deathDate?.value);
        const article = row.article?.value || '';
        const description = cleanText(row.description?.value, 400);
        const occupations = splitValues(row.occupations?.value, 160);

        people.set(id, {
            id,
            wikidataId: id,
            name,
            agency: '',
            role: occupations.join(' | ') || 'Astronaut / cosmonaut',
            nationality: splitValues(row.citizenships?.value, 120).join(' | '),
            mission: '',
            missionCount: null,
            timeInSpaceDays: null,
            birthPlace: cleanText(row.birthPlace?.value, 160).replace(/^Q\d+$/, ''),
            year: birthDate ? birthDate.slice(0, 4) : '',
            experience: null,
            birthDate,
            deathDate,
            age: getAge(birthDate, deathDate),
            image: row.image?.value || '',
            wikiUrl: article.startsWith(EN_WIKI) ? article : `https://www.wikidata.org/wiki/${id}`,
            description,
            bio: '',
            achievement: description,
            source: 'Wikidata'
        });
    }

    return people;
}

function mergeExtraRows(people, rows) {
    for (const row of rows) {
        const person = people.get(wikidataId(row.person?.value));
        if (!person) continue;

        person.agency = splitValues(row.agencies?.value, 160).join(' | ');
        person.mission = splitValues(row.missions?.value, 200)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .join(' | ');

        const count = Number(row.missionCount?.value);
        person.missionCount = Number.isFinite(count) && count > 0 ? count : null;

        const seconds = Number(row.timeInSpace?.value);
        person.timeInSpaceDays = Number.isFinite(seconds) && seconds > 0
            ? Math.round((seconds / 86400) * 10) / 10
            : null;
    }
}

// Fill missing portraits from each person's English Wikipedia lead image.
async function addWikipediaImages(people) {
    const byTitle = new Map();

    for (const person of people) {
        if (person.image || !person.wikiUrl.startsWith(EN_WIKI)) continue;

        try {
            const title = decodeURIComponent(person.wikiUrl.slice(EN_WIKI.length)).replace(/_/g, ' ');
            byTitle.set(title, person);
        } catch {
            // Skip titles that cannot be decoded.
        }
    }

    const titles = [...byTitle.keys()];
    const chunks = [];

    for (let i = 0; i < titles.length; i += 50) chunks.push(titles.slice(i, i + 50));

    let filled = 0;

    async function loadChunk(chunk) {
        const url =
            'https://en.wikipedia.org/w/api.php?action=query&prop=pageimages' +
            '&piprop=thumbnail&pithumbsize=500&pilimit=50&redirects=1&format=json' +
            `&titles=${encodeURIComponent(chunk.join('|'))}`;

        try {
            const payload = await fetchJson(url, 20000);
            const query = payload.query || {};
            const alias = new Map();

            for (const item of [...(query.normalized || []), ...(query.redirects || [])]) {
                alias.set(item.from, item.to);
            }

            const thumbs = new Map();

            for (const page of Object.values(query.pages || {})) {
                if (page.thumbnail?.source) thumbs.set(page.title, page.thumbnail.source);
            }

            for (const title of chunk) {
                let finalTitle = title;
                for (let hop = 0; hop < 3 && alias.has(finalTitle); hop++) {
                    finalTitle = alias.get(finalTitle);
                }

                const source = thumbs.get(finalTitle);
                if (source) {
                    byTitle.get(title).image = source;
                    filled++;
                }
            }
        } catch (error) {
            console.warn('Could not load a batch of Wikipedia images:', error.message);
        }
    }

    // Four requests at a time.
    for (let i = 0; i < chunks.length; i += 4) {
        await Promise.all(chunks.slice(i, i + 4).map(loadChunk));
    }

    console.log(`Added ${filled} missing portraits from Wikipedia.`);
}

// Fetch the full astronaut directory from Wikidata.
async function fetchDirectory(force = false) {
    if (!force && directoryCache.data && Date.now() - directoryCache.at < CACHE_MS) {
        return directoryCache.data;
    }

    if (directoryInFlight) return directoryInFlight;

    directoryInFlight = (async () => {
        try {
            const [coreResult, extraResult] = await Promise.allSettled([
                runSparql(buildCoreQuery(true)),
                runSparql(buildExtraQuery(true))
            ]);

            let coreRows;

            if (coreResult.status === "fulfilled") {
                coreRows = coreResult.value;
            } else {
                console.warn("Wikidata core query failed, retrying a simpler query:", coreResult.reason?.message);
                coreRows = await runSparql(buildCoreQuery(false));
            }

            const people = mapCoreRows(coreRows);

            if (!people.size) {
                throw new Error("Wikidata returned no astronaut records.");
            }

            if (extraResult.status === "fulfilled") {
                mergeExtraRows(people, extraResult.value);
            } else {
                console.warn("Mission/agency details could not be loaded:", extraResult.reason?.message);
            }

            const list = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));

            await addWikipediaImages(list);

            console.log(
                `Loaded ${list.length} astronauts |`,
                `${list.filter(p => p.image).length} with images |`,
                `${list.filter(p => p.mission).length} with missions`
            );

            // The C++ Astronaut class decides which records are valid.
            const validIds = await validateAstronauts(list);
            cppValidated = Boolean(validIds);
            const validated = validIds ? list.filter(person => validIds.has(person.id)) : list;

            directoryCache = { at: Date.now(), data: validated };
            return validated;
        } catch (error) {
            if (error.name === "TimeoutError" || error.name === "AbortError") {
                throw new Error("Wikidata timed out. Please try again shortly.");
            }

            throw error;
        } finally {
            directoryInFlight = null;
        }
    })();

    return directoryInFlight;
}

// The directory plus the facts the page shows about it.
// A refresh is only started when none is running and the last one is over a minute old.
async function getDirectory(wantsRefresh = false) {
    const canRefresh = wantsRefresh && !directoryInFlight && Date.now() - lastRefreshAt > REFRESH_COOLDOWN_MS;
    if (canRefresh) lastRefreshAt = Date.now();

    const people = await fetchDirectory(canRefresh);

    return {
        refreshed: canRefresh,
        count: people.length,
        fetchedAt: new Date(directoryCache.at).toISOString(),
        cached: Date.now() - directoryCache.at < CACHE_MS,
        cppValidated,
        people
    };
}

// Lazy image lookup for cards that still have no portrait. It follows the same
// route as the profile window: find the English Wikipedia article through
// Wikidata (even if the list record has no article link), then use the
// article's lead image, then the Wikidata image claim as a last resort.
const imageChecked = new Set();

async function getFallbackImage(person) {
    if (person.image) return person.image;
    if (imageChecked.has(person.id)) return '';

    try {
        let title = '';

        if (person.wikiUrl.startsWith(EN_WIKI)) {
            title = decodeURIComponent(person.wikiUrl.slice(EN_WIKI.length)).replace(/_/g, ' ');
        }

        let claimImage = '';

        if (!title) {
            const entityUrl =
                'https://www.wikidata.org/w/api.php?action=wbgetentities' +
                `&ids=${encodeURIComponent(person.id)}&props=sitelinks%7Cclaims` +
                '&sitefilter=enwiki&format=json';
            const entity = (await fetchJson(entityUrl)).entities?.[person.id];

            title = entity?.sitelinks?.enwiki?.title || '';

            const fileName = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
            if (fileName) {
                claimImage =
                    'https://commons.wikimedia.org/wiki/Special:FilePath/' +
                    encodeURIComponent(fileName);
            }

            if (title) {
                person.wikiUrl = EN_WIKI + encodeURIComponent(title.replace(/ /g, '_'));
            }
        }

        let image = '';

        if (title) {
            try {
                const summary = await fetchJson(
                    'https://en.wikipedia.org/api/rest_v1/page/summary/' +
                    encodeURIComponent(title.replace(/ /g, '_'))
                );
                image = summary.thumbnail?.source || summary.originalimage?.source || '';
            } catch {
                // Fall through to the Wikidata image, if there is one.
            }
        }

        image = image || claimImage;

        if (image) {
            person.image = image;
        } else {
            console.log(`No portrait found for ${person.name} (${person.id}).`);
        }

        imageChecked.add(person.id);
        return image;
    } catch (error) {
        console.warn(`Portrait lookup failed for ${person.name}:`, error.message);
        return '';
    }
}

// Portrait for one astronaut card (looked up lazily, after the list has loaded).
async function getAstronautImage(id) {
    const people = await fetchDirectory();
    const person = people.find(item => item.id === id);
    return person ? getFallbackImage(person) : "";
}

module.exports = { getDirectory, getAstronautImage };
