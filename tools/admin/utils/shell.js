const shell = require("ringo/shell");

exports.prompt = (message, keys, defaultKey) => {
    const possible = keys
        .map(key => key[(key === defaultKey) ? "toUpperCase" : "toLowerCase"]())
        .join("/");
    let value;
    do {
        value = shell.readln(message + " (" + possible + ") ").toLowerCase() ||
            defaultKey;
    } while (keys.indexOf(value.toLowerCase()) < 0);
    return value.toLowerCase();
};

exports.continue = (defaultKey) => {
    return exports.prompt("\nDo you want to continue?", ["y", "n"], defaultKey) === "y";
};

exports.readln = (message) => {
    let value;
    do {
        value = shell.readln(message);
    } while (!value);
    return value;
};
