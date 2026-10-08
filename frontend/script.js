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
const UPDATES = [
    ["Placeholder", "Latest mission news will appear here", "Connected to the announcements feed later."],
    ["Placeholder", "New planet data added", "Planet pages are powered by the backend API."],
    ["Placeholder", "Search is coming soon", "Find any planet, mission or astronaut."]
];

/* ---------- noise helpers (procedural planet textures) ---------- */
const hash = (i, j, k) => {
    let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
const lerp = (a, b, t) => a + (b - a) * t;
const sm = t => t * t * (3 - 2 * t);
const ss = (a, b, x) => sm(Math.min(1, Math.max(0, (x - a) / (b - a))));
function vn(x, y, z) {
    const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
    const u = sm(x - i), v = sm(y - j), w = sm(z - k);
    return lerp(
        lerp(lerp(hash(i, j, k), hash(i + 1, j, k), u), lerp(hash(i, j + 1, k), hash(i + 1, j + 1, k), u), v),
        lerp(lerp(hash(i, j, k + 1), hash(i + 1, j, k + 1), u), lerp(hash(i, j + 1, k + 1), hash(i + 1, j + 1, k + 1), u), v), w);
}
function fbm(x, y, z, o = 4) {
    let a = 0.5, s = 0, f = 1;
    for (let n = 0; n < o; n++) { s += a * vn(x * f, y * f, z * f); a /= 2; f *= 2; }
    return s;
}
const mixC = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const ang = a => Math.atan2(Math.sin(a), Math.cos(a));

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const CRATERS = Array.from({ length: 70 }, () => {
    const lo = rnd() * 6.283, la = Math.asin(rnd() * 2 - 1), r = 0.05 + rnd() * 0.14;
    return [Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo), Math.cos(r), r];
});

