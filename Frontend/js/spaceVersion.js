import * as THREE from "https://unpkg.com/three@0.180.0/build/three.module.js";
import { supabase } from "./supabaseClient.js";


/* =========================================================
   LOGIN UI + SUPABASE SIGN UP
========================================================= */

const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const signupLink = document.getElementById("signupLink");
const backToLogin = document.getElementById("backToLogin");

const googleButton = document.getElementById("googleButton");
const authMessage = document.getElementById("authMessage");

const usernameInput = document.getElementById("username");
const loginPasswordInput = document.getElementById("password");

const signupUsername = document.getElementById("signupUsername");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");

/* ---------- Password Toggle ---------- */

if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener("click", () => {

        const isPassword = passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";

        passwordToggle.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );
    });
}

/* ---------- Switch Between Forms ---------- */

signupLink?.addEventListener("click", (event) => {

    event.preventDefault();

    loginForm.hidden = true;
    signupForm.hidden = false;

    authMessage.textContent = "";
});

backToLogin?.addEventListener("click", (event) => {

    event.preventDefault();

    signupForm.hidden = true;
    loginForm.hidden = false;

    authMessage.textContent = "";
});

/* ---------- Sign Up ---------- */

signupForm?.addEventListener("submit", async (event) => {

    event.preventDefault();

    authMessage.textContent = "Creating account...";

    const { error } = await supabase.auth.signUp({

        email: signupEmail.value.trim(),

        password: signupPassword.value,

        options: {

            data: {
                username: signupUsername.value.trim()
            }
        }
    });

    if (error) {

        authMessage.textContent = error.message;
        return;
    }

    authMessage.textContent =
        "Account created! Check your email to verify your account.";

    signupForm.reset();

    signupForm.hidden = true;
    loginForm.hidden = false;
});



/* ---------- Login via Backend ---------- */

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    authMessage.textContent = "Signing in...";

    const identifier = usernameInput.value.trim();
    const password = loginPasswordInput.value;

    try {
        const response = await fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                identifier,
                password
            })
        });

        const result = await response.json();

        if (!response.ok) {
            authMessage.textContent =
                result.error || "Login failed. Please try again.";
            return;
        }

        const { error } = await supabase.auth.setSession({
            access_token: result.access_token,
            refresh_token: result.refresh_token
        });

        if (error) {
            authMessage.textContent =
                "Login succeeded, but the session could not be saved. Please try again.";
            console.error("Session error:", error.message);
            return;
        }

        authMessage.textContent = "Login successful! Welcome back.";
        loginForm.reset();

    } catch (error) {
        console.error("Login request failed:", error);
        authMessage.textContent =
            "Cannot connect to the backend. Please check that the server is running.";
    }
});



/* ---------- Google Button (later) ---------- */

googleButton?.addEventListener("click", () => {

    console.log("Google login will be connected later.");
});


/* =========================================================
   TWINKLING STARS
========================================================= */

function createStarField() {

    const oldField =
        document.querySelector(".star-field");

    if (oldField) {
        oldField.remove();
    }

    const spaceScene =
        document.querySelector(".space-scene");

    if (!spaceScene) return;

    const field =
        document.createElement("div");

    field.className = "star-field";

    spaceScene.appendChild(field);


    for (let i = 0; i < 90; i++) {

        const star =
            document.createElement("span");

        star.className =
            "twinkle-star";

        star.style.left =
            `${Math.random() * 100}%`;

        star.style.top =
            `${Math.random() * 100}%`;


        const size =
            Math.random() < 0.85
                ? Math.random() * 1.4 + 0.6
                : Math.random() * 2 + 1;


        star.style.width =
            `${size}px`;

        star.style.height =
            `${size}px`;


        star.style.setProperty(
            "--twinkle-duration",
            `${2.5 + Math.random() * 5}s`
        );


        star.style.setProperty(
            "--twinkle-delay",
            `${Math.random() * 5}s`
        );


        field.appendChild(star);
    }
}

