// Friendly error handling for the whole site.
// Pages that are not found or that crash open error.html; API calls get JSON.
const path = require("path");

function wantsPage(req) {
    // Only real page requests go to the error page. A missing image, script or
    // stylesheet must stay a plain 404, otherwise it would be answered with HTML.
    const ext = path.extname(req.path).toLowerCase();
    return (req.method === "GET" || req.method === "HEAD") &&
        (ext === "" || ext === ".html") &&
        req.accepts(["html", "json"]) === "html";
}

function notFound(req, res) {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "This API route does not exist." });
    }
    if (wantsPage(req)) {
        return res.redirect(302, "/error.html?type=notfound");
    }
    return res.status(404).type("text/plain").send("Not found");
}

// Express calls this when any route throws.
// eslint-disable-next-line no-unused-vars
function serverError(err, req, res, next) {
    console.error("UNHANDLED ERROR:", err);
    if (res.headersSent) return next(err);
    if (req.path.startsWith("/api/") || !wantsPage(req)) {
        return res.status(500).json({ error: "Something went wrong on the server." });
    }
    return res.redirect(302, "/error.html?type=server");
}

module.exports = { notFound, serverError };
