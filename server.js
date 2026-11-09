'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { URL } = require('node:url');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 3000);
const CACHE_MS = 6 * 60 * 60 * 1000;
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

const EN_WIKI = 'https://en.wikipedia.org/wiki/';
const WIKIDATA_TIMEOUT_MS = 65000;
const WIKIPEDIA_TIMEOUT_MS = 12000;

let directoryCache = { at: 0, data: null };
let directoryInFlight = null;
let lastRefreshAt = 0;
const REFRESH_COOLDOWN_MS = 60 * 1000;
const profileCache = new Map();
let cppAvailable = false;

const cppExe = path.join(
  ROOT,
  process.platform === 'win32' ? 'astronaut_bridge.exe' : 'astronaut_bridge'
);

function compileCppBridge() {
  const source = path.join(ROOT, 'cpp', 'main.cpp');

  if (!fs.existsSync(source)) {
    console.warn('C++ bridge source not found. Using Node.js only.');
    return;
  }

  try {
    execFileSync('g++', ['-std=c++17', '-O2', source, '-o', cppExe], {
      stdio: 'pipe'
    });
    cppAvailable = true;
    console.log('C++ Astronaut bridge compiled successfully.');
  } catch {
    cppAvailable = false;
    console.warn('C++ bridge could not be compiled. Node.js will still run.');
  }
}

compileCppBridge();

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

async function fetchJson(url, timeout = WIKIPEDIA_TIMEOUT_MS) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SpaceExplorerStudentProject/1.0 (educational project)'
    }
  });

  if (!response.ok) {
    throw new Error(`Source returned HTTP ${response.status}`);
  }

  return response.json();
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

      if (coreResult.status === 'fulfilled') {
        coreRows = coreResult.value;
      } else {
        console.warn('Wikidata core query failed, retrying a simpler query:', coreResult.reason?.message);
        coreRows = await runSparql(buildCoreQuery(false));
      }

      const people = mapCoreRows(coreRows);

      if (!people.size) {
        throw new Error('Wikidata returned no astronaut records.');
      }

      if (extraResult.status === 'fulfilled') {
        mergeExtraRows(people, extraResult.value);
      } else {
        console.warn('Mission/agency details could not be loaded:', extraResult.reason?.message);
      }

      const list = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));

      await addWikipediaImages(list);

      console.log(
        `Loaded ${list.length} astronauts |`,
        `${list.filter(p => p.image).length} with images |`,
        `${list.filter(p => p.mission).length} with missions`
      );

      const validated = cppAvailable ? await validateWithCpp(list) : list;

      directoryCache = { at: Date.now(), data: validated };
      profileCache.clear();
      return validated;
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('Wikidata timed out. Please try again shortly.');
      }

      throw error;
    } finally {
      directoryInFlight = null;
    }
  })();

  return directoryInFlight;
}

// Validate records with the existing C++ bridge.
function validateWithCpp(people) {
  return new Promise((resolve) => {
    const child = spawn(cppExe, [], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let finished = false;
    let timer;

    function done() {
      if (finished) return;

      finished = true;
      if (timer) clearTimeout(timer);

      const validIds = new Set(
        stdout.split(/\r?\n/)
          .filter(Boolean)
          .map(line => line.split('\t')[0])
      );

      if (!validIds.size) {
        console.warn('C++ bridge returned no valid records; skipping C++ filtering.');
        resolve(people);
        return;
      }

      resolve(people.filter(person => validIds.has(person.id)));
    }

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
    });

    child.on('error', done);
    child.on('close', done);

    const input = people.map(person => [
      person.id,
      person.name,
      person.agency || 'Not listed',
      person.nationality || 'Not listed',
      person.mission || 'Not listed',
      person.role || 'Astronaut',
      person.experience ?? 'Not listed'
    ].map(value => cleanText(value, 250)).join('\t')).join('\n') + '\n';

    child.stdin.end(input);

    timer = setTimeout(() => {
      try {
        child.kill();
      } catch {}

      done();
    }, 15000);

    timer.unref?.();
  });
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

