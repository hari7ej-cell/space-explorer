"use strict";

/*
 * Space Explorer
 * Interesting Space Entities
 *
 * Images are stored locally.
 * No image API is required.
 */

const interestingEntities = [
    {
        name: "M87*",
        type: "Supermassive Black Hole",

        description:
            "M87* is a supermassive black hole at the center of galaxy Messier 87. Its famous image revealed a bright ring of material surrounding the black hole's dark shadow.",

        image: "assets/interesting-entities/m87-black-hole.png",

        wikipedia: "M87"
    },

    {
        name: "Crab Pulsar",
        type: "Pulsar",

        description:
            "The Crab Pulsar is a rapidly rotating neutron star left behind by a supernova explosion. It emits beams of radiation and powers the surrounding Crab Nebula.",

        image: "assets/interesting-entities/crab-pulsar.png",

        wikipedia: "Crab_Pulsar"
    },

    {
        name: "Magnetar",
        type: "Neutron Star",

        description:
            "A magnetar is a neutron star with an extraordinarily powerful magnetic field. Some magnetars release enormous bursts of energy detectable across the galaxy.",

        image: "assets/interesting-entities/magnetar.png",

        wikipedia: "Magnetar"
    },

    {
        name: "3C 273",
        type: "Quasar",

        description:
            "3C 273 is a famous quasar powered by matter falling toward a supermassive black hole. It is so luminous that astronomers can observe it across enormous cosmic distances.",

        image: "assets/interesting-entities/quasar-3c273.png",

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


/* Find the card container */

const entitiesGrid = document.getElementById(
    "interestingEntitiesGrid"
);


/* Build one entity card */

function createEntityCard(entity) {
    const card = document.createElement("a");

    card.className = "entity-card";

    /*
     * Link to the existing detail page.
     * The detail page must support this entity
     * for the link to display the correct details.
     */

    card.href =
        "planet-detail.html?entity=" +
        encodeURIComponent(entity.name);


    /* Image */

    const image = document.createElement("img");

    image.className = "entity-card-image";

    image.src = entity.image;

    image.alt = entity.name;

    image.loading = "lazy";


    /* Missing image handling */

    image.addEventListener("error", function () {
        console.error(
            "Entity image not found:",
            entity.image
        );

        this.alt = entity.name + " image unavailable";

        this.style.visibility = "hidden";
    }, { once: true });


    /* Content container */

    const content = document.createElement("div");

    content.className = "entity-card-content";


    /* Entity type */

    const type = document.createElement("span");

    type.className = "entity-card-type";

    type.textContent = entity.type;


    /* Entity name */

    const title = document.createElement("h3");

    title.className = "entity-card-title";

    title.textContent = entity.name;


    /* Description */

    const description = document.createElement("p");

    description.className = "entity-card-description";

    description.textContent = entity.description;


    /* Explore link label */

    const explore = document.createElement("span");

    explore.className = "entity-card-link";

    explore.textContent = "Explore entity →";


    /* Assemble card */

    content.appendChild(type);

    content.appendChild(title);

    content.appendChild(description);

    content.appendChild(explore);

    card.appendChild(image);

    card.appendChild(content);

    return card;
}


/* Render all 15 entities */

const grid = document.getElementById("interestingEntitiesGrid");
const toggleBtn = document.getElementById("toggleEntitiesBtn");

let showAllEntities = false;

function renderInterestingEntities() {
    grid.innerHTML = "";

    const visibleEntities = showAllEntities
        ? interestingEntities
        : interestingEntities.slice(0, 6);

    visibleEntities.forEach(entity => {
        const card = document.createElement("a");

        card.className = "entity-card";
        card.href = entity.wikipedia;
        card.target = "_blank";
        card.rel = "noopener noreferrer";

        const image = document.createElement("img");
        image.className = "entity-card-image";
        image.src = entity.image;
        image.alt = entity.name;
        image.loading = "lazy";

        image.onerror = function () {
            this.alt = `${entity.name} image unavailable`;
            this.style.display = "none";
        };

        const content = document.createElement("div");
        content.className = "entity-card-content";

        const type = document.createElement("span");
        type.className = "entity-card-type";
        type.textContent = entity.type;

        const title = document.createElement("h3");
        title.className = "entity-card-title";
        title.textContent = entity.name;

        const description = document.createElement("p");
        description.className = "entity-card-description";
        description.textContent = entity.description;

        const link = document.createElement("span");
        link.className = "entity-card-link";
        link.textContent = "Explore entity →";

        content.append(type, title, description, link);
        card.append(image, content);
        grid.appendChild(card);
    });

    toggleBtn.textContent = showAllEntities
        ? "Show Less ↑"
        : "Explore More ↓";

    toggleBtn.style.display =
        interestingEntities.length > 6 ? "inline-flex" : "none";
}

toggleBtn.addEventListener("click", () => {
    showAllEntities = !showAllEntities;
    renderInterestingEntities();

    if (!showAllEntities) {
        document.querySelector(".interesting-entities-section")
            .scrollIntoView({ behavior: "smooth", block: "start" });
    }
});

renderInterestingEntities();