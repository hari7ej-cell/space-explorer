/* =========================================
   EXPLORE DROPDOWN
========================================= */

const exploreButton =
    document.getElementById(
        "exploreButton"
    );

const exploreDropdown =
    exploreButton.closest(
        ".dropdown"
    );


exploreButton.addEventListener(
    "click",
    function(event) {

        event.stopPropagation();

        exploreDropdown.classList.toggle(
            "active"
        );

        accountDropdown.classList.remove(
            "active"
        );
    }
);


/* =========================================
   ACCOUNT DROPDOWN
========================================= */

const accountButton =
    document.getElementById(
        "accountButton"
    );

const accountDropdown =
    accountButton.closest(
        ".dropdown"
    );


accountButton.addEventListener(
    "click",
    function(event) {

        event.stopPropagation();

        accountDropdown.classList.toggle(
            "active"
        );

        exploreDropdown.classList.remove(
            "active"
        );
    }
);


/* =========================================
   CLOSE DROPDOWNS
========================================= */

document.addEventListener(
    "click",
    function() {

        exploreDropdown.classList.remove(
            "active"
        );

        accountDropdown.classList.remove(
            "active"
        );

    }
);


/* =========================================
   SEARCH
========================================= */

const searchInput =
    document.getElementById(
        "searchInput"
    );


searchInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter"
        ) {

            const value =
                searchInput.value.trim();

            if (value) {

                console.log(
                    "Searching for:",
                    value
                );

                /*
                 * Wikipedia search functionality
                 * will be connected here when
                 * we build the home page.
                 */

            }

        }

    }
);

/* =========================================
   FRONT PAGE
========================================= */

/* ---------- backend address (same origin when served by the backend) ---------- */
const API = location.port === "3000" ? "" : "http://localhost:3000";

/* ---------- placeholder data ---------- */
const MISSIONS = [
    ["Artemis", "Planned", "Returning astronauts to the Moon."],
    ["Perseverance", "Active", "Searching for signs of ancient life on Mars."],
    ["James Webb Telescope", "Active", "Observing the early universe in infrared."]
];
const ASTRONAUTS = [
    ["Neil Armstrong", "NASA", "First person to walk on the Moon."],
    ["Valentina Tereshkova", "Roscosmos", "First woman in space."],
    ["Rakesh Sharma", "ISRO", "First Indian citizen in space."]
];

/* ---------- planets: surface images from assets/planets ---------- */
const M = (n, r, o, sp, c) => ({ n, r, o, sp, c, a: Math.random() * 6.283 });
const PLANETS = [
    { name: "Earth", earth: true, R: 200, spin: 0.0006, glow: "#4da3ff", moons: [M("Moon", 54, 300, 0.004, "#cfcfcf")] },
    { name: "Mercury", file: "mercury.jpg", R: 90, spin: 0.0004, glow: "#9a9a9a", moons: [] },
    { name: "Venus", file: "venus.jpg", R: 130, spin: 0.0003, glow: "#e8c27a", moons: [] },
    { name: "Mars", file: "mars.jpg", R: 105, spin: 0.0008, glow: "#e98a5b",
      moons: [M("Phobos", 5, 170, 0.02, "#8a7d73"), M("Deimos", 4, 225, 0.012, "#a09484")] },
    { name: "Jupiter", file: "jupiter.jpg", R: 150, spin: 0.0015, glow: "#e6c9a0",
      moons: [M("Io", 7, 190, 0.02, "#e8d36a"), M("Europa", 6, 225, 0.015, "#d9d2c3"),
              M("Ganymede", 9, 262, 0.011, "#a39c91"), M("Callisto", 8, 300, 0.008, "#6f6759")] },
    { name: "Saturn", file: "saturn.jpg", R: 105, spin: 0.0012, glow: "#f0dba5", rings: true,
      moons: [M("Enceladus", 4, 258, 0.016, "#f2f6f8"), M("Rhea", 6, 282, 0.011, "#bdb8b0"), M("Titan", 10, 305, 0.008, "#d9a441")] },
    { name: "Uranus", file: "uranus.jpg", R: 115, spin: 0.001, glow: "#9be8ef",
      moons: [M("Miranda", 4, 170, 0.018, "#aaaaaa"), M("Titania", 7, 230, 0.011, "#b5a99a"), M("Oberon", 7, 280, 0.008, "#8d8378")] },
    { name: "Neptune", file: "neptune.jpg", R: 118, spin: 0.001, glow: "#5b7cff", moons: [M("Triton", 7, 240, -0.01, "#cdb9b0")] }
];

