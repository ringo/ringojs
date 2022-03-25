const {Application} = require("stick");

const controller = require("./controller");

const app = exports.app = new Application();
app.configure("etag", "static", "error", "notfound", "route");

app.static(module.resolve("../public/"), null, "/public", {
    "servePrecompressed": true,
    "dotfiles": "ignore",
    "maxAge": 31536000,
    "lastModified": true
});

app.get("/", (request) => controller.getIndex(app, request));
