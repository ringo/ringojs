var HttpServerBuilder = require("./builder");

exports.build = function() {
    return new HttpServerBuilder();
};

exports.HttpServer = require("./httpserver");