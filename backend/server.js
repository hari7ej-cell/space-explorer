"use strict";
const express = require("express");
const cors = require("cors");
const path = require("path");
const cheerio = require("cheerio");

const {
    getLatestDiscovery
} = require("./services/latestDiscovery");

const {
    getWikipediaPage
} = require("./services/wikipedia");

const {
    createTopics
} = require("./services/topicParser");

const {
    getTopicImages
} = require("./services/imageService");

const {
    extractStructuredData
} = require("./services/structuredData");

const {
    processPlanet
} = require("./services/cppService");

const homeRoutes = require("./routes/home");
const { notFound, serverError } = require("./routes/errors");

const app = express();

app.use(cors());
app.use(express.json());
const frontendDir = path.join(__dirname, "../frontend");
app.use(express.static(frontendDir));

// Home page data (image of the day, latest updates)
app.use(homeRoutes);

const PORT = 3000;

// ======================================================
// CACHE CONFIGURATION
// ======================================================

const CACHE_TTL = 30 * 60 * 1000;
const planetCache = new Map();
const pendingRequests = new Map();
const wikiResponseCache = new Map();

function getCachedPlanet(name) {
    const cached = planetCache.get(name);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL) {
        planetCache.delete(name);
        return null;
    }
    return cached.data;
}

function setCachedPlanet(name, data) {
    planetCache.set(name, {
        data,
        timestamp: Date.now()
    });
}

// ======================================================
// NASA 3D MODEL CONFIGURATION
// ======================================================

function getModel3D(entityName) {
    const normalized = String(entityName || "")
        .replace(/\s*\([^)]*\)\s*/g, " ")
        .replace(/^\d+\s+/i, "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");

    const models = {
        sun: { name: "Sun", url: "https://solarsystem.nasa.gov/gltf_embed/2352/" },
        mercury: { name: "Mercury", url: "https://solarsystem.nasa.gov/gltf_embed/2369/" },
        venus: { name: "Venus", url: "https://solarsystem.nasa.gov/gltf_embed/2342/" },
        earth: { name: "Earth", url: "https://solarsystem.nasa.gov/gltf_embed/2393/" },
        mars: { name: "Mars", url: "https://solarsystem.nasa.gov/gltf_embed/2372/" },
        jupiter: { name: "Jupiter", url: "https://solarsystem.nasa.gov/gltf_embed/2375/" },
        saturn: { name: "Saturn", url: "https://solarsystem.nasa.gov/gltf_embed/2355/" },
        uranus: { name: "Uranus", url: "https://solarsystem.nasa.gov/gltf_embed/2344/" },
        neptune: { name: "Neptune", url: "https://solarsystem.nasa.gov/gltf_embed/2364/" },
        bennu: { name: "Bennu", url: "https://solarsystem.nasa.gov/gltf_embed/2403/" }
    };

    const model = models[normalized];
    if (!model) {
        return { available: false, name: entityName, url: null, format: null };
    }

    return {
        available: true,
        name: model.name,
        url: model.url,
        format: "iframe"
    };
}

const routeTypes = new Set([
    "planet", "galaxy", "astronaut", "mission", "black-hole",
    "star", "moon", "asteroid", "comet", "deep-sky-object", "space-entity"
]);

// ======================================================
// MAIN PLANET / SPACE ENTITY API
// ======================================================

app.get("/api/planet/:name", async (req, res) => {
    const startTime = Date.now();

    try {
        const name = String(req.params.name || "").trim();

        if (!name) {
            return res.status(400).json({ error: "Space entity name is required." });
        }

        const cacheKey = name.toLowerCase();

        const cached = getCachedPlanet(cacheKey);
        if (cached) {
            res.set("Cache-Control", "no-store");
            return res.json(cached);
        }

        if (pendingRequests.has(cacheKey)) {
            const result = await pendingRequests.get(cacheKey);
            res.set("Cache-Control", "no-store");
            return res.json(result);
        }

        const requestPromise = buildPlanet(name);
        pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            setCachedPlanet(cacheKey, result);
            res.set("Cache-Control", "no-store");
            return res.json(result);
        } finally {
            pendingRequests.delete(cacheKey);
        }

    } catch (error) {
        console.error("SPACE ENTITY API ERROR:", error);

        if (error.code === "SPACE_ENTITY_NOT_FOUND") {
            return res.status(404).json({
                available: false,
                code: error.code,
                error: error.message
            });
        }

        return res.status(502).json({
            available: false,
            error: error.message || "Unable to load space entity."
        });
    }
});

