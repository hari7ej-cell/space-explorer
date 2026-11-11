// Talks to the C++ object model (cpp/SpaceExplorer.cpp).
// Node writes one JSON object to the program's stdin and reads one JSON object back.
const path = require("path");
const fs = require("fs");
const { spawn, execFileSync } = require("child_process");

const source = path.resolve(__dirname, "../../cpp/SpaceExplorer.cpp");
const executable = path.resolve(__dirname, "../../cpp/bin/space_model.exe");

// Compile the C++ program when it is missing or older than its source (needs g++).
// If g++ is not installed, the existing build keeps working.
function buildIfOutdated() {
    const outdated = !fs.existsSync(executable) ||
        fs.statSync(source).mtimeMs > fs.statSync(executable).mtimeMs;
    if (!outdated) return;

    try {
        fs.mkdirSync(path.dirname(executable), { recursive: true });
        execFileSync("g++", ["-std=c++17", "-O2", "-o", executable, source], { stdio: "pipe" });
        console.log("C++ model compiled.");
    } catch {
        console.warn(fs.existsSync(executable)
            ? "g++ was not found, so the existing C++ build is used."
            : "The C++ model is missing and could not be compiled. Install g++ and restart.");
    }
}

buildIfOutdated();

function runCpp(input, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(executable)) {
            return reject(new Error(`C++ executable was not found: ${executable}`));
        }

        const cpp = spawn(executable, [], { windowsHide: true });
        let output = "";
        let errorOutput = "";
        let settled = false;

        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            callback(value);
        };

        const timeout = setTimeout(() => {
            cpp.kill();
            finish(reject, new Error(`C++ processing timed out after ${timeoutMs / 1000} seconds.`));
        }, timeoutMs);

        cpp.stdout.on("data", chunk => {
            output += chunk.toString();
            if (output.length > 5 * 1024 * 1024) {
                cpp.kill();
                finish(reject, new Error("C++ output exceeded the 5 MB safety limit."));
            }
        });
        cpp.stderr.on("data", chunk => {
            errorOutput = (errorOutput + chunk.toString()).slice(-1024 * 1024);
        });
        cpp.on("error", error => finish(reject, new Error(`Unable to start C++ executable: ${error.message}`)));
        cpp.on("close", code => {
            if (settled) return;
            if (code !== 0) {
                return finish(reject, new Error(errorOutput.trim() || `C++ program exited with code ${code}.`));
            }
            try {
                const parsed = JSON.parse(output);
                if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                    throw new Error("C++ returned JSON that is not an object.");
                }
                finish(resolve, parsed);
            } catch (error) {
                finish(reject, new Error(`Invalid JSON returned by C++: ${error.message}\nOutput:\n${output.slice(0, 4000)}`));
            }
        });

        cpp.stdin.on("error", error => {
            if (error.code !== "EPIPE") finish(reject, new Error(`Could not send data to C++: ${error.message}`));
        });
        cpp.stdin.end(JSON.stringify(input));
    });
}

// Space entity page: returns { type, summary, heroImage }.
function processPlanet(apiData) {
    if (!apiData || typeof apiData !== "object" || Array.isArray(apiData)) {
        return Promise.reject(new Error("Invalid entity data supplied to C++."));
    }
    if (typeof apiData.type !== "string" || !apiData.type.trim()) {
        return Promise.reject(new Error("A valid entity type is required by C++."));
    }
    return runCpp(apiData);
}

// Astronaut directory: returns the Set of ids that pass Astronaut::isValid(),
// or null when the C++ program is unavailable (the list is then used unfiltered).
async function validateAstronauts(people) {
    try {
        const records = people.map(({ id, name, agency, experience }) => ({ id, name, agency, experience }));
        const { valid } = await runCpp({ people: records }, 15000);
        return Array.isArray(valid) && valid.length ? new Set(valid) : null;
    } catch (error) {
        console.warn("C++ validation skipped:", error.message);
        return null;
    }
}

module.exports = { processPlanet, validateAstronauts };
