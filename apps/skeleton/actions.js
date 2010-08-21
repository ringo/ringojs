var {Response} = require('ringo/webapp/response');

exports.index = function (req) {
    return Response.skin(module.directory + 'skins/index.html', {
        content: "It's working!"
    });
};