// ======================================================
// DISAMBIGUATION, CLASSIFICATION & SCORING
// ======================================================

function normalizeEntityName(value) {
    return String(value || "")
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .trim();
}

function stripParentheses(title) {
    return String(title || "").replace(/\s*\([^)]*\)\s*/g, "").trim();
}

function getTitleQualifier(title) {
    const match = String(title || "").match(/\(([^)]+)\)/);
    return match ? match[1].toLowerCase().trim() : "";
}

// Direct mappings for known ambiguous or person search queries to eliminate extra search requests
const DIRECT_SPACE_ALIASES = {
    "mercury": "Mercury (planet)",
    "planet mercury": "Mercury (planet)",
    "project mercury": "Project Mercury",
    "mercury mission": "Project Mercury",
    "mission mangal": "Mars Orbiter Mission",
    "mangalyaan": "Mars Orbiter Mission",
    "mars orbiter mission": "Mars Orbiter Mission",
    "kalpana chawla": "Kalpana Chawla",
    "rakesh sharma": "Rakesh Sharma",
    "yuri gagarin": "Yuri Gagarin",
    "neil armstrong": "Neil Armstrong",
    "buzz aldrin": "Buzz Aldrin",
    "sunita williams": "Sunita Williams",
    "chris hadfield": "Chris Hadfield",
    "michael collins": "Michael Collins (astronaut)",
    "john glenn": "John Glenn",
    "venus": "Venus",
    "earth": "Earth",
    "mars": "Mars",
    "jupiter": "Jupiter",
    "saturn": "Saturn",
    "uranus": "Uranus",
    "neptune": "Neptune",
    "pluto": "Pluto",
    "ceres": "Ceres (dwarf planet)",
    "eris": "Eris (dwarf planet)",
    "haumea": "Haumea",
    "makemake": "Makemake",
    "moon": "Moon",
    "sun": "Sun",
    "solar system": "Solar System",
    "io": "Io (moon)",
    "europa": "Europa (moon)",
    "ganymede": "Ganymede (moon)",
    "callisto": "Callisto (moon)",
    "titan": "Titan (moon)",
    "enceladus": "Enceladus",
    "triton": "Triton (moon)",
    "charon": "Charon (moon)",
    "phobos": "Phobos (moon)",
    "deimos": "Deimos (moon)",
    "bennu": "101955 Bennu",
    "halley's comet": "Halley's Comet",
    "andromeda galaxy": "Andromeda Galaxy",
    "milky way": "Milky Way",
    "orion nebula": "Orion Nebula",
    "crab nebula": "Crab Nebula",
    "iss": "International Space Station",
    "jwst": "James Webb Space Telescope",
    "hubble": "Hubble Space Telescope",
    "voyager 1": "Voyager 1",
    "voyager 2": "Voyager 2",
    "apollo 11": "Apollo 11",
    "chandrayaan 3": "Chandrayaan-3"
};

const NON_SPACE_QUALIFIERS = /\b(element|metal|mythology|deity|god|goddess|religion|film|movie|drama film|hindi film|indian film|tv series|television|sitcom|episode|album|song|band|musician|singer|actor|actress|novel|book|comic|comics|character|fictional|video game|game|board game|car|automobile|vehicle|motorcycle|bicycle|train|locomotive|ship|vessel|submarine|aircraft|airline|airport|brand|company|corporation|bank|retailer|restaurant|hotel|software|programming|language|operating system|cryptocurrency|city|town|village|state|province|county|country|island|river|lake|mountain|volcano|animal|plant|insect|bird|fish|mammal|reptile|fungus|species|genus|family|disease|syndrome|virus|bacteria|medicine|drug|chemical|compound|mineral|acid|currency|coin|newspaper|magazine|journal|sport|team|club|league|football|cricket|basketball|baseball|tennis|golf|rugby|politician|king|queen|emperor|prince|princess|duke|general|admiral|saint|pope|bishop|painter|sculptor|artist|philosopher|writer|poet|author|economist|lawyer|judge)\b/i;