// Load the Wikipedia profile and structured mission data.
async function getWikipediaProfile(person) {
  const id = person.wikidataId || person.id;
  const wikidataUrl = `https://www.wikidata.org/wiki/${encodeURIComponent(id)}`;

  const cached = profileCache.get(id);

  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.data;
  }

  const fallback = {
    ...person,
    wikiUrl: person.wikiUrl || wikidataUrl,
    bio: person.bio || person.description || '',
    image: person.image || ''
  };

  try {
    const entityUrl =
      'https://www.wikidata.org/w/api.php?action=wbgetentities' +
      `&ids=${encodeURIComponent(id)}&props=sitelinks&sitefilter=enwiki&format=json`;

    const entityPayload = await fetchJson(entityUrl);
    const entity = entityPayload.entities?.[id];
    const title = entity?.sitelinks?.enwiki?.title;

    let summary = {};

    if (title) {
      const summaryUrl =
        'https://en.wikipedia.org/api/rest_v1/page/summary/' +
        encodeURIComponent(title.replace(/ /g, '_'));

      try {
        summary = await fetchJson(summaryUrl);
      } catch {
        // Keep using the structured Wikidata data if Wikipedia is unavailable.
      }
    }

    const detailsUrl =
      'https://www.wikidata.org/w/api.php?action=wbgetentities' +
      `&ids=${encodeURIComponent(id)}&props=claims&format=json`;

    let claims = {};

    try {
      const detailsPayload = await fetchJson(detailsUrl);
      claims = detailsPayload.entities?.[id]?.claims || {};
    } catch {
      // The profile can still load without optional claims.
    }

    const claimDate = property => {
      const value = claims[property]?.[0]?.mainsnak?.datavalue?.value?.time;
      return isoDate(value);
    };

    // P450 is Wikidata's astronaut mission property.
    let missionHistory = person.mission || '';

    try {
      const missionIds = [
        ...new Set(
          (claims.P450 || [])
            .map(claim => claim.mainsnak?.datavalue?.value?.id)
            .filter(Boolean)
        )
      ];

      if (missionIds.length) {
        const params = new URLSearchParams({
          action: 'wbgetentities',
          ids: missionIds.join('|'),
          props: 'labels',
          languages: 'en',
          format: 'json'
        });

        const missionPayload = await fetchJson(
          `https://www.wikidata.org/w/api.php?${params.toString()}`
        );

        const names = missionIds
          .map(missionId =>
            missionPayload.entities?.[missionId]?.labels?.en?.value
          )
          .filter(Boolean);

        if (names.length) {
          missionHistory = [...new Set(names)].join(' | ');
        }
      }
    } catch (error) {
      console.warn(
        `Could not load mission history for ${id}:`,
        error.message
      );
    }

    const imageClaim = claims.P18?.[0]?.mainsnak?.datavalue?.value;

    const imageFromClaim = imageClaim
      ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageClaim)}`
      : '';

    const result = {
      ...person,
      pageTitle: summary.title || title || person.name,
      bio: summary.extract || person.description ||
        'No biography summary is available.',
      description: person.description || summary.description || '',
      image:
        summary.thumbnail?.source ||
        summary.originalimage?.source ||
        person.image ||
        imageFromClaim ||
        '',
      mission: missionHistory,
      birthDate: person.birthDate || claimDate('P569'),
      deathDate: person.deathDate || claimDate('P570'),
      wikiUrl:
        summary.content_urls?.desktop?.page ||
        (title
          ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
          : wikidataUrl),
      wikidataUrl,
      source: 'Wikidata + Wikipedia',
      profileError: ''
    };

    result.year = result.birthDate
      ? result.birthDate.slice(0, 4)
      : person.year;

    result.age = getAge(result.birthDate, result.deathDate);

    // Flight experience is not the same as age.
    // Keep it unavailable until verified flight-duration data exists.
    result.experience = person.experience ?? null;

    profileCache.set(id, {
      at: Date.now(),
      data: result
    });

    return result;
  } catch (error) {
    return {
      ...fallback,
      wikidataUrl,
      profileError:
        error.name === 'TimeoutError' || error.name === 'AbortError'
          ? 'The biography request timed out. Please try again.'
          : 'Wikipedia information is temporarily unavailable.'
    };
  }
}

// HTTP helpers and static files.
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });

  res.end(
    type.startsWith('application/json')
      ? JSON.stringify(body)
      : body
  );
}

// API routes and website server.
const server = http.createServer(async (req, res) => {
  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost'}`
  );

  if (url.pathname === '/api/health' && req.method === 'GET') {
    return send(res, 200, {
      ok: true,
      cppBridge: cppAvailable,
      source: 'Wikidata + Wikipedia'
    });
  }

  if (url.pathname === '/api/astronauts' && req.method === 'GET') {
    try {
      const wantsRefresh = url.searchParams.get('refresh') === '1';
      const canRefresh = wantsRefresh && !directoryInFlight &&
        Date.now() - lastRefreshAt > REFRESH_COOLDOWN_MS;

      if (canRefresh) lastRefreshAt = Date.now();

      const people = await fetchDirectory(canRefresh);

      return send(res, 200, {
        refreshed: canRefresh,
        count: people.length,
        fetchedAt: new Date(directoryCache.at).toISOString(),
        cached: Date.now() - directoryCache.at < CACHE_MS,
        cppValidated: cppAvailable,
        people
      });
    } catch (error) {
      console.error('Directory fetch failed:', error.message);

      return send(res, 502, {
        error: 'Could not load the astronaut directory from Wikidata right now.',
        detail: error.message
      });
    }
  }

  const imageMatch = url.pathname.match(
    /^\/api\/astronauts\/([A-Za-z0-9_-]+)\/image$/
  );

  if (imageMatch && req.method === 'GET') {
    try {
      const people = await fetchDirectory();
      const person = people.find(item => item.id === imageMatch[1]);
      return send(res, 200, { image: person ? await getFallbackImage(person) : '' });
    } catch {
      return send(res, 200, { image: '' });
    }
  }

  const profileMatch = url.pathname.match(
    /^\/api\/astronauts\/([A-Za-z0-9_-]+)$/
  );

  if (profileMatch && req.method === 'GET') {
    try {
      const people = await fetchDirectory();
      const person = people.find(item => item.id === profileMatch[1]);

      if (!person) {
        return send(res, 404, {
          error: 'Astronaut record not found in the currently loaded source data.'
        });
      }

      return send(res, 200, await getWikipediaProfile(person));
    } catch (error) {
      return send(res, 502, {
        error: 'Could not load this profile right now.',
        detail: error.message
      });
    }
  }

  let pathname = url.pathname === '/' ? '/astronauts.html' : url.pathname;

  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return send(res, 400, 'Bad request', 'text/plain; charset=utf-8');
  }

  const file = path.resolve(PUBLIC, `.${pathname}`);

  if (
    file !== path.join(PUBLIC, 'astronauts.html') &&
    !file.startsWith(PUBLIC + path.sep)
  ) {
    return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      return send(
        res,
        404,
        'File not found. Check the public folder.',
        'text/plain; charset=utf-8'
      );
    }

    return send(
      res,
      200,
      data,
      mime[path.extname(file).toLowerCase()] ||
        'application/octet-stream'
    );
  });
});

server.listen(PORT, () => {
  console.log(`Space Explorer running at http://localhost:${PORT}`);
});