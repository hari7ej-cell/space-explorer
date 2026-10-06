const path = require("path");
const { spawn } = require("child_process");

function processPlanet(apiData) {
    return new Promise((resolve, reject) => {
        const executable = path.join(__dirname, "../../cpp/bin/space_model.exe");
        const cpp = spawn(executable);
        let output = "";
        let errorOutput = "";

        cpp.stdout.on("data", data => { output += data.toString(); });
        cpp.stderr.on("data", data => { errorOutput += data.toString(); });
        cpp.on("error", reject);
        cpp.on("close", code => {
            if (code !== 0) {
                reject(new Error(errorOutput || "C++ program failed"));
                return;
            }
            try { resolve(JSON.parse(output)); }
            catch (error) {
                reject(new Error("Invalid JSON returned by C++: " + error.message + "\nOutput:\n" + output));
            }
        });

        cpp.stdin.write(JSON.stringify(apiData));
        cpp.stdin.end();
    });
}

module.exports = { processPlanet };