createStarField();


/* =========================================================
   THREE.JS
========================================================= */

const canvas =
    document.getElementById("space-canvas");

if (!canvas) {

    console.error(
        "Three.js canvas not found."
    );

    throw new Error(
        "Missing #space-canvas"
    );
}


const scene =
    new THREE.Scene();


/* =========================================================
   RENDERER
========================================================= */

const renderer =
    new THREE.WebGLRenderer({

        canvas: canvas,

        alpha: true,

        antialias: true
    });


renderer.setPixelRatio(
    Math.min(
        window.devicePixelRatio,
        2
    )
);


renderer.setClearColor(
    0x000000,
    0
);


/* =========================================================
   CAMERA
========================================================= */

let width =
    window.innerWidth;

let height =
    window.innerHeight;


const camera =
    new THREE.OrthographicCamera(

        -width / 2,
        width / 2,

        height / 2,
        -height / 2,

        1,
        3000
    );


camera.position.set(
    0,
    0,
    1000
);


camera.lookAt(
    0,
    0,
    0
);



/* =========================================================
   LIGHTING
========================================================= */

const sunLight = new THREE.DirectionalLight(0xffe3b0, 3.0);

// Light comes from the Sun's direction
sunLight.position.set(-700, 500, 900);

scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0x18243a, 0.12);
scene.add(ambientLight);


/* =========================================================
   TEXTURES
========================================================= */

const textureLoader =
    new THREE.TextureLoader();


const earthTexture =
    textureLoader.load(

        "assets/images/earth-texture.png",

        () => {
            console.log(
                "✓ Earth texture loaded"
            );
        },

        undefined,

        () => {
            console.error(
                "✗ Earth texture failed"
            );
        }
    );


earthTexture.colorSpace =
    THREE.SRGBColorSpace;


const moonTexture =
    textureLoader.load(

        "assets/images/moon-texture.jpg",

        () => {
            console.log(
                "✓ Moon texture loaded"
            );
        },

        undefined,

        () => {
            console.error(
                "✗ Moon texture failed"
            );
        }
    );


moonTexture.colorSpace =
    THREE.SRGBColorSpace;


/* =========================================================
   EARTH
========================================================= */

const earthRadius =
    Math.min(

        window.innerWidth * 0.145,

        window.innerHeight * 0.255
    );


const earthGeometry =
    new THREE.SphereGeometry(

        earthRadius,

        96,

        64
    );


const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture,
    shininess: 8,
    specular: new THREE.Color(0x142033),
    emissive: new THREE.Color(0x02050a),
    emissiveIntensity: 0.08
});

const earth =
    new THREE.Mesh(
        earthGeometry,
        earthMaterial
    );


/* =========================================================
   EARTH TILT SYSTEM
========================================================= */

/*
   This group controls the TILT of Earth's rotational axis.

   The Earth itself will rotate independently inside this
   group.

   This separation is important:
   - earthTilt = controls Earth's tilt
   - earth     = controls Earth's self-rotation
*/

const earthTilt = new THREE.Group();

earthTilt.rotation.z = THREE.MathUtils.degToRad(23.5);

earthTilt.add(earth);


/* =========================================================
   EARTH POSITION
========================================================= */

function positionEarth() {

    earthTilt.position.set(

        -window.innerWidth * 0.305,

        -window.innerHeight * 0.075,

        0
    );
}


positionEarth();

scene.add(
    earthTilt
);


/* =========================================================
   EARTH ATMOSPHERE
========================================================= */

const atmosphereGeometry =
    new THREE.SphereGeometry(

        earthRadius * 1.035,

        64,

        48
    );


const atmosphereMaterial =
    new THREE.MeshBasicMaterial({

        color: 0x4da6ff,

        transparent: true,

        opacity: 0.075,

        side: THREE.BackSide,

        blending:
            THREE.AdditiveBlending
    });