const TW = 1024, TH = 512;      // generic planet maps
const EW = 2048, EH = 1024;     // Earth maps (full detail)
const MW = 512, MH = 256;       // Moon map
const SUN = (() => { const v = [-0.85, 0.22, 0.47], l = Math.hypot(v[0], v[1], v[2]); return v.map(c => c / l); })();
const sm3 = (a, b, x) => { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };

// Loads an image into a pixel array (null if missing or blocked).
function loadPixels(file, w, h) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            try {
                const c = document.createElement("canvas"); c.width = w; c.height = h;
                const x = c.getContext("2d"); x.drawImage(img, 0, 0, w, h);
                resolve(x.getImageData(0, 0, w, h).data);
            } catch (e) {
                console.warn("Texture blocked. Open the site at http://localhost:3000 instead of the file:", e.message);
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = "assets/planets/" + file;
    });
}

// Lookup tables for a sphere: longitude, texture row, sun angle, view angle, highlight angle, edge alpha.
function sphereGeometry(R, rows) {
    const D = 2 * R, n = D * D;
    const s = { gu: new Float32Array(n), gy: new Float32Array(n), gd: new Float32Array(n),
                gz: new Float32Array(n), gh: new Float32Array(n), ga: new Uint8Array(n) };
    const hx = SUN[0], hy = SUN[1], hz = SUN[2] + 1, hl = Math.hypot(hx, hy, hz);
    for (let py = 0; py < D; py++) for (let px = 0; px < D; px++) {
        const i = py * D + px, nx = (px + 0.5 - R) / R, ny = -(py + 0.5 - R) / R, d2 = nx * nx + ny * ny;
        if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2);
        s.gu[i] = Math.atan2(nx, nz) / 6.2832;
        s.gy[i] = (0.5 - Math.asin(ny) / Math.PI) * (rows - 1);
        s.gd[i] = nx * SUN[0] + ny * SUN[1] + nz * SUN[2];
        s.gz[i] = nz;
        s.gh[i] = (nx * hx + ny * hy + nz * hz) / hl;
        s.ga[i] = Math.min(255, (1 - Math.sqrt(d2)) * R / 1.2 * 255);
    }
    return s;
}
function spriteCanvas(D) {
    const off = document.createElement("canvas"); off.width = off.height = D;
    return { off, ctx: off.getContext("2d"), img: new ImageData(D, D) };
}

/* ----- generic planets ----- */
async function buildPlanet(P) {
    P.loading = true;
    let t = await loadPixels(P.file, TW, TH);
    if (!t) { // fallback: plain colour so the planet still shows
        t = new Uint8ClampedArray(TW * TH * 4);
        for (let i = 0; i < t.length; i += 4) {
            t[i] = parseInt(P.glow.slice(1, 3), 16); t[i + 1] = parseInt(P.glow.slice(3, 5), 16);
            t[i + 2] = parseInt(P.glow.slice(5, 7), 16); t[i + 3] = 255;
        }
    }
    const geo = sphereGeometry(P.R, TH), gs = new Float32Array(geo.gd.length);
    for (let i = 0; i < gs.length; i++) gs[i] = (Math.pow(Math.max(geo.gd[i], 0), 0.8) * 1.05 + 0.06) * (0.75 + 0.25 * geo.gz[i]);
    P.built = { t, gs, ...geo, ...spriteCanvas(2 * P.R), rot: 0 };
}
function drawSprite(P) {
    const b = P.built, d = b.img.data, n = P.R * P.R * 4;
    b.rot = (b.rot + P.spin) % 1;
    for (let i = 0; i < n; i++) {
        const o = i * 4;
        if (!b.ga[i]) { d[o + 3] = 0; continue; }
        const u = (((b.gu[i] + b.rot) % 1) + 1) % 1, k = (((b.gy[i] + 0.5) | 0) * TW + ((u * TW) | 0)) * 4, s = b.gs[i];
        d[o] = b.t[k] * s; d[o + 1] = b.t[k + 1] * s; d[o + 2] = b.t[k + 2] * s; d[o + 3] = b.ga[i];
    }
    b.ctx.putImageData(b.img, 0, 0);
}

