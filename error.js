/* error.html?type=invalid|notfound|server&q=<searched term> */

const params = new URLSearchParams(window.location.search);
const type = ["invalid", "notfound", "server"].includes(params.get("type")) ? params.get("type") : "notfound";
const query = (params.get("q") || "").trim();

const esc = s => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const q = esc(query);

const CONTENT = {
    invalid: {
        code: "INVALID INPUT",
        title: "This topic fell beyond the event horizon.",
        message: (q ? `<strong>“${q}”</strong> isn't a space topic we can show.` : "That isn't a space topic we can show.") + " Check the spelling and try again."
    },
    notfound: {
        code: "SOURCE NOT FOUND",
        title: "Nothing but darkness out here.",
        message: (q ? `We couldn't find <strong>“${q}”</strong>.` : "We couldn't find that page.") + " Try the full name, like “Saturn”."
    },
    server: {
        code: "SIGNAL LOST",
        title: "Houston, we have a problem.",
        message: "We couldn't reach our data source. Wait a moment and try again."
    }
};

document.getElementById("errorPage").dataset.type = type;
document.title = CONTENT[type].code + " | Space Explorer";
document.getElementById("errorCode").textContent = CONTENT[type].code;
document.getElementById("errorTitle").textContent = CONTENT[type].title;
document.getElementById("errorMessage").innerHTML = CONTENT[type].message;
document.getElementById("bhWord").textContent = query || "?";

document.getElementById("tryAgain").addEventListener("click", () => {
    if (type !== "server" && document.referrer) window.history.back();
    else window.location.reload();
});

const starBox = document.getElementById("stars");
for (let i = 0; i < 90; i++) {
    const s = document.createElement("span");
    const size = Math.random() * 2 + 0.6;
    s.className = "star";
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;width:${size}px;height:${size}px;--d:${2+Math.random()*4}s;animation-delay:${Math.random()*4}s`;
    starBox.appendChild(s);
}
