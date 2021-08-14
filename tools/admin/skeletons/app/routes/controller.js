const templates = require("../templates");

exports.getIndex = (app, request) => {
    return templates.renderResponse("index.html");
};
