SPACE EXPLORER — FULL-STACK ASTRONAUT DIRECTORY
================================================

PROJECT FILES
-------------
package.json                 Node project metadata (no npm packages required)
server.js                    Node.js API server; fetches/caches Wikidata records and Wikipedia profiles
public/astronauts.html       Web page
public/style.css             Black theme and responsive layout
public/script.js             Search, filters, pagination, and profile modal
cpp/Astronaut.h              Single Astronaut class with getters/setters/isValid/displayDetails
cpp/main.cpp                 Small stdin/stdout bridge used by Node to validate loaded records

REQUIREMENTS
------------
- Node.js 18 or newer (uses built-in fetch)
- Internet access (Wikidata/Wikipedia data is fetched live)
- Optional but recommended: g++ with C++17 support. If g++ is installed, the server compiles the C++ bridge at startup and passes loaded records through the Astronaut class validation. Without g++, the website still works using the Node.js API.

RUN IN VS CODE
--------------
1. Extract the ZIP file.
2. In VS Code, choose File > Open Folder and open the extracted astronaut_explorer_fullstack folder.
3. Open Terminal > New Terminal.
4. Run: node server.js
5. Wait for: Space Explorer running at http://localhost:3000
6. Open http://localhost:3000 in your browser.

IMPORTANT: Do not open public/astronauts.html directly as a file and do not use Live Server for this full-stack version. It needs the Node server for /api/astronauts and /api/astronauts/:id.

HOW IT WORKS
------------
- Node runs two Wikidata SPARQL queries (no fixed people limit): one for the core record (name, dates, nationality, occupations, birthplace, image, English Wikipedia link) and one for agencies, missions and time in space. Each query returns one row per person. Missing portraits are filled from the person's English Wikipedia lead image.
- Results are cached in the Node process for six hours to reduce load on the public endpoint.
- The page loads the returned directory and provides client-side search across loaded names, nationality, occupation, mission/affiliation, description, dates, and IDs. It shows 48 cards at a time and offers Load more.
- Opening a profile requests a Wikipedia summary for that person when an English Wikipedia article is linked. It also displays available structured fields and source links.
- Images use object-fit: contain so the full source image is visible. If no portrait exists or the image fails, a neutral placeholder appears.
- If Wikidata is temporarily unavailable, the page shows an error instead of pretending the directory loaded.

ABOUT THE C++ CLASS
-------------------
This folder includes a self-contained Astronaut class matching the project fields described so far: id, name, agency, nationality, mission, role, and experienceYears, plus constructors, setters/getters, isValid(), and displayDetails(). The bridge reads tab-separated records from Node and prints the IDs accepted by Astronaut::isValid().

If you already have your own Astronaut.h / Astronaut.cpp, keep your existing class and merge the equivalent fields and methods into it, then update cpp/main.cpp to match your constructor and method names. Your original C++ source was not included with this request, so this package cannot safely merge against its exact implementation automatically.

DATA LIMITATIONS
----------------
No public dataset guarantees every person who has ever flown to space, and Wikidata's occupation labels and article coverage vary. This project discovers records currently returned by the query; it is not a certified exhaustive roster. Mission history, agency/employer, dates, and portraits may be absent. Missing details are displayed as "Not listed" rather than invented.

TROUBLESHOOTING
---------------
- If the browser says it cannot load the directory, confirm the terminal still shows the server running, then refresh the page.
- If Wikidata returns a timeout/rate-limit error, wait a little and refresh.
- If you see a C++ compiler warning in the terminal, install g++ (or use Node-only mode; the site can still run).
- To change the port, run PORT=3001 node server.js (macOS/Linux) or set the PORT environment variable before starting Node on Windows.
