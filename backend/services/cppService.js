const path = require("path");
const { spawn } = require("child_process");

function processPlanet(planetData) {

    return new Promise((resolve, reject) => {

        const executable =
            path.join(
                __dirname,
                "../../cpp/bin/space_model.exe"
            );

        const cpp =
            spawn(executable, [
                planetData.title
            ]);

        let output = "";
        let errorOutput = "";

        cpp.stdout.on(
            "data",
            (data) => {
                output += data.toString();
            }
        );

        cpp.stderr.on(
            "data",
            (data) => {
                errorOutput +=
                    data.toString();
            }
        );

        cpp.on(
            "error",
            (error) => {
                reject(error);
            }
        );

        cpp.on(
            "close",
            (code) => {

                if (code !== 0) {

                    reject(
                        new Error(
                            errorOutput ||
                            "C++ process failed"
                        )
                    );

                    return;
                }

                resolve({
                    output: output.trim()
                });
            }
        );
    });
}

module.exports = {
    processPlanet
};