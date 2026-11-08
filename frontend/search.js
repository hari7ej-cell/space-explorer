/* =========================================
   SHARED SEARCH + ERROR ROUTING
   Used by the home page and the error page.
   Sends people to:
     planet-detail.html?entity=NAME        when the topic exists
     error.html?type=invalid&q=NAME        when the text is not a usable topic
     error.html?type=notfound&q=NAME       when the data source has nothing for it
     error.html?type=server&q=NAME         when the data source cannot be reached
========================================= */
(function () {
    "use strict";

    const API_BASE = location.port === "3000" ? "" : "http://localhost:3000";
    const MAX_LENGTH = 80;
    const TIMEOUT_MS = 35000;

    function clean(raw) {
        return String(raw || "").replace(/\s+/g, " ").trim();
    }

    // Returns "" when the text is fine, otherwise a short reason.
    function validate(text) {
        if (text.length < 2) return "too-short";
        if (text.length > MAX_LENGTH) return "too-long";
        if (!/\p{L}/u.test(text)) return "no-letters";
        // Letters, numbers, spaces and the marks real names use: 55 Cancri e, 3C 273, Sagittarius A*
        if (!/^[\p{L}\p{N} .,'\u2019()\-*+/&]+$/u.test(text)) return "bad-characters";
        return "";
    }

    function errorUrl(type, q) {
        return "error.html?type=" + type + (q ? "&q=" + encodeURIComponent(q.slice(0, MAX_LENGTH)) : "");
    }

    function detailUrl(q) {
        return "planet-detail.html?entity=" + encodeURIComponent(q);
    }

    // Checks the topic with the backend first, so a bad search lands on the error page
    // instead of an empty detail page. The backend caches the answer, so the detail
    // page that opens next loads instantly.
    async function run(raw, hooks) {
        const q = clean(raw);
        const busy = hooks && hooks.onBusy ? hooks.onBusy : () => {};
        const idle = hooks && hooks.onIdle ? hooks.onIdle : () => {};

        if (!q) { if (hooks && hooks.onEmpty) hooks.onEmpty(); return; }
        if (validate(q)) { location.href = errorUrl("invalid", q); return; }

        busy();
        try {
            const response = await fetch(API_BASE + "/api/planet/" + encodeURIComponent(q), {
                signal: AbortSignal.timeout(TIMEOUT_MS)
            });
            if (response.ok) { location.href = detailUrl(q); return; }
            if (response.status === 404) { location.href = errorUrl("notfound", q); return; }
            location.href = errorUrl("server", q);
        } catch (error) {
            // Backend not running, network down, or it took too long.
            location.href = errorUrl("server", q);
        }
        idle();
    }

    window.SpaceSearch = { clean, validate, run, errorUrl, detailUrl, API_BASE };
})();
