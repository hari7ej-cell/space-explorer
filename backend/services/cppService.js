const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

function processPlanet(apiData) {
    return new Promise((resolve, reject) => {
        if (!apiData || typeof apiData !== "object" || Array.isArray(apiData)) {
            return reject(new Error("Invalid entity data supplied to C++."));
        }
        if (typeof apiData.type !== "string" || !apiData.type.trim()) {
            return reject(new Error("A valid entity type is required by C++."));
        }

        const executable = path.resolve(__dirname, "../../cpp/bin/space_model.exe");
        if (!fs.existsSync(executable)) {
            return reject(new Error(`C++ executable was not found: ${executable}`));
        }

        const cpp = spawn(executable, [], { windowsHide: true });
        let output = "";
        let errorOutput = "";
        let settled = false;
        const timeout = setTimeout(() => {
            if (!settled) {
                settled = true;
                cpp.kill();
                reject(new Error("C++ processing timed out after 20 seconds."));
            }
        }, 20000);

        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            callback(value);
        };

        cpp.stdout.on("data", chunk => {
            output += chunk.toString();
            if (output.length > 5 * 1024 * 1024) {
                cpp.kill();
                finish(reject, new Error("C++ output exceeded the 5 MB safety limit."));
            }
        });
        cpp.stderr.on("data", chunk => {
            errorOutput += chunk.toString();
            if (errorOutput.length > 1024 * 1024) errorOutput = errorOutput.slice(-1024 * 1024);
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
        cpp.stdin.end(JSON.stringify(apiData));
    });
}

module.exports = { processPlanet };
