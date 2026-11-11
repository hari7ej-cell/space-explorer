/* =========================================
   PLANETS PAGE
   Solar-system cards, "Show more" toggle and the latest discovery card.
   (Header, footer and search are in site.js; interesting entities in interestingEntities.js.)
========================================= */

const API_BASE = SpaceSearch.API_BASE;

/* ---------- solar system cards ---------- */

// `extra` cards stay hidden until "Show More" is pressed.
const SOLAR_BODIES = [
    { name: "Sun",     tag: "Star",   visual: "sun",     text: "The star at the center of our Solar System.", cardClass: "sun-card" },
    { name: "Earth",   tag: "Planet", visual: "earth",   text: "Our home planet and the only known world with life." },
    { name: "Mars",    tag: "Planet", visual: "mars",    text: "The red planet, explored extensively by robotic missions." },
    { name: "Mercury", tag: "Planet", visual: "mercury", text: "The smallest planet and the closest to the Sun.", extra: true },
    { name: "Venus",   tag: "Planet", visual: "venus",   text: "A hot terrestrial planet with a thick atmosphere.", extra: true },
    { name: "Jupiter", tag: "Planet", visual: "jupiter", text: "The largest planet in the Solar System.", extra: true },
    { name: "Saturn",  tag: "Planet", visual: "saturn",  text: "A gas giant famous for its spectacular ring system.", extra: true },
    { name: "Uranus",  tag: "Planet", visual: "uranus",  text: "An ice giant rotating with an extreme axial tilt.", extra: true },
    { name: "Neptune", tag: "Planet", visual: "neptune", text: "The distant ice giant with powerful winds.", extra: true }
];

document.getElementById("planetGrid").innerHTML = SOLAR_BODIES.map(body => `
    <a class="planet-card ${body.cardClass || ""} ${body.extra ? "extra-planet" : ""}" href="planet-detail.html?entity=${body.name}">
        <div class="planet-visual ${body.visual}-visual"></div>
        <div class="planet-card-body">
            <h3>${body.name}</h3>
            <p>${body.text}</p>
            <span class="card-tag">${body.tag}</span>
        </div>
    </a>`).join("");

const learnMoreButton = document.getElementById("learnMoreBtn");
let planetsExpanded = false;

learnMoreButton.addEventListener("click", () => {
    planetsExpanded = !planetsExpanded;
    document.querySelectorAll(".extra-planet").forEach(card => card.classList.toggle("show", planetsExpanded));
    learnMoreButton.innerHTML = planetsExpanded ? "Show Less <span>↑</span>" : "Show More <span>↓</span>";
});

/* ---------- latest discovered space entity ---------- */

const latestCard = document.getElementById("latestDiscoveryCard");
const latestImage = document.getElementById("latestDiscoveryImage");
const latestType = document.getElementById("latestDiscoveryType");
const latestName = document.getElementById("latestDiscoveryName");
const latestCaption = document.getElementById("latestDiscoveryCaption");

const DEFAULT_VISUALS = ["asteroid", "comet", "moon", "star", "planet"];

// Picks the placeholder picture for an entity type that has no photo.
function defaultVisual(type) {
    const value = String(type).toLowerCase();
    return (DEFAULT_VISUALS.find(kind => value.includes(kind)) || "planet") + "-default";
}

async function loadLatestDiscovery() {
    try {
        const response = await fetch(API_BASE + "/api/latest-discovery");
        if (!response.ok) throw new Error("API returned " + response.status);
        const entity = await response.json();

        latestName.textContent = entity.name;
        latestType.textContent = "LATEST " + entity.type.toUpperCase();
        latestCaption.textContent = entity.caption;
        latestCard.href = "planet-detail.html?entity=" + encodeURIComponent(entity.name);

        DEFAULT_VISUALS.forEach(kind => latestImage.classList.remove(kind + "-default"));
        if (entity.image) {
            latestImage.style.backgroundImage = `url("${entity.image}")`;
        } else {
            latestImage.classList.add(defaultVisual(entity.type));
        }
    } catch (error) {
        console.error("Latest discovery error:", error);
        latestName.textContent = "Unable to load discovery";
        latestType.textContent = "SPACE ENTITY";
        latestCaption.textContent = "Latest discovery data is currently unavailable.";
    }
}

loadLatestDiscovery();