/* ----- Earth: day map, night lights, clouds, ocean glint, atmosphere, textured Moon ----- */
async function buildEarth(P) {
    P.loading = true;
    const [day, night, cloud, moon] = await Promise.all([
        loadPixels("earth_day.jpg", EW, EH), loadPixels("earth_night.jpg", EW, EH),
        loadPixels("earth_clouds.jpg", EW, EH), loadPixels("moon.jpg", MW, MH)]);
    if (!(day && night && cloud && moon)) { // images missing or blocked: simple fallback
        P.earth = false; P.file = "earth_day.jpg"; P.loading = false;
        P.moons[0].r = 12; P.moons[0].o = 250;
        return buildPlanet(P);
    }
    const geo = sphereGeometry(P.R, EH), n = geo.gd.length;
    const gt = new Float32Array(n), gs1 = new Float32Array(n), gcl = new Float32Array(n), gsp = new Float32Array(n),
          ar = new Float32Array(n), ag = new Float32Array(n), ab = new Float32Array(n);
    for (let i = 0; i < n; i++) { // everything that does not change as the planet spins is worked out once
        if (!geo.ga[i]) continue;
        const d = geo.gd[i], lit = d > 0 ? Math.pow(d, 0.7) : 0, rim = Math.pow(1 - geo.gz[i], 2.6);
        const atm = rim * (0.12 + 0.9 * sm3(-0.35, 0.35, d));                              // blue atmosphere at the edge
        const tw = Math.exp(-(d * d) / 0.012) * (0.25 + 0.75 * rim) * 0.16;                // orange sunrise / sunset glow
        gt[i] = sm3(-0.12, 0.22, d); gs1[i] = 0.05 + 1.05 * lit; gcl[i] = 0.04 + 0.98 * lit;
        gsp[i] = Math.pow(Math.max(geo.gh[i], 0), 110) * 0.55;                             // sun glint on the sea
        ar[i] = 70 * atm + 255 * tw; ag[i] = 140 * atm + 120 * tw; ab[i] = 255 * atm + 40 * tw;
    }
    P.built = { day, night, cloud, moon, ...geo, gt, gs1, gcl, gsp, ar, ag, ab, ...spriteCanvas(2 * P.R), rot: 0, tick: 0,
                m: { ...sphereGeometry(P.moons[0].r, MH), ...spriteCanvas(2 * P.moons[0].r) } };
}
function bil(t, c, r0, r1, x0, x1, tx, ty) { // smooth (bilinear) texture lookup
    const a = t[(r0 + x0) * 4 + c], b = t[(r0 + x1) * 4 + c], e = t[(r1 + x0) * 4 + c], f = t[(r1 + x1) * 4 + c];
    return (a + (b - a) * tx) * (1 - ty) + (e + (f - e) * tx) * ty;
}
function drawEarthSprite(P) {
    const b = P.built, o = b.img.data, n = P.R * P.R * 4, day = b.day, night = b.night, cloud = b.cloud;
    b.rot = (b.rot + P.spin * 2) % 1; // redrawn every second frame, so it turns twice as far each time
    const rc = (b.rot * 1.15 + 0.3) % 1; // clouds drift slightly faster than the ground
    for (let i = 0; i < n; i++) {
        const q = i * 4;
        if (!b.ga[i]) { o[q + 3] = 0; continue; }
        const t = b.gt[i], fy = b.gy[i], y0 = fy | 0, ty = fy - y0;
        const r0 = y0 * EW, r1 = Math.min(y0 + 1, EH - 1) * EW;
        const fx = (((b.gu[i] + b.rot) % 1 + 1) % 1) * EW, x0 = fx | 0, tx = fx - x0, x1 = (x0 + 1) % EW;
        const cx = (((b.gu[i] + rc) % 1 + 1) % 1) * EW, c0 = cx | 0, ct = cx - c0, c1 = (c0 + 1) % EW;
        const cov = bil(cloud, 0, r0, r1, c0, c1, ct, ty) / 255 * 0.92;
        let R_ = 0, G_ = 0, B_ = 0;
        if (t > 0.003) { // daylight
            const dr = bil(day, 0, r0, r1, x0, x1, tx, ty), dg = bil(day, 1, r0, r1, x0, x1, tx, ty), db = bil(day, 2, r0, r1, x0, x1, tx, ty);
            const sun = b.gs1[i], oc = Math.min(1, Math.max(0, (db - dr) / 70));
            const sp = oc > 0 ? b.gsp[i] * oc * (1 - cov) : 0;
            R_ = dr * sun + sp * 255; G_ = dg * sun + sp * 240; B_ = db * sun + sp * 215;
        }
        if (t < 0.997) { // city lights, hidden under clouds
            const k = (1 - t) * 1.8 * (1 - cov * 0.85);
            R_ += bil(night, 0, r0, r1, x0, x1, tx, ty) * k; G_ += bil(night, 1, r0, r1, x0, x1, tx, ty) * k; B_ += bil(night, 2, r0, r1, x0, x1, tx, ty) * k;
        }
        const cl = b.gcl[i] * cov; // clouds, lit by the sun
        o[q] = R_ * (1 - cov) + 250 * cl + b.ar[i]; o[q + 1] = G_ * (1 - cov) + 252 * cl + b.ag[i]; o[q + 2] = B_ * (1 - cov) + 255 * cl + b.ab[i]; o[q + 3] = b.ga[i];
    }
    b.ctx.putImageData(b.img, 0, 0);
}
function drawMoonSprite(b, mn, x, y) {
    const m = b.m, d = m.img.data, n = mn.r * mn.r * 4, rot = mn.a / 6.2832; // same face always toward Earth
    for (let i = 0; i < n; i++) {
        const q = i * 4;
        if (!m.ga[i]) { d[q + 3] = 0; continue; }
        const u = (((m.gu[i] + rot) % 1) + 1) % 1, k = (((m.gy[i] + 0.5) | 0) * MW + ((u * MW) | 0)) * 4;
        const s = 1.12 * Math.pow(Math.max(m.gd[i], 0), 0.85) + 0.025;
        d[q] = b.moon[k] * s; d[q + 1] = b.moon[k + 1] * s; d[q + 2] = b.moon[k + 2] * s + 3; d[q + 3] = m.ga[i];
    }
    m.ctx.putImageData(m.img, 0, 0);
    g.drawImage(m.off, x - mn.r, y - mn.r);
}
function drawEarth(P) {
    const b = P.built, mn = P.moons[0]; mn.a += mn.sp;
    if (++b.tick % 2 === 1) drawEarthSprite(P);
    g.save(); g.translate(C, C); g.rotate(TILT);
    g.lineWidth = 1; g.strokeStyle = "rgba(255,255,255,.08)";
    g.beginPath(); g.ellipse(0, 0, mn.o, mn.o * SQ, 0, 0, 6.2832); g.stroke();
    const mx = mn.o * Math.cos(mn.a), my = mn.o * SQ * Math.sin(mn.a), behind = Math.sin(mn.a) < 0;
    if (behind) drawMoonSprite(b, mn, mx, my);
    const halo = g.createRadialGradient(0, 0, P.R * 0.97, 0, 0, P.R * 1.16);
    halo.addColorStop(0, "rgba(100,170,255,.55)"); halo.addColorStop(0.35, "rgba(70,130,255,.2)"); halo.addColorStop(1, "rgba(60,110,255,0)");
    g.fillStyle = halo; g.beginPath(); g.arc(0, 0, P.R * 1.16, 0, 6.2832); g.fill();
    g.drawImage(b.off, -P.R, -P.R);
    if (!behind) drawMoonSprite(b, mn, mx, my);
    g.restore();
}

