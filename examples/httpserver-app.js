var response = require("ringo/jsgi/response");

module.exports = function(req) {
    return response.html("Hello World!");
};