var HttpServer = require("./httpserver");

var HttpServerBuilder = module.exports = function HttpServerBuilder() {
    if (!(this instanceof HttpServerBuilder)) {
        return new HttpServerBuilder();
    }
    Object.defineProperties(this, {
        "server": {
            "value": new HttpServer()
        }
    });
    return this;
};

HttpServerBuilder.prototype.toString = function() {
    return "[HttpServerBuilder]";
};

HttpServerBuilder.prototype.configure = function(xmlPath) {
    this.server.configure(xmlPath);
    return this;
};

HttpServerBuilder.prototype.serveApplication = function(mountpoint, app, options) {
    this.server.serveApplication(mountpoint, app, options);
    return this;
};

HttpServerBuilder.prototype.serveStatic = function(mountpoint, directory, options) {
    this.server.serveStatic(mountpoint, directory, options);
    return this;
};

HttpServerBuilder.prototype.http = function(options) {
    this.server.createHttpListener(options);
    return this;
};

HttpServerBuilder.prototype.https = function(options) {
    this.server.createHttpsListener(options);
    return this;
};

HttpServerBuilder.prototype.enableSessions = function(options) {
    this.server.enableSessions(options);
    return this;
};

HttpServerBuilder.prototype.start = function() {
    this.server.start();
    return this;
};