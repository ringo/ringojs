var {htmlResponse} = require('ringo/jsgi/response');

exports.index = function (req) {
    var response = getResource("./templates/index.html");
    return htmlResponse(response.content);
};
