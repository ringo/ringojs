// a simple web app/module
include('helma/webapp/response');

export('index');

function index(req) {
    var context = {
        title: 'Modules',
        path: req.scriptName + req.pathInfo
    };
    return new SkinnedResponse('skins/modules.txt', context);
}