const NON_SPACE_DESCRIPTION_PATTERNS = [
    /\bchemical element\b/i,
    /\btransition metal\b/i,
    /\batomic number\b/i,
    /\bperiodic table\b/i,
    /\b(roman|greek|norse|egyptian|hindu|celtic|mesopotamian|babylonian|aztec|mayan) (god|goddess|deity|mythology|mythological|religion)\b/i,
    /\b(film|movie|motion picture|drama film|bollywood film|indian film|television series|tv series|miniseries|sitcom|soap opera|anime|manga|video game|board game|card game|role-playing game|comic book|superhero|fictional character)\b/i,
    /\b(studio album|live album|compilation album|extended play|song by|single by|record label|rock band|pop band|heavy metal band|music group|musical group|singer-songwriter|rapper)\b/i,
    /\b(automobile|car marque|car model|motor vehicle|automotive|motorcycle|locomotive|passenger ship|cruise ship|warship|aircraft carrier)\b/i,
    /\b(multinational|publicly traded|company|corporation|conglomerate|retailer|commercial bank|investment bank|insurance company|airline|fast food|restaurant chain)\b/i,
    /\b(sovereign state|country in|capital city|city in|town in|village in|municipality|province of|state of the united states|county in|river in|mountain range)\b/i,
    /\b(genus|species|family|order|phylum|clade) of (plants|flowering plants|trees|animals|insects|beetles|butterflies|moths|spiders|birds|fish|amphibians|reptiles|mammals|rodents|primates|fungi|bacteria)\b/i,
    /\b(programming language|operating system|web browser|software application|cryptocurrency|blockchain)\b/i,
    /\bwikimedia (disambiguation|list|category|template|project)\b/i
];

