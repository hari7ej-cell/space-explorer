const path = require("path");
const express = require("express");
const cors = require("cors");

const { getWikipediaPage } = require("./services/wikipedia");
const { createTopics } = require("./services/topicParser");
const { processPlanet } = require("./services/cppService");
const { getApod } = require("./services/nasa");
const { getAnnouncements } = require("./services/news");

const app = express();
app.use(cors());
app.use(express.json());

// Serves the website, so http://localhost:3000 opens the front page.
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Planet: Wikipedia -> 9 topics -> C++ OOP model
app.get("/api/planet/:name", async (req, res) => {
    try {
        const wiki = await getWikipediaPage(req.params.name);
        const topics = createTopics(wiki.html);
        const cpp = await processPlanet({ title: wiki.title, topics });
        res.json({
            title: wiki.title,
            wikipediaUrl: wiki.url,
            topics,
            cpp,
            // Reserved for other team members
            media: [],
            missions: [],
            astronauts: []
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// NASA image of the day
app.get("/api/apod", async (req, res) => {
    try {
        res.json(await getApod());
    } catch (error) {
        console.error(error);
        res.status(502).json({ error: error.message });
    }
});

// Space news from the last 30 days
app.get("/api/announcements", async (req, res) => {
    try {
        res.json(await getAnnouncements());
    } catch (error) {
        console.error(error);
        res.status(502).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log("Space Explorer running at: http://localhost:3000");
});
