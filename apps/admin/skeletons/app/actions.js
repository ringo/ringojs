var response = require('ringo/jsgi/response');

exports.index = function (req) {
    var resource = getResource("./templates/index.html");
    return response.html(resource.content);
};