function classifyWikipediaCandidate(page) {
    const title = String(page.title || "");
    const baseTitle = stripParentheses(title).toLowerCase();
    const qualifier = getTitleQualifier(title);
    const description = String(
        page.description || page.pageprops?.["wikibase-shortdesc"] || ""
    ).toLowerCase();

    const extract = String(page.extract || "").toLowerCase();
    const firstSentences = extract.split(/(?<=\.)\s+/).slice(0, 2).join(" ") || extract.slice(0, 400);
    const lead = extract.slice(0, 1200);

    const categories = (page.categories || []).map(item =>
        String(item.title || "")
            .replace(/^Category:/i, "")
            .toLowerCase()
    );
    const categoryText = categories.join(" | ");

    if (
        page.pageprops?.disambiguation !== undefined ||
        /\bdisambiguation\b/i.test(title) ||
        /\bdisambiguation\b/i.test(description) ||
        /\bdisambiguation\b/i.test(categoryText) ||
        /^(list of|lists of|index of|outline of|timeline of|glossary of|category:|template:|portal:)\b/i.test(title) ||
        /\b(films|movies|indian films|hindi-language films|2019 films)\b/i.test(categoryText)
    ) {
        return null;
    }

    if (
        qualifier &&
        NON_SPACE_QUALIFIERS.test(qualifier) &&
        !/\b(space|astronaut|cosmonaut|moon|planet|exoplanet|dwarf planet|star|galaxy|nebula|asteroid|comet|astronomy|spacecraft|rover|probe|satellite|rocket|telescope|constellation)\b/i.test(qualifier)
    ) {
        return null;
    }

    const isAstronautCandidate = /\b(astronauts?|cosmonauts?|taikonauts?|vyomanauts?|spaceflight|nasa astronaut|space shuttle mission specialist)\b/i.test(
        `${qualifier} | ${description} | ${firstSentences} | ${categoryText} | ${lead}`
    );

    if (!isAstronautCandidate) {
        for (const pattern of NON_SPACE_DESCRIPTION_PATTERNS) {
            if (pattern.test(description) || pattern.test(firstSentences) || pattern.test(categoryText)) {
                return null;
            }
        }

        if (
            /\b(is a chemical element|is a metal|is a film|is a movie|is a drama film|is a 2019 film|is a genus|is a species|is a song|is an album|is a band|is a video game|is a fictional|is a mythological|in roman mythology|in greek mythology|is a city|is a town|is a country|is a company|is a brand|is a car|is a automobile|is a fruit|is a plant|is an animal|is a sport)\b/i.test(firstSentences)
        ) {
            return null;
        }
    }

    const identityText = `${baseTitle} | ${qualifier} | ${description} | ${firstSentences} | ${categoryText}`;
    const fullContext = `${identityText} | ${lead}`;

    // ==========================================
    // CLASSIFY SPACE ENTITIES (Order matters)
    // ==========================================

    if (isAstronautCandidate) {
        return "Astronaut";
    }

    if (/\b(space stations?|orbital stations?)\b/i.test(identityText)) {
        return "Space Station";
    }

    if (
        /\b(spaceflight|space missions?|lunar missions?|mars missions?|venus missions?|solar missions?|planetary missions?|crewed missions?|uncrewed missions?|apollo program|project mercury|project gemini|artemis program|voyager program|pioneer program|mariner program|viking program|venera|chandrayaan|gaganyaan|mars orbiter|aditya-l1|space shuttle|space probes?|rovers? on mars|lunar rovers?|planetary rovers?|space telescopes?|space observatories|artificial satellites?|earth observation satellites?|communications satellites?|navigation satellites?|launch vehicles?|carrier rockets?|space launch|crew dragon|starship|falcon 9|falcon heavy|saturn v|ariane|soyuz|shenzhou|tiangong)\b/i.test(identityText) ||
        (/\b(spacecraft|space probe|lunar module|command module|orbiter|lander|rover|flyby|space telescope|space observatory|launch vehicle|carrier rocket|human spaceflight|robotic spaceflight|sample-return mission)\b/i.test(identityText) &&
         /\b(nasa|esa|isro|roscosmos|jaxa|cnsa|spacex|space|lunar|moon|mars|venus|mercury|jupiter|saturn|solar|orbit|astronaut|cosmonaut|launch|planetary|satellite|asteroid|comet)\b/i.test(fullContext))
    ) {
        if (/\b(space telescopes?|space observatories)\b/i.test(identityText)) {
            return "Spacecraft";
        }
        return "Mission";
    }

    if (/\b(magnetars?|soft gamma repeaters?|anomalous x-ray pulsars?)\b/i.test(identityText)) {
        return "Magnetar";
    }
    if (/\bpulsars?\b/i.test(identityText)) {
        return "Pulsar";
    }
    if (/\b(black holes?|supermassive black holes?|stellar black holes?|intermediate-mass black holes?|micro black holes?|event horizon|sagittarius a\*|messier 87|cygnus x-1|ton 618)\b/i.test(identityText)) {
        return "Black Hole";
    }
    if (/\b(neutron stars?)\b/i.test(identityText)) {
        return "Neutron Star";
    }
    if (/\b(white dwarfs?)\b/i.test(identityText)) {
        return "White Dwarf";
    }
    if (/\b(brown dwarfs?|sub-brown dwarfs?)\b/i.test(identityText)) {
        return "Brown Dwarf";
    }
    if (/\b(quasars?|blazars?|active galactic nuclei|active galactic nucleus)\b/i.test(identityText)) {
        return "Quasar";
    }
    if (/\b(supernov(a|ae|as)|hypernov(a|ae|as)|kilonov(a|ae|as)|nov(a|ae|as)|supernova remnants?)\b/i.test(identityText)) {
        return "Supernova";
    }

    if (/\b(nebula|nebulae|planetary nebulae|diffuse nebulae|reflection nebulae|emission nebulae|dark nebulae|h ii regions?|pillars of creation)\b/i.test(identityText)) {
        return "Nebula";
    }
    if (/\b(star clusters?|globular clusters?|open clusters?|pleiades|hyades|omega centauri)\b/i.test(identityText)) {
        return "Deep Sky Object";
    }

    if (
        /\b(galax(y|ies)|spiral galaxies|barred spiral galaxies|elliptical galaxies|lenticular galaxies|irregular galaxies|dwarf galaxies|ring galaxies|galaxy clusters?|galaxy groups?|galaxy filaments?|superclusters?|milky way|magellanic clouds?|local group|lankiaea)\b/i.test(identityText)
    ) {
        return "Galaxy";
    }

    if (
        /\b(exoplanets?|extrasolar planets?|rogue planets?|super-earths?|hot jupiters?|mini-neptunes?|circumbinary planets?)\b/i.test(identityText) ||
        /\b(planet orbiting|planet outside|extrasolar)\b/i.test(description + " " + firstSentences)
    ) {
        return "Exoplanet";
    }

    if (
        /\b(dwarf planets?|plutoids?|pluto|ceres|eris|haumea|makemake|sedna|quaoar|orcus|gonggong)\b/i.test(identityText) &&
        /\b(dwarf planet|trans-neptunian|asteroid belt|kuiper belt|plutoid|solar system)\b/i.test(fullContext)
    ) {
        return "Dwarf Planet";
    }

    if (
        qualifier === "moon" ||
        baseTitle === "moon" ||
        /\b(natural satellites?|moons? of|planetary satellites?|galilean moons?|regular moons?|irregular moons?)\b/i.test(identityText) ||
        (/\b(moon|natural satellite)\b/i.test(description + " " + firstSentences) &&
         /\b(orbit|planet|jupiter|saturn|uranus|neptune|mars|earth|pluto|solar system)\b/i.test(fullContext))
    ) {
        return "Moon";
    }

    if (
        /\b(asteroids?|minor planets?|near-earth objects?|main-belt asteroids?|trojan asteroids?|centaurs|trans-neptunian objects?|kuiper belt objects?|asteroid belt|kuiper belt|meteoroids?|meteors?|meteorites?|bolides?)\b/i.test(identityText)
    ) {
        return "Asteroid";
    }

    if (
        /\b(comets?|periodic comets?|non-periodic comets?|halley-type comets?|sungrazing comets?|oort cloud|interstellar objects?)\b/i.test(identityText)
    ) {
        return "Comet";
    }

    if (
        qualifier === "planet" ||
        baseTitle === "planet" ||
        /\b(planets of the solar system|terrestrial planets|gas giants|ice giants|solar system planets)\b/i.test(categoryText) ||
        (/\bplanets?\b/i.test(description + " " + firstSentences) &&
         !/\bnamed (after|for) the planet\b/i.test(firstSentences) &&
         /\b(solar system|orbit|sun|terrestrial|gas giant|ice giant|astronomy|innermost|first planet|second planet|third planet|fourth planet|fifth planet|sixth planet|seventh planet|eighth planet|astronomical body|celestial body)\b/i.test(fullContext))
    ) {
        return "Planet";
    }

    if (
        qualifier === "star" ||
        qualifier === "constellation" ||
        baseTitle === "sun" ||
        baseTitle === "star" ||
        /\b(stars|hypergiants|supergiants|red giants|blue giants|main-sequence stars|binary stars|multiple star systems|variable stars|red dwarfs|yellow dwarfs|solar-type stars|constellations|zodiac constellations)\b/i.test(categoryText) ||
        (/\b(star|sun|red supergiant|blue supergiant|yellow hypergiant|yellow dwarf|red dwarf|binary star|triple star|star system|constellation)\b/i.test(description + " " + firstSentences) &&
         /\b(astronomy|constellation|luminosity|solar|light-years|parsecs|spectral|stellar|galaxy|night sky|apparent magnitude|main-sequence)\b/i.test(fullContext))
    ) {
        return "Star";
    }

    if (
        /\b(astronomical objects?|celestial bodies|outer space|solar system|astrophysics|astronomy|physical cosmology|space agencies|national space programs)\b/i.test(categoryText) &&
        /\b(space|astronomy|astronomical|astrophysics|cosmology|cosmic|celestial|solar system|universe|galaxy|star|planet|orbit|spacecraft|spaceflight|space agency|nasa|isro|esa|roscosmos|jaxa)\b/i.test(description + " " + firstSentences)
    ) {
        return "Space Entity";
    }

    return null;
}

