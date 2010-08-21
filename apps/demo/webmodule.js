// a simple web app/module
var {Response} = require('ringo/webapp/response');

exports.index = function (req) {
    var context = {
        title: 'Modules',
        path: req.scriptName + req.pathInfo
    };
    return Response.skin('./skins/modules.txt', context);
};
