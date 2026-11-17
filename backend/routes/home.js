// Home page data: NASA image of the day and latest space news.
// Kept in its own file so the planet code in server.js stays untouched.
const express = require("express");
const { getApod } = require("../services/nasa");
const { getAnnouncements } = require("../services/news");

const router = express.Router();

// NASA image of the day
router.get("/api/apod", async (req, res) => {
    try {
        res.json(await getApod());
    } catch (error) {
        console.error("APOD ERROR:", error);
        res.status(502).json({ error: error.message });
    }
});

// Space news from the last 30 days (shown in "Latest updates" on the home page)
router.get("/api/announcements", async (req, res) => {
    try {
        res.json(await getAnnouncements());
    } catch (error) {
        console.error("NEWS ERROR:", error);
        res.status(502).json({ error: error.message });
    }
});

module.exports = router;