/* ----- shared drawing ----- */
const pc = document.getElementById("planetCanvas"), g = pc.getContext("2d");
const S = 760, C = S / 2, K = S / 640, TILT = -0.22, SQ = 0.3;
pc.width = pc.height = S;
let cur = 0; // Earth first

function drawMoon(m, x, y) {
    g.fillStyle = m.c; g.beginPath(); g.arc(x, y, m.r, 0, 6.2832); g.fill();
    const s = g.createRadialGradient(x - m.r * 0.4, y - m.r * 0.4, m.r * 0.2, x, y, m.r * 1.05);
    s.addColorStop(0, "rgba(0,0,0,0)"); s.addColorStop(1, "rgba(0,0,0,.8)");
    g.fillStyle = s; g.fill();
}
function drawRing(R, front) {
    g.save(); g.scale(1, SQ);
    for (const [a, b, al] of [[1.25, 1.45, 0.25], [1.47, 1.7, 0.55], [1.74, 1.95, 0.45], [2.0, 2.25, 0.3]]) {
        g.beginPath();
        g.arc(0, 0, R * (a + b) / 2, front ? 0 : Math.PI, front ? Math.PI : 6.2832);
        g.lineWidth = R * (b - a); g.strokeStyle = `rgba(214,196,160,${al})`; g.stroke();
    }
    g.restore();
}
function startBuild(P) { if (!P.built && !P.loading) (P.earth ? buildEarth(P) : buildPlanet(P)); }
function drawPlanet() {
    const P = PLANETS[cur];
    g.clearRect(0, 0, S, S);
    if (!P.built) { startBuild(P); return; }
    if (P.earth) { drawEarth(P); return; }
    drawSprite(P);
    g.save(); g.translate(C, C); g.scale(K, K); g.rotate(TILT);
    g.lineWidth = 1; g.strokeStyle = "rgba(255,255,255,.09)";
    for (const m of P.moons) { g.beginPath(); g.ellipse(0, 0, m.o, m.o * SQ, 0, 0, 6.2832); g.stroke(); m.a += m.sp; }
    for (const m of P.moons) if (Math.sin(m.a) < 0) drawMoon(m, m.o * Math.cos(m.a), m.o * SQ * Math.sin(m.a));
    if (P.rings) drawRing(P.R, false);
    const halo = g.createRadialGradient(0, 0, P.R * 0.95, 0, 0, P.R * 1.3);
    halo.addColorStop(0, P.glow + "66"); halo.addColorStop(1, P.glow + "00");
    g.fillStyle = halo; g.beginPath(); g.arc(0, 0, P.R * 1.3, 0, 6.2832); g.fill();
    g.drawImage(P.built.off, -P.R, -P.R);
    if (P.rings) drawRing(P.R, true);
    for (const m of P.moons) if (Math.sin(m.a) >= 0) drawMoon(m, m.o * Math.cos(m.a), m.o * SQ * Math.sin(m.a));
    g.restore();
}
function setPlanet(i) {
    cur = i; const P = PLANETS[i];
    startBuild(P);
    document.documentElement.style.setProperty("--c1", P.glow);
    document.getElementById("planetName").textContent = P.name;
    const names = P.moons.map(m => m.n);
    document.getElementById("moonInfo").textContent = names.length ? "Moons shown: " + names.join(", ") : "No moons.";
}
document.getElementById("planetBtn").addEventListener("click", () => setPlanet((cur + 1) % PLANETS.length));
setPlanet(cur);

