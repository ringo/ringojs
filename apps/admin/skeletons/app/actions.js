var {htmlResponse} = require('ringo/jsgi/response');

exports.index = function (req) {
    response = getResource("./templates/index.html");
    return htmlResponse(response.content);
};
