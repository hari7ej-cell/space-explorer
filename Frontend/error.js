/* error.html?type=invalid|notfound|server&q=<searched term> */

const params = new URLSearchParams(window.location.search);
const type = ["invalid", "notfound", "server"].includes(params.get("type")) ? params.get("type") : "notfound";
const query = (params.get("q") || "").replace(/\s+/g, " ").trim().slice(0, 80);

const esc = SpaceSearch.escapeHtml;
const q = esc(query);
const offline = typeof navigator !== "undefined" && navigator.onLine === false;

const CONTENT = {
    invalid: {
        code: "INVALID INPUT",
        title: "This topic fell beyond the event horizon.",
        message: (q ? `<strong>“${q}”</strong> isn't a space topic we can show.` : "That isn't a space topic we can show.") +
            " Use letters and numbers only, like “Saturn” or “55 Cancri e”."
    },
    notfound: {
        code: "SOURCE NOT FOUND",
        title: "Nothing but darkness out here.",
        message: (q ? `We couldn't find <strong>“${q}”</strong>.` : "We couldn't find that page.") +
            (q ? " Check the spelling or try the full name, like “Saturn”." : " It may have moved or never existed.")
    },
    server: {
        code: offline ? "NO CONNECTION" : "SIGNAL LOST",
        title: offline ? "You seem to be drifting offline." : "Houston, we have a problem.",
        message: offline
            ? "Check your internet connection and try again."
            : "We couldn't reach our data source. Wait a moment and try again." +
              (q ? ` Your search for <strong>“${q}”</strong> was not lost.` : "")
    }
};

const page = document.getElementById("errorPage");
page.dataset.type = type;
// An error page with no search term means a missing page, not a missing topic.
if (!query && type !== "server") page.dataset.page = "1";

document.title = CONTENT[type].code + " | Space Explorer";
document.getElementById("errorCode").textContent = CONTENT[type].code;
document.getElementById("errorTitle").textContent = CONTENT[type].title;
document.getElementById("errorMessage").innerHTML = CONTENT[type].message;
document.getElementById("bhWord").textContent = query || "?";

/* ---------- actions ---------- */
const tryAgain = document.getElementById("tryAgain");
if (type === "server") {
    tryAgain.hidden = false;
    tryAgain.className = "btn btn-primary";                 // retrying is the main action here
    document.getElementById("homeBtn").className = "btn";
    tryAgain.addEventListener("click", () => {
        // Retry the original search if there was one, otherwise reload.
        if (query && window.SpaceSearch) SpaceSearch.run(query);
        else window.location.reload();
    });
}

/* ---------- search again ---------- */
const form = document.getElementById("retrySearch");
const input = document.getElementById("retryInput");
const hint = document.getElementById("retryHint");

const HINTS = {
    "too-short": "Type at least 2 characters.",
    "too-long": "That is too long. Keep it under 80 characters.",
    "no-letters": "Include at least one letter.",
    "bad-characters": "Use letters and numbers only."
};

function showHint(text) {
    hint.textContent = text || "";
    hint.hidden = !text;
    input.setAttribute("aria-invalid", text ? "true" : "false");
}

if (query) input.value = query;
input.addEventListener("input", () => showHint(""));

form.addEventListener("submit", event => {
    event.preventDefault();
    const text = SpaceSearch.clean(input.value);
    if (!text) { showHint("Type something to search."); input.focus(); return; }
    const problem = SpaceSearch.validate(text);
    if (problem) { showHint(HINTS[problem] || "That isn't a space topic we can show."); input.focus(); return; }
    form.classList.add("busy");
    SpaceSearch.run(text, { onIdle: () => form.classList.remove("busy") });
});

/* ---------- server errors: watch for the backend coming back ---------- */
if (type === "server") {
    const status = document.getElementById("errorStatus");
    let attempts = 0;
    const MAX_ATTEMPTS = 20;      // about two minutes
    status.hidden = false;
    status.dataset.state = "waiting";
    status.textContent = offline ? "Waiting for your connection…" : "Checking the connection every few seconds…";

    const timer = setInterval(async () => {
        attempts++;
        try {
            const response = await fetch(SpaceSearch.API_BASE + "/api/health", { signal: AbortSignal.timeout(4000) });
            if (response.ok) {
                clearInterval(timer);
                status.dataset.state = "ok";
                status.textContent = "We're back online. You can try again now.";
                tryAgain.className = "btn btn-primary";
                document.getElementById("homeBtn").className = "btn";
                return;
            }
        } catch (e) { /* still down */ }
        if (attempts >= MAX_ATTEMPTS) {
            clearInterval(timer);
            status.textContent = "Still can't reach the server. Press Try again when you're ready.";
        }
    }, 6000);
}

/* ---------- stars ---------- */
const starBox = document.getElementById("stars");
for (let i = 0; i < 90; i++) {
    const s = document.createElement("span");
    const size = Math.random() * 2 + 0.6;
    s.className = "star";
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;width:${size}px;height:${size}px;--d:${2+Math.random()*4}s;animation-delay:${Math.random()*4}s`;
    starBox.appendChild(s);
}
