const shell = require("ringo/shell");

exports.confirm = function(message, keys, defaultKey) {
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

exports.proceed = function(defaultKey) {
    return exports.confirm("\nDo you want to continue?", ["y", "n"], defaultKey) === "y";
};