/* ---------- starfield + parallax ---------- */
const cvs = document.getElementById("starfield"), ctx = cvs.getContext("2d");
const hero = document.getElementById("hero"), stage = document.getElementById("heroStage");
let stars = [], mx = 0, my = 0, tx = 0, ty = 0;
function sizeCanvas() {
    cvs.width = hero.clientWidth; cvs.height = hero.clientHeight;
    stars = Array.from({ length: 200 }, () => ({ x: Math.random() * cvs.width, y: Math.random() * cvs.height, z: Math.random() * 0.9 + 0.1, p: Math.random() * 6 }));
}
sizeCanvas();
window.addEventListener("resize", sizeCanvas);
hero.addEventListener("mousemove", e => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
});
hero.addEventListener("mouseleave", () => { tx = 0; ty = 0; });

(function loop(t = 0) {
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = "#fff";
    for (const s of stars) {
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t / 900 + s.p));
        ctx.beginPath();
        ctx.arc((s.x - mx * 80 * s.z + cvs.width) % cvs.width, (s.y - my * 80 * s.z + cvs.height) % cvs.height, s.z * 1.6, 0, 6.3);
        ctx.fill();
    }
    stage.style.transform = `translate(${mx * -24}px,${my * -24}px)`;
    drawPlanet();
    requestAnimationFrame(loop);
})();