function scoreWikipediaCandidate(page, requestedRaw, entityType) {
    const title = String(page.title || "");
    const baseTitle = stripParentheses(title);
    const qualifier = getTitleQualifier(title);
    const description = String(
        page.description || page.pageprops?.["wikibase-shortdesc"] || ""
    ).toLowerCase();
    const extract = String(page.extract || "").toLowerCase();

    const normalizedRaw = normalizeEntityName(requestedRaw);
    const normalizedTitle = normalizeEntityName(title);
    const normalizedBaseTitle = normalizeEntityName(baseTitle);

    let score = 0;

    if (
        normalizedBaseTitle === normalizedRaw ||
        normalizedTitle === normalizedRaw
    ) {
        score += 150;
    } else if (
        normalizedBaseTitle.startsWith(normalizedRaw) ||
        normalizedTitle.startsWith(normalizedRaw)
    ) {
        score += 90;
    } else if (
        normalizedRaw &&
        (normalizedBaseTitle.includes(normalizedRaw) || normalizedTitle.includes(normalizedRaw))
    ) {
        score += 70;
    }

    // Heavy penalty for asteroids when searching for a person/astronaut by name
    if (
        entityType === "Asteroid" &&
        requestedRaw.split(/\s+/).length >= 2 &&
        !requestedRaw.toLowerCase().includes("asteroid") &&
        !title.toLowerCase().includes("astronaut")
    ) {
        score -= 300;
    }

    // Heavy boost if searching a full person name and entity is Astronaut
    if (
        entityType === "Astronaut" &&
        requestedRaw.split(/\s+/).length >= 2
    ) {
        score += 150;
    }

    const typePriority = {
        "Astronaut": 50,
        "Planet": 35,
        "Dwarf Planet": 32,
        "Moon": 30,
        "Star": 28,
        "Black Hole": 28,
        "Magnetar": 28,
        "Pulsar": 28,
        "Neutron Star": 28,
        "Quasar": 28,
        "Supernova": 28,
        "White Dwarf": 26,
        "Brown Dwarf": 26,
        "Galaxy": 28,
        "Nebula": 26,
        "Exoplanet": 26,
        "Asteroid": 10,
        "Comet": 25,
        "Mission": 25,
        "Spacecraft": 25,
        "Space Station": 25,
        "Deep Sky Object": 22,
        "Space Entity": 15
    };
    score += typePriority[entityType] || 15;

    return score;
}