const atmosphere =
    new THREE.Mesh(

        atmosphereGeometry,

        atmosphereMaterial
    );


earth.add(
    atmosphere
);


// ================================
// EARTH CLOUD LAYER
// ================================

const cloudTexture = textureLoader.load(
    "assets/images/earth-clouds.jpg"
);

cloudTexture.colorSpace = THREE.SRGBColorSpace;

const cloudGeometry = new THREE.SphereGeometry(
    earthRadius * 1.012,
    96,
    64
);

const cloudMaterial = new THREE.MeshPhongMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.50,
    depthWrite: false,
    shininess: 5
});

const clouds = new THREE.Mesh(
    cloudGeometry,
    cloudMaterial
);

earth.add(clouds);


/* =========================================================
   MOON
========================================================= */

const moonRadius =
    Math.max(

        28,

        Math.min(

            window.innerWidth * 0.024,

            window.innerHeight * 0.04
        )
    );


const moonGeometry =
    new THREE.SphereGeometry(

        moonRadius,

        64,

        48
    );


const moonMaterial =
    new THREE.MeshPhongMaterial({

        map: moonTexture,

        shininess: 2,

        specular:
            new THREE.Color(
                0x111111
            )
    });


const moon =
    new THREE.Mesh(

        moonGeometry,

        moonMaterial
    );
    
/* =========================================================
   EARTH-CENTERED MOON SYSTEM
========================================================= */

/*
   This is the important part.

   The orbit center is EXACTLY the Earth's center.

   The Moon is a child of this group.

   Therefore rotating the group makes the Moon
   revolve around Earth.
*/

const moonSystem = new THREE.Group();

moonSystem.position.copy(
    earthTilt.position
);

scene.add(
    moonSystem
);


// Tilted orbital plane
const orbitPlane = new THREE.Group();

/*
   Moon's orbital plane is aligned with the
   tilted North-South direction of Earth.
*/

orbitPlane.rotation.z =
    THREE.MathUtils.degToRad(23.5);

moonSystem.add(
    orbitPlane
);


// Moon revolves inside the tilted plane
const moonOrbit = new THREE.Group();

orbitPlane.add(
    moonOrbit
);


/* =========================================================
   MOON ORBIT SIZE
========================================================= */

/*
   The orbit is deliberately larger than the Moon,
   but not so large that it disappears behind the
   login card.
*/

const orbitX = earthRadius * 1.45;
const orbitY = earthRadius * 1.65;


/* =========================================================
   ORBIT LINE
========================================================= */

/*
   Create the orbit around the Earth itself.
   This replaces the old SVG orbit.
*/

const orbitPoints = [];


const orbitSegments = 160;


for (
    let i = 0;
    i <= orbitSegments;
    i++
) {

    const angle =
        (i / orbitSegments) *
        Math.PI *
        2;


    orbitPoints.push(

        new THREE.Vector3(

            Math.cos(angle) * orbitX,

            Math.sin(angle) * orbitY,

            0
        )
    );
}


const orbitGeometry =
    new THREE.BufferGeometry()
        .setFromPoints(
            orbitPoints
        );


const orbitMaterial =
    new THREE.LineBasicMaterial({

        color: 0x3d8dcc,

        transparent: true,

        opacity: 0
    });


const orbitLine =
    new THREE.LineLoop(

        orbitGeometry,

        orbitMaterial
    );


/*
   The orbit is attached to the same Earth-centered
   group as the Moon.
*/

orbitPlane.add(
    orbitLine
);

/* =========================================================
   MOON INITIAL POSITION
========================================================= */

/*
   IMPORTANT:

   The Moon is now placed in LOCAL coordinates
   relative to Earth.

   We deliberately put it on the upper-right side
   where it is NOT hidden by the login card.
*/

const startingAngle =
    Math.PI / 2;


moon.position.set(
    Math.cos(startingAngle) * orbitX,
    Math.sin(startingAngle) * orbitY,
    0
);

