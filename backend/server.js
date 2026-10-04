const express = require("express");
const cors = require("cors");

const {
    getWikipediaPage
} = require("./services/wikipedia");

const {
    createTopics
} = require("./services/topicParser");

const {
    processPlanet
} = require("./services/cppService");

const app = express();

app.use(cors());
app.use(express.json());


app.get(
    "/api/planet/:name",
    async (req, res) => {

        try {

            const name =
                req.params.name;

            // -----------------------------
            // 1. Wikipedia
            // -----------------------------

            const wiki =
                await getWikipediaPage(name);


            // -----------------------------
            // 2. Convert Wikipedia
            //    into 9 topics
            // -----------------------------

            const topics =
                createTopics(wiki.html);


            // -----------------------------
            // 3. C++ OOP model
            // -----------------------------

            const cpp =
                await processPlanet({
                    title: wiki.title,
                    topics: topics
                });


            // -----------------------------
            // 4. Final JSON
            // -----------------------------

            res.json({

                title: wiki.title,

                wikipediaUrl:
                    wiki.url,

                topics: topics,

                cpp: cpp,

                // Reserved for other team members
                media: [],

                missions: [],

                astronauts: []

            });

        }

        catch (error) {

            console.error(error);

            res.status(500).json({

                error:
                    error.message

            });
        }
    }
);


app.listen(
    3000,
    () => {

        console.log(
            "Space Explorer backend running at:"
        );

        console.log(
            "http://localhost:3000"
        );
    }
);