// ======================================================
// SINGLE-CALL OPTIMIZED WIKIPEDIA RESOLUTION (Prevents 429)
// ======================================================

async function resolveWikipediaEntity(searchName) {
    const cleanName = String(searchName || "").trim().replace(/\s+/g, " ");

    if (!cleanName) {
        throw new Error("Space entity name is required.");
    }

    const lowerKey = cleanName.toLowerCase();
    const mappedAlias = DIRECT_SPACE_ALIASES[lowerKey];
    const targetTitle = mappedAlias || cleanName;

    // Check Cache first to avoid hitting Wikipedia API limits (429)
    const cacheKey = targetTitle.toLowerCase();
    if (wikiResponseCache.has(cacheKey)) {
        return wikiResponseCache.get(cacheKey);
    }

    // Use a single MediaWiki action=query search API call (limit 10)
    const apiURL = new URL("https://en.wikipedia.org/w/api.php");
    apiURL.search = new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: targetTitle,
        gsrlimit: "10",
        prop: "pageprops|categories|extracts|description",
        cllimit: "max",
        exintro: "1",
        explaintext: "1",
        exlimit: "10",
        format: "json"
    });

    const response = await fetch(apiURL, {
        headers: {
            "User-Agent": "SpaceExplorer/1.0 (Educational Space Exploration App; contact@spaceexplorer.local)"
        },
        signal: AbortSignal.timeout(12000)
    });

    if (response.status === 429) {
        throw new Error("Wikipedia rate limit reached (HTTP 429). Please wait 30 seconds before searching again.");
    }
    if (!response.ok) {
        throw new Error(`Wikipedia request failed with status ${response.status}`);
    }

    const data = await response.json();
    const rawPages = Object.values(data.query?.pages || {}).filter(p => !p.missing && p.ns === 0);

    const validCandidates = [];

    for (const page of rawPages) {
        const type = classifyWikipediaCandidate(page);
        if (!type) continue;

        let score = scoreWikipediaCandidate(page, cleanName, type);

        if (mappedAlias && page.title.toLowerCase() === mappedAlias.toLowerCase()) {
            score += 150;
        }

        const normReq = normalizeEntityName(cleanName);
        const normTitle = normalizeEntityName(page.title);
        const normExtract = normalizeEntityName(String(page.extract || "").slice(0, 400));

        const isRelevant =
            normTitle.includes(normReq) ||
            normReq.includes(normTitle) ||
            normExtract.includes(normReq);

        if (isRelevant && score >= 45) {
            validCandidates.push({
                title: page.title,
                type,
                score
            });
        }
    }

    if (!validCandidates.length) {
        const error = new Error(
            `"${cleanName}" is not a recognized space entity, space mission, or astronaut. Please search for a valid space-related topic.`
        );
        error.code = "SPACE_ENTITY_NOT_FOUND";
        throw error;
    }

    validCandidates.sort((a, b) => b.score - a.score);
    const selected = validCandidates[0];

    console.log("----------------------------------");
    console.log("Requested entity:", cleanName);
    console.log("Selected article:", selected.title);
    console.log("Entity type:", selected.type);
    console.log("Candidate score:", selected.score);
    console.log("----------------------------------");

    const wiki = await getWikipediaPage(selected.title);

    if (!wiki || !wiki.html) {
        throw new Error("Wikipedia returned an empty article.");
    }

    const result = {
        ...wiki,
        entityType: selected.type
    };

    wikiResponseCache.set(cacheKey, result);
    return result;
}