moonOrbit.add(moon);


/* =========================================================
   MOON ROTATION
========================================================= */

moon.rotation.x = THREE.MathUtils.degToRad(0);


/* =========================================================
   ANIMATION SPEEDS
========================================================= */

const EARTH_ROTATION_SPEED = 0.0018;

const CLOUD_ROTATION_SPEED = 0.00215;

const MOON_ORBIT_SPEED = 0.004;

const MOON_ROTATION_SPEED = 0.0022;


/* =========================================================
   REALISTIC COMET SHOWER
========================================================= */

const cometGroup = new THREE.Group();
scene.add(cometGroup);

const cometTexture = createCometTexture();

function createCometTexture() {

    const canvas = document.createElement("canvas");

    canvas.width = 256;
    canvas.height = 128;

    const ctx = canvas.getContext("2d");

    /*
       Soft atmospheric glow around the comet head
    */
    const glow = ctx.createRadialGradient(
        128, 64, 2,
        128, 64, 64
    );

    glow.addColorStop(
        0,
        "rgba(255,255,255,1)"
    );

    glow.addColorStop(
        0.08,
        "rgba(235,250,255,1)"
    );

    glow.addColorStop(
        0.22,
        "rgba(150,220,255,0.8)"
    );

    glow.addColorStop(
        0.45,
        "rgba(80,170,255,0.35)"
    );

    glow.addColorStop(
        0.75,
        "rgba(50,120,255,0.10)"
    );

    glow.addColorStop(
        1,
        "rgba(0,0,0,0)"
    );

    ctx.fillStyle = glow;

    ctx.fillRect(
        64,
        0,
        128,
        128
    );


    /*
       Very bright central nucleus
    */
    const nucleus =
        ctx.createRadialGradient(
            128, 64, 0,
            128, 64, 18
        );

    nucleus.addColorStop(
        0,
        "rgba(255,255,255,1)"
    );

    nucleus.addColorStop(
        0.35,
        "rgba(220,245,255,1)"
    );

    nucleus.addColorStop(
        1,
        "rgba(130,210,255,0)"
    );

    ctx.fillStyle = nucleus;

    ctx.beginPath();

    ctx.arc(
        128,
        64,
        18,
        0,
        Math.PI * 2
    );

    ctx.fill();


    const texture =
        new THREE.CanvasTexture(canvas);

    texture.colorSpace =
        THREE.SRGBColorSpace;

    return texture;
}

