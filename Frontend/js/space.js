import * as THREE from "https://unpkg.com/three@0.180.0/build/three.module.js";


/* =========================================================
   LOGIN UI
========================================================= */

const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("password-toggle");

if (passwordToggle && passwordInput) {

    passwordToggle.addEventListener("click", () => {

        passwordInput.type =
            passwordInput.type === "password"
                ? "text"
                : "password";
    });
}


const loginForm = document.getElementById("login-form");

if (loginForm) {

    loginForm.addEventListener("submit", (event) => {

        event.preventDefault();

        console.log("Login button clicked.");
    });
}


const googleButton = document.getElementById("google-login");

if (googleButton) {

    googleButton.addEventListener("click", () => {

        console.log("Google login clicked.");
    });
}


const signupButton = document.getElementById("signup");

if (signupButton) {

    signupButton.addEventListener("click", () => {

        console.log("Sign up clicked.");
    });
}


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

const sunLight =
    new THREE.DirectionalLight(
        0xffe3b0,
        2.2
    );


sunLight.position.set(
    -500,
    450,
    800
);


scene.add(
    sunLight
);


const ambientLight =
    new THREE.AmbientLight(
        0x64708a,
        0.42
    );


scene.add(
    ambientLight
);


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
    shininess: 10,
    specular: new THREE.Color(0x1e2938),

    // Add a very subtle lift
    emissive: new THREE.Color(0x071426),
    emissiveIntensity: 0.18
});

const earth =
    new THREE.Mesh(

        earthGeometry,

        earthMaterial
    );


/* =========================================================
   EARTH POSITION
========================================================= */

function positionEarth() {

    earth.position.set(

        -window.innerWidth * 0.305,

        -window.innerHeight * 0.075,

        0
    );
}


positionEarth();

scene.add(
    earth
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
    earth.position
);

scene.add(
    moonSystem
);


// Tilted orbital plane
const orbitPlane = new THREE.Group();

orbitPlane.rotation.set(
    THREE.MathUtils.degToRad(68),
    0,
    THREE.MathUtils.degToRad(22)
);

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

const orbitX =
    earthRadius * 1.55;


const orbitY =
    earthRadius * 1.45;


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

        opacity: 0.72
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
    Math.PI * 0.32;


moon.position.set(

    Math.cos(startingAngle) *
        orbitX,

    Math.sin(startingAngle) *
        orbitY,

    0
);


moonOrbit.add(
    moon
);


/* =========================================================
   MOON ROTATION
========================================================= */

moon.rotation.x =
    THREE.MathUtils.degToRad(8);


/* =========================================================
   ANIMATION SPEEDS
========================================================= */

const EARTH_ROTATION_SPEED = 0.0018;

const CLOUD_ROTATION_SPEED = 0.00215;

const MOON_ORBIT_SPEED = 0.00035;

const MOON_ROTATION_SPEED = 0.0022;



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
        earth.position
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
    earth.rotation.z = THREE.MathUtils.degToRad(22);

    clouds.rotation.y += CLOUD_ROTATION_SPEED;
    clouds.rotation.z = THREE.MathUtils.degToRad(22);


    /* ---------------------------------------------
       MOON ORBITS EARTH
    --------------------------------------------- */

    moonOrbit.rotation.z +=
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


    renderer.render(
        scene,
        camera
    );
}


animate();