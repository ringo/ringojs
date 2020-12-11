const response = require("ringo/jsgi/response");

module.exports = (req) => {
    return response.html("Hello World!");
};
