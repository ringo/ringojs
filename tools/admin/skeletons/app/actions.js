var response = require('ringo/jsgi/response');

exports.index = function (req) {
    // We don't use a real template parser in the skeleton.
    // Our recommended package for templating: reinhardt
    // See: https://github.com/orfon/reinhardt
    var rawTemplate = getResource("./templates/index.html").content;
    return response.html(rawTemplate);
};
