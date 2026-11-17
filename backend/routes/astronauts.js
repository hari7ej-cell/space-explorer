// Astronaut directory API used by astronauts.html.
const express = require("express");
const { getDirectory, getAstronautImage } = require("../services/astronauts");

const router = express.Router();

router.get("/api/astronauts", async (req, res) => {
    try {
        res.json(await getDirectory(req.query.refresh === "1"));
    } catch (error) {
        console.error("Directory fetch failed:", error.message);
        res.status(502).json({
            error: "Could not load the astronaut directory from Wikidata right now.",
            detail: error.message
        });
    }
});

router.get("/api/astronauts/:id/image", async (req, res) => {
    try {
        res.json({ image: await getAstronautImage(req.params.id) });
    } catch {
        res.json({ image: "" });
    }
});

module.exports = router;
