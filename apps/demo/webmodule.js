// a simple web app/module
include('ringo/webapp/response');

export('index');

function index(req) {
    var context = {
        title: 'Modules',
        path: req.scriptName + req.pathInfo
    };
    return new SkinnedResponse('skins/modules.txt', context);
}
