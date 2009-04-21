// a simple web app/module
include('helma/webapp/response');

export('index');

function index(req, res) {
    var context = {
        title: 'Module Demo',
        href: req.path
    };
    return new SkinnedResponse('skins/modules.html', context);
}
