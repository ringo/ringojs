include('ringo/webapp/response');


exports.index = function index(req) {
    return skinResponse('skins/index.html', {
        content: "It's working!"
    });
}

