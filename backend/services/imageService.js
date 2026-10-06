const blockedWords = [
    "costume",
    "children",
    "child",
    "event",
    "festival",
    "school",
    "party",
    "parade",
    "celebration",
    "people",
    "person",
    "museum",
    "artwork",
    "poster",
    "classroom",
    "conference"
];


/*
====================================================
NASA IMAGE CACHE
====================================================
*/

const imageCache = new Map();

const IMAGE_CACHE_TTL = 30 * 60 * 1000;


/*
====================================================
IMAGE SCORING
====================================================
*/

function scoreImage(item, keywords) {

    const metadata =
        item.data?.[0] || {};

    const haystack =
        (
            (metadata.title || "") +
            " " +
            (metadata.description || "")
        ).toLowerCase();


    // Reject irrelevant human/event images.
    if (
        blockedWords.some(
            word => haystack.includes(word)
        )
    ) {
        return -1000;
    }


    let score = 0;


    for (const keyword of keywords) {

        if (
            haystack.includes(
                keyword.toLowerCase()
            )
        ) {
            score += 10;
        }
    }


    return score;
}


/*
====================================================
SEARCH NASA
====================================================
*/

async function searchNASAImages(
    searchTerm,
    limit = 1
) {

    /*
    ------------------------------------------------
    CHECK CACHE
    ------------------------------------------------
    */

    const cacheKey =
        searchTerm.toLowerCase();

    const cached =
        imageCache.get(cacheKey);


    if (cached) {

        const age =
            Date.now() - cached.timestamp;

        if (age < IMAGE_CACHE_TTL) {

            return cached.data;
        }

        imageCache.delete(cacheKey);
    }


    /*
    ------------------------------------------------
    NASA REQUEST
    ------------------------------------------------
    */

    const url =
        "https://images-api.nasa.gov/search?q=" +
        encodeURIComponent(searchTerm) +
        "&media_type=image";


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            "NASA Images API request failed"
        );
    }


    const data =
        await response.json();


    const items =
        data?.collection?.items || [];


    const keywords =
        searchTerm
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);


    /*
    ------------------------------------------------
    RANK RESULTS
    ------------------------------------------------
    */

    const ranked = items

        .map(item => ({
            item,
            score:
                scoreImage(
                    item,
                    keywords
                )
        }))

        .filter(
            entry =>
                entry.score > -1000
        )

        .sort(
            (a, b) =>
                b.score - a.score
        );


    const result =
        ranked
            .slice(0, limit)
            .map(({ item }) => {

                const metadata =
                    item.data?.[0] || {};

                const imageLink =
                    item.links?.find(
                        link =>
                            link.render === "image"
                    );


                return {

                    title:
                        metadata.title ||
                        "NASA image",

                    description:
                        metadata.description ||
                        "",

                    url:
                        imageLink?.href ||
                        "",

                    nasaId:
                        metadata.nasa_id ||
                        "",

                    date:
                        metadata.date_created ||
                        "",

                    source: {

                        name: "NASA",

                        url:
                            "https://images.nasa.gov/"
                    }
                };
            })

            .filter(
                image =>
                    image.url
            );


    /*
    ------------------------------------------------
    SAVE TO CACHE
    ------------------------------------------------
    */

    imageCache.set(
        cacheKey,
        {
            data: result,
            timestamp: Date.now()
        }
    );


    return result;
}


/*
====================================================
TOPIC IMAGES
====================================================
*/

async function getTopicImages(
    entityName,
    topics
) {

    const terms = {

        physical:
            `${entityName} physical characteristics planet`,

        composition:
            `${entityName} composition geology planet`,

        atmosphere:
            `${entityName} atmosphere planet`,

        surface:
            `${entityName} surface terrain planet`,

        orbit:
            `${entityName} orbit rotation planet`,

        moons:
            `${entityName} moons satellites planet`,

        discovery:
            `${entityName} history discovery planet`,

        exploration:
            `${entityName} rover exploration planet`
    };


    /*
    ====================================================
    IMPORTANT:
    ALL NASA REQUESTS RUN IN PARALLEL
    ====================================================
    */

    const requests =
        topics.map(async topic => {

            const query =
                terms[topic.id] ||
                `${entityName} planet`;


            try {

                const images =
                    await searchNASAImages(
                        query,
                        1
                    );


                if (!images[0]) {
                    return null;
                }


                return {

                    ...images[0],

                    topicId:
                        topic.id
                };

            } catch (error) {

                console.error(
                    `NASA image failed for ${topic.id}:`,
                    error.message
                );

                return null;
            }
        });


    /*
    ------------------------------------------------
    WAIT FOR ALL REQUESTS TO FINISH
    ------------------------------------------------
    */

    const results =
        await Promise.all(requests);


    return results.filter(
        Boolean
    );
}


/*
====================================================
EXPORT
====================================================
*/

module.exports = {
    searchNASAImages,
    getTopicImages
};