/* ---------- render sections ---------- */
document.getElementById("missionGrid").innerHTML = MISSIONS.map(([n, s, d]) =>
    `<div class="info-card"><span class="badge">${s}</span><h3>${n}</h3><p>${d}</p></div>`).join("");
document.getElementById("astronautGrid").innerHTML = ASTRONAUTS.map(([n, a, d]) =>
    `<div class="info-card"><div class="avatar">★</div><h3>${n}</h3><p>${d}</p><span class="badge">${a}</span></div>`).join("");

/* ---------- NASA image of the day ---------- */
async function fetchApod() {
    // Try our backend first (keeps the key private and caches), then NASA directly.
    const problems = [];
    for (const u of [API + "/api/apod"]) {
        const host = new URL(u, location.href).host;
        try {
            const r = await fetch(u);
            if (!r.ok) { problems.push(host + " returned HTTP " + r.status); continue; }
            const d = await r.json();
            if (d && d.url) return d;
            problems.push(host + " sent no image");
        } catch (e) { problems.push(host + " unreachable"); }
    }
    throw new Error(problems.join("; "));
}
async function loadApod() {
    const media = document.getElementById("apodMedia");
    media.innerHTML = '<div class="skeleton"></div>';
    try {
        const d = await fetchApod();
        media.innerHTML = d.media_type === "video"
            ? `<iframe src="${d.url}" allowfullscreen title="${d.title}" allow="encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>`
            : `<img src="${d.url}" alt="${d.title}">`;
        document.getElementById("apodTitle").textContent = d.title;
        document.getElementById("apodDesc").textContent = d.explanation;
        document.getElementById("apodDate").textContent = d.date + (d.copyright ? " | " + d.copyright.trim() : "");
    } catch (err) {
        console.error("APOD:", err.message);
        media.innerHTML = "";
        document.getElementById("apodTitle").textContent = "Image unavailable";
        document.getElementById("apodDesc").innerHTML =
            'Could not load the image (' + err.message + '). <button class="btn btn-ghost" id="apodRetry">Try again</button>';
        document.getElementById("apodRetry").addEventListener("click", loadApod);
    }
}
loadApod();

/* ---------- latest updates (last 30 days, 5 visible, scroll for more) ---------- */
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
async function loadUpdates() {
    const list = document.getElementById("updateList");
    const meta = document.getElementById("updateMeta");
    const box = document.getElementById("updatesScroll");
    if (!list.children.length) meta.textContent = "Loading updates...";
    try {
        const r = await fetch(API + "/api/announcements");
        if (!r.ok) throw new Error("HTTP " + r.status);
        const items = await r.json();
        const top = box.scrollTop;
        list.innerHTML = items.map(a => `
            <li>
                <div class="u-text">
                    <time>${new Date(a.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} | ${esc(a.source)}</time>
                    <h3><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.title)}</a></h3>
                    <p>${esc(a.summary)}</p>
                </div>
                ${a.image ? `<img src="${esc(a.image)}" alt="" loading="lazy">` : ""}
            </li>`).join("");
        box.scrollTop = top;
        meta.textContent = !items.length ? "No updates in the last 30 days."
            : items.length <= 5 ? items.length + " updates from the last 30 days."
            : "Showing the latest 5. Scroll for " + (items.length - 5) + " more from the last 30 days.";
    } catch (e) {
        console.error("Updates:", e.message);
        meta.innerHTML = 'Could not load updates (' + esc(e.message) + '). <a href="#" id="updRetry">Try again</a>';
        document.getElementById("updRetry").addEventListener("click", ev => { ev.preventDefault(); loadUpdates(); });
    }
}
loadUpdates();
setInterval(loadUpdates, 10 * 60 * 1000); // pick up new announcements every 10 minutes

/* ---------- scroll reveal + CTA ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));
document.getElementById("ctaSearch").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => searchInput.focus(), 500);
});