/* ---------- planets: size, texture recipe, moons ---------- */
const M = (n, r, o, sp, c) => ({ n, r, o, sp, c, a: rnd() * 6.283 });
const PLANETS = [
    { name: "Mercury", R: 90, spin: 0.0004, glow: "#9a9a9a", moons: [],
      tex: (x, y, z) => {
          let g = 60 + fbm(x * 4, y * 4, z * 4, 5) * 120;
          for (const c of CRATERS) {
              const d = x * c[0] + y * c[1] + z * c[2];
              if (d > c[3]) { const t = Math.acos(Math.min(1, d)) / c[4]; g *= t < 0.85 ? 0.78 + 0.22 * t : 1.15 - (t - 0.85); }
          }
          return [g, g * 0.97, g * 0.93];
      } },
    { name: "Venus", R: 130, spin: 0.0003, glow: "#e8c27a", moons: [],
      tex: (x, y, z) => {
          const w = fbm(x * 3, y * 3, z * 3, 3), n = fbm(x * 2 + w * 1.6, y * 4 + w, z * 2, 5);
          return mixC([205, 160, 95], [245, 222, 160], ss(0.25, 0.7, n));
      } },
    { name: "Earth", R: 135, spin: 0.0008, glow: "#5aa9ff", moons: [M("Moon", 12, 250, 0.01, "#cfcfcf")],
      tex: (x, y, z, la) => {
          const h = fbm(x * 2 + 5, y * 2, z * 2, 6);
          let c = h > 0.5
              ? mixC([62, 112, 52], [150, 125, 80], ss(0.4, 0.65, fbm(x * 5, y * 5, z * 5, 3)))
              : mixC([8, 35, 105], [30, 95, 175], ss(0.28, 0.5, h));
          c = mixC(c, [240, 246, 252], ss(1.15, 1.35, Math.abs(la) + (fbm(x * 6, y * 6, z * 6, 3) - 0.5) * 0.3));
          return mixC(c, [255, 255, 255], ss(0.5, 0.72, fbm(x * 3 + 9, y * 3 + 3, z * 3, 5)) * 0.85);
      } },
    { name: "Mars", R: 105, spin: 0.0008, glow: "#e98a5b",
      moons: [M("Phobos", 5, 170, 0.02, "#8a7d73"), M("Deimos", 4, 225, 0.012, "#a09484")],
      tex: (x, y, z, la) => {
          let c = mixC([205, 120, 70], [170, 85, 45], ss(0.3, 0.65, fbm(x * 3, y * 3, z * 3, 5)));
          c = mixC(c, [95, 50, 35], ss(0.45, 0.62, fbm(x * 1.6 + 4, y * 1.6, z * 1.6, 4)) * 0.7);
          return mixC(c, [245, 240, 235], ss(1.38, 1.5, Math.abs(la)));
      } },
    { name: "Jupiter", R: 150, spin: 0.0015, glow: "#e6c9a0",
      moons: [M("Io", 7, 190, 0.02, "#e8d36a"), M("Europa", 6, 225, 0.015, "#d9d2c3"),
              M("Ganymede", 9, 262, 0.011, "#a39c91"), M("Callisto", 8, 300, 0.008, "#6f6759")],
      tex: (x, y, z, la, lo) => {
          const b = Math.sin(la * 13 + fbm(x * 3, y * 8, z * 3, 4) * 3.2) * 0.5 + 0.5;
          let c = mixC([236, 216, 184], [168, 108, 70], ss(0.25, 0.75, b));
          c = mixC(c, [120, 80, 55], ss(0.55, 0.75, fbm(x * 10, y * 14, z * 10, 3)) * 0.35);
          const e = (ang(lo - 3.5) / 0.3) ** 2 + ((la + 0.38) / 0.11) ** 2;
          return e < 1 ? mixC(c, [190, 85, 55], (1 - e) * 0.9) : c;
      } },
    { name: "Saturn", R: 105, spin: 0.0012, glow: "#f0dba5", rings: true,
      moons: [M("Enceladus", 4, 258, 0.016, "#f2f6f8"), M("Rhea", 6, 282, 0.011, "#bdb8b0"), M("Titan", 10, 305, 0.008, "#d9a441")],
      tex: (x, y, z, la) => mixC([192, 160, 112], [232, 208, 158], Math.sin(la * 11 + fbm(x * 3, y * 6, z * 3, 3) * 2) * 0.5 + 0.5) },
    { name: "Uranus", R: 115, spin: 0.001, glow: "#9be8ef",
      moons: [M("Miranda", 4, 170, 0.018, "#aaaaaa"), M("Titania", 7, 230, 0.011, "#b5a99a"), M("Oberon", 7, 280, 0.008, "#8d8378")],
      tex: (x, y, z, la) => mixC([140, 214, 222], [165, 230, 234], Math.sin(la * 8 + fbm(x * 3, y * 3, z * 3, 3) * 2) * 0.5 + 0.5) },
    { name: "Neptune", R: 118, spin: 0.001, glow: "#5b7cff",
      moons: [M("Triton", 7, 240, -0.01, "#cdb9b0")],
      tex: (x, y, z, la, lo) => {
          const b = Math.sin(la * 9 + fbm(x * 3, y * 3, z * 3, 4) * 2.5) * 0.5 + 0.5;
          const c = mixC([30, 60, 165], [70, 115, 225], b);
          const e = (ang(lo - 1) / 0.3) ** 2 + ((la + 0.35) / 0.12) ** 2;
          return e < 1 ? mixC(c, [15, 30, 100], (1 - e) * 0.8) : c;
      } }
];

/* ---------- sphere renderer ---------- */
const TW = 256, TH = 128, LIGHT = [-0.55, 0.4, 0.73];
function buildPlanet(P) {
    const t = new Uint8ClampedArray(TW * TH * 4);
    for (let v = 0; v < TH; v++) for (let u = 0; u < TW; u++) {
        const lo = (u / TW) * 6.2832, la = (0.5 - (v + 0.5) / TH) * Math.PI, cl = Math.cos(la);
        const c = P.tex(cl * Math.cos(lo), Math.sin(la), cl * Math.sin(lo), la, lo);
        const k = (v * TW + u) * 4;
        t[k] = c[0]; t[k + 1] = c[1]; t[k + 2] = c[2]; t[k + 3] = 255;
    }
    const R = P.R, D = 2 * R, n = D * D;
    const gu = new Float32Array(n), gv = new Uint8Array(n), gs = new Float32Array(n), ga = new Uint8Array(n);
    for (let py = 0; py < D; py++) for (let px = 0; px < D; px++) {
        const i = py * D + px, nx = (px + 0.5 - R) / R, ny = -(py + 0.5 - R) / R, d2 = nx * nx + ny * ny;
        if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2), la = Math.asin(ny);
        gu[i] = Math.atan2(nx, nz) / 6.2832;
        gv[i] = Math.min(TH - 1, Math.max(0, Math.floor((0.5 - la / Math.PI) * TH)));
        const dot = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
        gs[i] = (Math.pow(dot, 0.8) * 1.05 + 0.06) * (0.75 + 0.25 * nz);
        ga[i] = Math.min(255, (1 - Math.sqrt(d2)) * R / 1.2 * 255);
    }
    const off = document.createElement("canvas"); off.width = off.height = D;
    P.built = { t, gu, gv, gs, ga, off, ctx: off.getContext("2d"), img: new ImageData(D, D), rot: 0 };
}

