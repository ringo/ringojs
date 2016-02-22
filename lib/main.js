var HttpServerBuilder = require("./builder");

exports.build = function(options) {
    return new HttpServerBuilder(options);
};

exports.HttpServer = require("./httpserver");