// ======================================================
// BUILD PLANET RESPONSE
// ======================================================

async function buildPlanet(name) {
    const totalStart = Date.now();

    console.log("");
    console.log("======================================");
    console.log(`Loading space entity: ${name}`);
    console.log("======================================");

    const wikiStart = Date.now();
    const wiki = await resolveWikipediaEntity(name);
    console.log(`Wikipedia: ${wiki.title} (${Date.now() - wikiStart} ms)`);

    const parseStart = Date.now();
    const topics = createTopics(wiki.html);
    const details = extractStructuredData(wiki.html);
    console.log(`Topic parsing: ${Date.now() - parseStart} ms`);
    console.log(`Topics returned: ${topics.length}`);

    const imageStart = Date.now();
    let images = [];

    try {
        images = await getTopicImages(wiki.title, topics);
        if (!Array.isArray(images)) {
            images = [];
        }
    } catch (error) {
        console.error("TOPIC IMAGE ERROR:", error.message);
        images = [];
    }

    console.log(`Images returned: ${images.length} (${Date.now() - imageStart} ms)`);

    const cppStart = Date.now();
    const entityType = wiki.entityType;
    if (!entityType) {
        throw new Error("This article is not a supported space entity.");
    }

    const cppInput = {
        type: entityType,
        name: wiki.title,
        wikipediaUrl: wiki.url,
        details,
        topics,
        images
    };

    const cppResult = await processPlanet(cppInput);
    console.log(`C++ processing: ${Date.now() - cppStart} ms`);

    const safeCppResult = cppResult && typeof cppResult === "object" ? cppResult : {};

    const result = {
        ...safeCppResult,
        entity: {
            name: wiki.title,
            type: safeCppResult.type || entityType
        },
        summary: safeCppResult.summary || "Space entity information is available below.",
        topics,
        details,
        images,
        heroImage: safeCppResult.heroImage || null,
        wikipediaUrl: wiki.url,
        model3D: getModel3D(wiki.title)
    };

    console.log(`TOTAL: ${Date.now() - totalStart} ms`);
    console.log("======================================");

    return result;
}

app.get("/:category/:name", (req, res, next) => {
    if (!routeTypes.has(req.params.category)) return next();
    res.sendFile(path.join(frontendDir, "planet-detail.html"));
});

app.get("/api/latest-discovery", async (req, res) => {
    try {
        const discovery = await getLatestDiscovery();
        res.set("Cache-Control", "no-store");
        return res.json(discovery);
    } catch (error) {
        console.error("LATEST DISCOVERY ERROR:", error);
        return res.status(500).json({
            error: error.message
        });
    }
});

app.get("/api/cache", (req, res) => {
    const planets = [];
    for (const [name, value] of planetCache) {
        planets.push({
            name,
            age: Date.now() - value.timestamp
        });
    }
    res.json({
        cachedPlanets: planets
    });
});

app.delete("/api/cache", (req, res) => {
    planetCache.clear();
    wikiResponseCache.clear();
    res.json({
        message: "Planet cache cleared."
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "Space Explorer Backend"
    });
});

// Friendly error pages (must stay after every other route)
app.use(notFound);
app.use(serverError);

app.listen(PORT, () => {
    console.log(`Space Explorer backend running at http://localhost:${PORT}`);
});