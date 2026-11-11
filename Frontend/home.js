/* =========================================
   HOME PAGE
   Missions, astronauts, image of the day, latest updates and the planet flashcards.
   (The hero planet is in hero.js; header, footer and search are in site.js.)
========================================= */

/* ---------- backend address (same origin when served by the backend) ---------- */
const API = SpaceSearch.API_BASE;

/* ---------- featured missions and astronauts ---------- */
// Missions come from missionData.js (the same list as the missions page).
const FEATURED_MISSIONS = ["Artemis I", "Perseverance", "James Webb Space Telescope"];
const FEATURED_ASTRONAUTS = [
    ["Neil Armstrong", "NASA", "First person to walk on the Moon."],
    ["Valentina Tereshkova", "Roscosmos", "First woman in space."],
    ["Rakesh Sharma", "ISRO", "First Indian citizen in space."]
];

const allMissions = MISSION_GROUPS.flatMap(group => group.missions);
const detailLink = name => "planet-detail.html?entity=" + encodeURIComponent(name);

document.getElementById("missionGrid").innerHTML = FEATURED_MISSIONS
    .map(title => allMissions.find(mission => mission.title === title))
    .map(mission => `
        <a class="info-card" href="${missionDetailUrl(mission)}">
            <span class="badge">${mission.type}</span><h3>${mission.title}</h3><p>${mission.description}</p>
        </a>`).join("");

document.getElementById("astronautGrid").innerHTML = FEATURED_ASTRONAUTS.map(([name, agency, text]) => `
    <a class="info-card" href="${detailLink(name)}">
        <div class="avatar">★</div><h3>${name}</h3><p>${text}</p><span class="badge">${agency}</span>
    </a>`).join("");

/* ---------- NASA image of the day ---------- */
async function fetchApod() {
    const response = await fetch(API + "/api/apod");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!data.url) throw new Error("no image received");
    return data;
}
async function loadApod() {
    const media = document.getElementById("apodMedia");
    media.innerHTML = '<div class="skeleton"></div>';
    try {
        const d = await fetchApod();
        media.innerHTML = d.media_type === "video"
            ? `<iframe src="${d.url}" allowfullscreen title="${d.title}" allow="encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>`
            : `<img src="${d.url}" alt="${d.title}">`;
        document.getElementById("apodTitle").textContent = d.title;
        document.getElementById("apodDesc").textContent = d.explanation;
        document.getElementById("apodDate").textContent = d.date + (d.copyright ? " | " + d.copyright.trim() : "");
    } catch (err) {
        console.error("APOD:", err.message);
        media.innerHTML = "";
        document.getElementById("apodTitle").textContent = "Image unavailable";
        document.getElementById("apodDesc").innerHTML =
            'Could not load the image (' + err.message + '). <button class="btn btn-ghost" id="apodRetry">Try again</button>';
        document.getElementById("apodRetry").addEventListener("click", loadApod);
    }
}
loadApod();

/* ---------- latest updates (last 30 days, 5 visible, scroll for more) ---------- */
const esc = SpaceSearch.escapeHtml;
async function loadUpdates() {
    const list = document.getElementById("updateList");
    const meta = document.getElementById("updateMeta");
    const box = document.getElementById("updatesScroll");
    if (!list.children.length) meta.textContent = "Loading updates...";
    try {
        const r = await fetch(API + "/api/announcements");
        if (!r.ok) throw new Error("HTTP " + r.status);
        const items = await r.json();
        const top = box.scrollTop;
        list.innerHTML = items.map(a => `
            <li>
                <div class="u-text">
                    <time>${new Date(a.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} | ${esc(a.source)}</time>
                    <h3><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.title)}</a></h3>
                    <p>${esc(a.summary)}</p>
                </div>
                ${a.image ? `<img src="${esc(a.image)}" alt="" loading="lazy">` : ""}
            </li>`).join("");
        box.scrollTop = top;
        meta.textContent = !items.length ? "No updates in the last 30 days."
            : items.length <= 5 ? items.length + " updates from the last 30 days."
            : "Showing the latest 5. Scroll for " + (items.length - 5) + " more from the last 30 days.";
    } catch (e) {
        console.error("Updates:", e.message);
        meta.innerHTML = 'Could not load updates (' + esc(e.message) + '). <a href="#" id="updRetry">Try again</a>';
        document.getElementById("updRetry").addEventListener("click", ev => { ev.preventDefault(); loadUpdates(); });
    }
}
loadUpdates();
setInterval(loadUpdates, 10 * 60 * 1000); // pick up new announcements every 10 minutes

/* ---------- planet flashcards ---------- */
const FLASH_PLANETS = [
    { name: "Earth", id: "earth", distance: "149.6 million km", day: "24 hours", moons: "1",
      blurb: "Our home, and the only world known to host life." },
    { name: "Mars", id: "mars", distance: "227.9 million km", day: "24 h 37 min", moons: "2",
      blurb: "The red planet, explored by more robots than any other world." },
    { name: "Jupiter", id: "jupiter", distance: "778.5 million km", day: "About 10 hours", moons: "90+",
      blurb: "The largest planet, a gas giant with a storm bigger than Earth." }
];

document.getElementById("flashGrid").innerHTML = FLASH_PLANETS.map(p => `
    <article class="flash-card">
        <div class="flash-inner">
            <button type="button" class="flash-face flash-front" aria-label="Flip the ${p.name} card">
                <span class="flash-planet fp-${p.id}" aria-hidden="true"></span>
                <span class="flash-name">${p.name}</span>
                <span class="badge">Planet</span>
                <span class="flash-hint">Tap to flip</span>
            </button>
            <div class="flash-face flash-back">
                <h3>${p.name}</h3>
                <ul class="flash-facts">
                    <li><span>Distance from Sun</span><b>${p.distance}</b></li>
                    <li><span>Length of day</span><b>${p.day}</b></li>
                    <li><span>Moons</span><b>${p.moons}</b></li>
                </ul>
                <p>${p.blurb}</p>
                <a class="btn btn-primary flash-link" href="planet-detail.html?entity=${p.name}">Explore ${p.name}</a>
                <button type="button" class="flash-flip-back">Flip back</button>
            </div>
        </div>
    </article>`).join("");

document.querySelectorAll(".flash-card").forEach(card => {
    const front = card.querySelector(".flash-front");
    const back = card.querySelector(".flash-back");
    const setFlipped = flipped => {
        card.classList.toggle("flipped", flipped);
        front.inert = flipped;   // keep keyboard focus on the visible side only
        back.inert = !flipped;
        (flipped ? back.querySelector(".flash-link") : front).focus({ preventScroll: true });
    };
    front.inert = false;
    back.inert = true;
    front.addEventListener("click", () => setFlipped(true));
    card.querySelector(".flash-flip-back").addEventListener("click", () => setFlipped(false));
    card.addEventListener("keydown", e => { if (e.key === "Escape" && card.classList.contains("flipped")) setFlipped(false); });
});
