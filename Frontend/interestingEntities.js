"use strict";

const interestingEntities = [
    {
        name: "M87*",
        type: "Supermassive Black Hole",

        description:
            "M87* is a supermassive black hole at the center of galaxy Messier 87. Its famous image revealed a bright ring of material surrounding the black hole's dark shadow.",

        image: "assets/interesting-entities/m87-black-hole.jpg",

        wikipedia: "M87"
    },

    {
        name: "Crab Pulsar",
        type: "Pulsar",

        description:
            "The Crab Pulsar is a rapidly rotating neutron star left behind by a supernova explosion. It emits beams of radiation and powers the surrounding Crab Nebula.",

        image: "assets/interesting-entities/crab-pulsar.jpg",

        wikipedia: "Crab_Pulsar"
    },

    {
        name: "Magnetar",
        type: "Neutron Star",

        description:
            "A magnetar is a neutron star with an extraordinarily powerful magnetic field. Some magnetars release enormous bursts of energy detectable across the galaxy.",

        image: "assets/interesting-entities/magnetar.jpg",

        wikipedia: "Magnetar"
    },

    {
        name: "3C 273",
        type: "Quasar",

        description:
            "3C 273 is a famous quasar powered by matter falling toward a supermassive black hole. It is so luminous that astronomers can observe it across enormous cosmic distances.",

        image: "assets/interesting-entities/quasar-3c273.jpg",

        wikipedia: "3C_273"
    },

    {
        name: "Rogue Planet",
        type: "Planetary Object",

        description:
            "A rogue planet travels through space without orbiting a star. Some may have been ejected from their original planetary systems.",

        image: "assets/interesting-entities/rogue-planet.png",

        wikipedia: "Rogue_planet"
    },

    {
        name: "55 Cancri e",
        type: "Exoplanet",

        description:
            "55 Cancri e is a hot super-Earth orbiting another star. Its extreme temperatures and unusual properties make it an important target for studying distant rocky worlds.",

        image: "assets/interesting-entities/55-cancri-e.jpg",

        wikipedia: "55_Cancri_e"
    },

    {
        name: "2I/Borisov",
        type: "Interstellar Comet",

        description:
            "2I/Borisov was the first confirmed interstellar comet observed passing through our Solar System. It offered scientists an opportunity to study material originating around another star.",

        image: "assets/interesting-entities/comet-borisov.jpg",

        wikipedia: "2I/Borisov"
    },

    {
        name: "Bennu",
        type: "Asteroid",

        description:
            "Bennu is a near-Earth asteroid visited by NASA's OSIRIS-REx spacecraft. Samples returned to Earth in 2023 provide clues about the early Solar System.",

        image: "assets/interesting-entities/asteroid-bennu.jpg",

        wikipedia: "101955_Bennu"
    },

    {
        name: "Europa",
        type: "Natural Satellite",

        description:
            "Europa is one of Jupiter's largest moons. Scientists suspect that a vast ocean lies beneath its icy crust, making it an important target in the search for environments suitable for life.",

        image: "assets/interesting-entities/europa.jpg",

        wikipedia: "Europa_(moon)"
    },

    {
        name: "Enceladus",
        type: "Natural Satellite",

        description:
            "Enceladus is a moon of Saturn that releases water-rich plumes through cracks near its south pole. Evidence suggests that a subsurface ocean exists beneath its icy surface.",

        image: "assets/interesting-entities/enceladus.jpg",

        wikipedia: "Enceladus"
    },

    {
        name: "Titan",
        type: "Natural Satellite",

        description:
            "Titan is Saturn's largest moon and has a dense atmosphere. Its surface contains lakes and rivers of liquid methane and ethane.",

        image: "assets/interesting-entities/titan.jpg",

        wikipedia: "Titan_(moon)"
    },

    {
        name: "Orion Nebula",
        type: "Nebula",

        description:
            "The Orion Nebula is a vast cloud of gas and dust where new stars form. It provides astronomers with a nearby region for studying stellar birth.",

        image: "assets/interesting-entities/orion-nebula.jpg",

        wikipedia: "Orion_Nebula"
    },

    {
        name: "Andromeda Galaxy",
        type: "Spiral Galaxy",

        description:
            "The Andromeda Galaxy is the nearest large spiral galaxy to the Milky Way. It contains enormous numbers of stars and is moving toward our galaxy.",

        image: "assets/interesting-entities/andromeda-galaxy.jpg",

        wikipedia: "Andromeda_Galaxy"
    },

    {
        name: "Crab Nebula",
        type: "Supernova Remnant",

        description:
            "The Crab Nebula is the expanding remnant of a star that exploded in a supernova observed in 1054. A pulsar at its center powers the surrounding cloud of energetic particles.",

        image: "assets/interesting-entities/crab-nebula.jpg",

        wikipedia: "Crab_Nebula"
    },

    {
        name: "Sagittarius A*",
        type: "Supermassive Black Hole",

        description:
            "Sagittarius A* is the supermassive black hole at the center of the Milky Way, approximately 26,000 light-years from Earth.",

        image: "assets/interesting-entities/sagittarius-a.jpg",

        wikipedia: "Sagittarius_A*"
    }
];

/* =========================================
   Render the "Interesting Space Entities" cards
   (6 shown first, the rest after "Explore More")
========================================= */

const INITIAL_ENTITY_COUNT = 6;

const entitiesGrid = document.getElementById("interestingEntitiesGrid");
const entitiesToggle = document.getElementById("toggleEntitiesBtn");
let showAllEntities = false;

function createEntityCard(entity) {
    const card = document.createElement("a");
    card.className = "entity-card";
    card.href = "planet-detail.html?entity=" + encodeURIComponent(entity.name);

    const image = document.createElement("img");
    image.className = "entity-card-image";
    image.src = entity.image;
    image.alt = entity.name;
    image.loading = "lazy";
    image.addEventListener("error", () => { image.style.display = "none"; });

    const content = document.createElement("div");
    content.className = "entity-card-content";
    content.append(
        textElement("span", "entity-card-type", entity.type),
        textElement("h3", "entity-card-title", entity.name),
        textElement("p", "entity-card-description", entity.description),
        textElement("span", "entity-card-link", "Explore entity →")
    );

    card.append(image, content);
    return card;
}

function textElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
}

function renderInterestingEntities() {
    const visible = showAllEntities ? interestingEntities : interestingEntities.slice(0, INITIAL_ENTITY_COUNT);
    entitiesGrid.replaceChildren(...visible.map(createEntityCard));
    entitiesToggle.textContent = showAllEntities ? "Show Less ↑" : "Explore More ↓";
}

entitiesToggle.addEventListener("click", () => {
    showAllEntities = !showAllEntities;
    renderInterestingEntities();

    if (!showAllEntities) {
        document.querySelector(".interesting-entities-section").scrollIntoView({ behavior: "smooth", block: "start" });
    }
});

renderInterestingEntities();