function createComet() {

    const comet = new THREE.Group();

    /*
       START: upper-right corner
       END: approximately middle of screen
    */
    const startX = window.innerWidth * 0.52;
    const startY = window.innerHeight * 0.52;

    const endX = 0;
    const endY = 0;

    /*
       Head
    */
    const headMaterial = new THREE.SpriteMaterial({
        map: cometTexture,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const head = new THREE.Sprite(headMaterial);

    head.scale.set(42, 42, 1);

    comet.add(head);


    /*
       Direction:
       upper-right → middle
    */
    const start = new THREE.Vector3(
        startX,
        startY,
        120
    );

    const end = new THREE.Vector3(
        endX,
        endY,
        120
    );

    comet.position.copy(start);

    const direction = new THREE.Vector3()
        .subVectors(end, start)
        .normalize();


    /*
   ==========================================
   COMET TAIL
   ==========================================

   The comet moves from upper-right → center.

   Therefore the tail must point in the
   opposite direction: center → upper-right.
*/

// ==========================================
// OVAL COMET TAIL
// Uses the SAME texture as the comet head
// ==========================================

const tailDirection = direction.clone().negate();

const tailAngle = Math.atan2(
    tailDirection.y,
    tailDirection.x
);

// Create several overlapping copies of the SAME comet texture
const tailCount = 12;

for (let i = 1; i <= tailCount; i++) {

    const tailMaterial = new THREE.SpriteMaterial({
        map: cometTexture,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const tail = new THREE.Sprite(tailMaterial);

    // Each texture becomes progressively smaller
    const size = 38 - (i * 3.2);

    tail.scale.set(size * 1.8, size, 1);

    tail.rotation.z = tailAngle;

    // Closely overlap each texture
    const distance = i * 5;

    tail.position.set(
        tailDirection.x * distance,
        tailDirection.y * distance,
        -i * 0.1
    );

    comet.add(tail);
}


    comet.userData = {
        start,
        end,
        direction,
        progress: 0,
        speed: 1,
        life: 0,
        duration: 3.8 + Math.random() * 1.4
    };

    cometGroup.add(comet);
}


/* =========================================================
   COMET ANIMATION
========================================================= */

function animateComets(delta) {

    for (
        let i = cometGroup.children.length - 1;
        i >= 0;
        i--
    ) {

        const comet =
            cometGroup.children[i];

        const data =
            comet.userData;

        data.progress +=
            delta / data.duration;

        data.life += delta;

        const t =
            Math.min(data.progress, 1);

        /*
           Smooth acceleration/deceleration
        */
        const smoothT = t;

        comet.position.lerpVectors(
            data.start,
            data.end,
            smoothT
        );

        /*
           Fade near the end
        */
        const fade =
    t < 0.10
        ? t / 0.10
        : t > 0.72
            ? 1 - ((t - 0.72) / 0.28)
            : 1;

        comet.children.forEach(
            child => {

                if (child.material) {

                    child.material.opacity =
                        fade *
                        (
                            child === comet.children[0]
                                ? 1
                                : 0.7
                        );
                }
            }
        );

        /*
           Remove after reaching middle
        */
        if (t >= 1) {

            cometGroup.remove(comet);

            comet.children.forEach(
                child => {

                    if (child.geometry) {
                        child.geometry.dispose();
                    }

                    if (child.material) {
                        child.material.dispose();
                    }
                }
            );
        }
    }
}


/* =========================================================
   PERIODIC COMET SHOWER
========================================================= */

let cometTimer = 0;

let nextCometTime =
    8 + Math.random() * 4;


function updateCometShower(delta) {

    cometTimer += delta;

    if (cometTimer >= nextCometTime) {

        cometTimer = 0;

        /*
           Set a new random interval
           for the next comet.
        */
        nextCometTime =
            8 + Math.random() * 4;

        createComet();
    }
}



/* =========================================================
   RESIZE
========================================================= */

function resizeScene() {

    width =
        window.innerWidth;

    height =
        window.innerHeight;


    camera.left =
        -width / 2;

    camera.right =
        width / 2;

    camera.top =
        height / 2;

    camera.bottom =
        -height / 2;


    camera.updateProjectionMatrix();


    renderer.setSize(
        width,
        height,
        false
    );


    positionEarth();


    /*
       The Moon's orbit follows Earth.
    */

    moonSystem.position.copy(
        earthTilt.position
    );
}


window.addEventListener(
    "resize",
    resizeScene
);


resizeScene();


/* =========================================================
   ANIMATION LOOP
========================================================= */

const clock =
    new THREE.Clock();


function animate() {

    requestAnimationFrame(
        animate
    );


    const delta =
        clock.getDelta();


    /* ---------------------------------------------
       EARTH SELF ROTATION
    --------------------------------------------- */

    earth.rotation.y += EARTH_ROTATION_SPEED;

    clouds.rotation.y += CLOUD_ROTATION_SPEED;


    /* ---------------------------------------------
       MOON ORBITS EARTH
    --------------------------------------------- */

    moonOrbit.rotation.z -=
        MOON_ORBIT_SPEED *
        delta *
        60;


    /* ---------------------------------------------
       MOON SELF ROTATION
    --------------------------------------------- */

    moon.rotation.y +=
        MOON_ROTATION_SPEED *
        delta *
        60;
        

    animateComets(delta);
    updateCometShower(delta);


    renderer.render(
        scene,
        camera
    );
}


animate();