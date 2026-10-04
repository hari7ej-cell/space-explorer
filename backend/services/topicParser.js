const cheerio = require("cheerio");

const TOPIC_NAMES = [
    "Overview",
    "Physical Characteristics",
    "Composition",
    "Atmosphere",
    "Surface and Structure",
    "Orbit and Rotation",
    "Moons and Satellites",
    "Discovery and History",
    "Exploration and Scientific Importance"
];

function cleanText(text) {

    return text
        .replace(/\s+/g, " ")
        .trim();
}

function getSections(html) {

    const $ = cheerio.load(html);

    const sections = [];

    $("h2, h3").each((index, heading) => {

        const title =
            $(heading)
                .text()
                .replace("[edit]", "")
                .trim();

        if (
            title === "References" ||
            title === "External links" ||
            title === "See also" ||
            title === "Notes"
        ) {
            return;
        }

        let information = "";

        let current =
            $(heading).next();

        while (
            current.length &&
            !["h2", "h3"].includes(
                current[0].name
            )
        ) {

            const text =
                current.text().trim();

            if (text) {
                information += " " + text;
            }

            current =
                current.next();
        }

        if (information.trim()) {

            sections.push({
                title: title,
                information:
                    cleanText(information)
            });
        }
    });

    return sections;
}

function findMatchingSection(
    sections,
    keywords
) {

    for (const section of sections) {

        const title =
            section.title.toLowerCase();

        for (const keyword of keywords) {

            if (title.includes(keyword)) {
                return section.information;
            }
        }
    }

    return "";
}

function createTopics(html) {

    const sections =
        getSections(html);

    return [

        {
            topic: "Overview",
            information:
                findMatchingSection(
                    sections,
                    [
                        "overview",
                        "introduction"
                    ]
                )
        },

        {
            topic:
                "Physical Characteristics",
            information:
                findMatchingSection(
                    sections,
                    [
                        "physical",
                        "properties"
                    ]
                )
        },

        {
            topic: "Composition",
            information:
                findMatchingSection(
                    sections,
                    [
                        "composition",
                        "interior",
                        "structure"
                    ]
                )
        },

        {
            topic: "Atmosphere",
            information:
                findMatchingSection(
                    sections,
                    [
                        "atmosphere"
                    ]
                )
        },

        {
            topic:
                "Surface and Structure",
            information:
                findMatchingSection(
                    sections,
                    [
                        "surface",
                        "geology"
                    ]
                )
        },

        {
            topic:
                "Orbit and Rotation",
            information:
                findMatchingSection(
                    sections,
                    [
                        "orbit",
                        "rotation"
                    ]
                )
        },

        {
            topic:
                "Moons and Satellites",
            information:
                findMatchingSection(
                    sections,
                    [
                        "moon",
                        "satellite"
                    ]
                )
        },

        {
            topic:
                "Discovery and History",
            information:
                findMatchingSection(
                    sections,
                    [
                        "history",
                        "discovery",
                        "observation"
                    ]
                )
        },

        {
            topic:
                "Exploration and Scientific Importance",
            information:
                findMatchingSection(
                    sections,
                    [
                        "exploration",
                        "scientific",
                        "research"
                    ]
                )
        }

    ];
}

module.exports = {
    createTopics
};