const pc = document.getElementById("planetCanvas"), g = pc.getContext("2d");
const S = 640, C = S / 2, TILT = -0.22, SQ = 0.3;
pc.width = pc.height = S;
let cur = 3;

function drawSprite(P) {
    const b = P.built, d = b.img.data, n = P.R * P.R * 4;
    b.rot = (b.rot + P.spin) % 1;
    for (let i = 0; i < n; i++) {
        const o = i * 4;
        if (!b.ga[i]) { d[o + 3] = 0; continue; }
        const u = (((b.gu[i] + b.rot) % 1) + 1) % 1, k = (b.gv[i] * TW + ((u * TW) | 0)) * 4, s = b.gs[i];
        d[o] = b.t[k] * s; d[o + 1] = b.t[k + 1] * s; d[o + 2] = b.t[k + 2] * s; d[o + 3] = b.ga[i];
    }
    b.ctx.putImageData(b.img, 0, 0);
}
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
function drawPlanet() {
    const P = PLANETS[cur]; if (!P.built) buildPlanet(P);
    drawSprite(P);
    g.clearRect(0, 0, S, S);
    g.save(); g.translate(C, C); g.rotate(TILT);
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
    document.documentElement.style.setProperty("--c1", P.glow);
    document.getElementById("planetName").textContent = P.name;
    const names = P.moons.map(m => m.n);
    document.getElementById("moonInfo").textContent =
        names.length ? "Moons shown: " + names.join(", ") : "No moons.";
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
document.getElementById("updateList").innerHTML = UPDATES.map(([d, t, p]) =>
    `<li><time>${d}</time><h3>${t}</h3><p>${p}</p></li>`).join("");

/* ---------- NASA image of the day ---------- */
async function fetchApod() {
    // Try our backend first (keeps the key private and caches), then NASA directly.
    for (const u of ["http://localhost:3000/api/apod", "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY"]) {
        try {
            const r = await fetch(u);
            if (r.ok) { const d = await r.json(); if (d && d.url) return d; }
        } catch (e) { /* try next source */ }
    }
    throw new Error("APOD unavailable");
}
async function loadApod() {
    const media = document.getElementById("apodMedia");
    media.innerHTML = '<div class="skeleton"></div>';
    try {
        const d = await fetchApod();
        media.innerHTML = d.media_type === "video"
            ? `<iframe src="${d.url}" allowfullscreen title="${d.title}"></iframe>`
            : `<img src="${d.url}" alt="${d.title}">`;
        document.getElementById("apodTitle").textContent = d.title;
        document.getElementById("apodDesc").textContent = d.explanation;
        document.getElementById("apodDate").textContent = d.date + (d.copyright ? " | " + d.copyright.trim() : "");
    } catch (err) {
        media.innerHTML = "";
        document.getElementById("apodTitle").textContent = "Image unavailable";
        document.getElementById("apodDesc").innerHTML =
            'NASA did not respond. This is usually the shared DEMO_KEY rate limit. <button class="btn btn-ghost" id="apodRetry">Try again</button>';
        document.getElementById("apodRetry").addEventListener("click", loadApod);
    }
}
loadApod();

/* ---------- scroll reveal + CTA ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));
document.getElementById("ctaSearch").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => searchInput.focus(), 500);
});
